"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CarFront,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Clock3,
  House,
  MapPin,
  MapPinned,
  Navigation,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Siren,
  Trash2,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { SERVICE_CATEGORIES, SCHEDULED_SERVICE_IDS, serviceWorkerTitle } from "@/lib/config";
import type { DispatchStatus, StatusEvent } from "@/lib/dispatch";

const LocationMap = dynamic(() => import("@/components/LocationMap"), {
  ssr: false,
  loading: () => <div className="grid min-h-[220px] place-items-center rounded-2xl bg-[#edf2ec] text-sm font-semibold text-[#496655]">Loading map…</div>,
});

const ACCRA_MAP_CENTER = { lat: 5.6037, lng: -0.187 };
const OTHER_SERVICE_ID = "other";
const PROFILE_KEY = "siesie:customer-profile";
const VEHICLES_KEY = "siesie:customer-vehicles";
const LOCATIONS_KEY = "siesie:saved-locations";
const REQUEST_IDS_KEY = "siesie:customer-request-ids";
const ACTIVE_REQUEST_ID_KEY = "siesie:active-request-id";
const MAX_SAVED_REQUESTS = 25;

type Tab = "home" | "bookings" | "car" | "profile";
type BookingStep = 1 | 2 | 3 | 4;
type CustomerProfile = { name: string; phone: string };
type LocationSearchResult = { id: string; label: string; lat: number; lng: number };
type Vehicle = { id: string; name: string; registration: string };
type SavedLocation = { id: string; name: "Home" | "Work"; label: string; latitude: number; longitude: number };
type CustomerRequestStatus = {
  id: string;
  service_type: string;
  status: DispatchStatus;
  created_at: string;
  updated_at: string;
  status_history: StatusEvent[];
  support_contacts?: { name: string; phone: string }[];
  mechanic?: { name: string; phone: string } | null;
  arrival_code: string | null;
  is_scheduled?: boolean;
  scheduled_at?: string | null;
};

const SERVICE_GROUPS = [
  { title: "Mechanic & servicing", description: "Routine care and help understanding a fault.", ids: ["oil", "brakes", "diagnostics"] },
  { title: "Roadside assistance", description: "Tell us what happened and where you are.", ids: ["breakdown", "battery", "tyre"] },
  { title: "Car wash", description: "Request an at-home or workplace wash.", ids: ["car-wash"] },
] as const;

const SERVICE_DETAILS: Record<string, string> = {
  oil: "Oil and filter change request",
  brakes: "Brake inspection or service request",
  diagnostics: "Vehicle inspection and diagnostics request",
  breakdown: "Breakdown assistance request",
  battery: "Battery testing or replacement request",
  tyre: "Tyre change or repair request",
  "car-wash": "Car wash request",
};

const SYMPTOMS = [
  { id: "start", title: "My car won’t start", serviceId: "breakdown", prompt: "The car will not start. What I notice: " },
  { id: "warning", title: "A warning light is on", serviceId: "diagnostics", prompt: "A dashboard warning light is on. The symbol or colour is: " },
  { id: "sound", title: "I hear a new sound or feel a vibration", serviceId: "diagnostics", prompt: "I hear a new sound or feel a vibration. It happens when: " },
  { id: "heat", title: "The car is overheating or there is smoke", serviceId: "breakdown", prompt: "The car seems to be overheating or there is smoke. What I can see: " },
  { id: "flat", title: "I have a flat tyre", serviceId: "tyre", prompt: "I have a flat tyre. The vehicle is currently: " },
  { id: "other", title: "Something else feels wrong", serviceId: "diagnostics", prompt: "Something does not feel right. What I notice: " },
] as const;

const CAR_WASH_OPTIONS = [
  { id: "Exterior wash", title: "Exterior wash", detail: "Wash and dry the outside of your car." },
  { id: "Interior clean", title: "Interior clean", detail: "Vacuum and tidy the cabin." },
  { id: "Full wash", title: "Full wash", detail: "Exterior wash and interior clean." },
  { id: "Detailing", title: "Detailing", detail: "A more thorough clean; details confirmed by the dispatcher." },
] as const;

const SERVICE_FORM_COPY: Record<string, { title: string; description: string; label: string; placeholder: string; hint: string }> = {
  breakdown: { title: "Breakdown details", description: "Tell us what happened so the dispatcher can arrange roadside help.", label: "What happened?", placeholder: "For example: the car will not start, or it stopped while I was driving.", hint: "Mention warning lights, sounds, and whether the car can move safely." },
  battery: { title: "Battery service details", description: "Tell us what battery help you need.", label: "What is happening with the battery?", placeholder: "For example: the car will not start, the battery warning is on, or I need a replacement.", hint: "If you know the battery age or vehicle model, include it here." },
  tyre: { title: "Tyre service details", description: "Tell us what is wrong with the tyre and where the vehicle is safely parked.", label: "What tyre help do you need?", placeholder: "For example: a flat tyre, a puncture, or help changing to the spare.", hint: "You can add a photo of the tyre if it is safe to do so." },
  oil: { title: "Oil change details", description: "Share what your car needs so the dispatcher can confirm the right oil and timing.", label: "Anything we should know about the oil change?", placeholder: "For example: your car model, oil grade if known, or when the oil was last changed.", hint: "You can still book if you do not know the oil grade." },
  brakes: { title: "Brake service details", description: "Tell us whether you need an inspection or have noticed a change while braking.", label: "What do you notice with the brakes?", placeholder: "For example: squealing, vibration, a soft pedal, or a routine brake inspection.", hint: "If the brakes feel unsafe, avoid driving and say so here." },
  diagnostics: { title: "Inspection details", description: "Tell us what you would like the mechanic to inspect.", label: "What would you like checked?", placeholder: "For example: a dashboard warning light, a new sound, or a general vehicle check.", hint: "This helps describe the request; it is not a remote diagnosis." },
  other: { title: "Service details", description: "Describe the car care service you need and the dispatcher will review it.", label: "What service do you need?", placeholder: "Tell us what you need help with.", hint: "A short description helps us route your request." },
};

const BASE_STATUS_COPY: Record<DispatchStatus, { title: string; detail: string }> = {
  new: { title: "Request received", detail: "A Siesie dispatcher will review your request and call to confirm the details." },
  reviewed: { title: "Request reviewed", detail: "The dispatcher has reviewed your request and is arranging the next step." },
  callback_confirmed: { title: "Details confirmed", detail: "The dispatcher has confirmed your details and is arranging the visit." },
  assigned: { title: "Mechanic assigned", detail: "The dispatcher has assigned a mechanic and will keep you updated." },
  arrived: { title: "Mechanic has arrived", detail: "Ask your mechanic for the arrival code and share it before work begins." },
  in_progress: { title: "Service in progress", detail: "Your mechanic has started work on your vehicle." },
  completed: { title: "Service completed", detail: "This request has been marked complete." },
  cancelled: { title: "Request cancelled", detail: "This request was cancelled. Contact the dispatcher if you still need help." },
  no_show: { title: "Visit not completed", detail: "Please contact the dispatcher to arrange the next step." },
};

function statusCopyFor(status: DispatchStatus, serviceType: string) {
  const title = serviceWorkerTitle(serviceType);
  if (status === "assigned") return { title: `${title} assigned`, detail: `The dispatcher has assigned a ${title.toLowerCase()} and will keep you updated.` };
  if (status === "arrived") return { title: `${title} has arrived`, detail: `Ask your ${title.toLowerCase()} for the arrival code and share it before work begins.` };
  if (status === "in_progress") return { title: "Service in progress", detail: `Your ${title.toLowerCase()} has started work on your vehicle.` };
  return BASE_STATUS_COPY[status];
}

function safeReadArray<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown;
    return Array.isArray(value) ? value as T[] : [];
  } catch {
    return [];
  }
}

function readRequestIds() {
  if (typeof window === "undefined") return [];
  try {
    const activeId = window.localStorage.getItem(ACTIVE_REQUEST_ID_KEY) ?? "";
    const storedIds = safeReadArray<unknown>(REQUEST_IDS_KEY).filter((id): id is string => typeof id === "string" && id.length > 0);
    return [...new Set([activeId, ...storedIds].filter(Boolean))].slice(0, MAX_SAVED_REQUESTS);
  } catch {
    return [];
  }
}

function saveRequestIds(ids: string[]) {
  const uniqueIds = [...new Set(ids.filter(Boolean))].slice(0, MAX_SAVED_REQUESTS);
  try {
    window.localStorage.setItem(REQUEST_IDS_KEY, JSON.stringify(uniqueIds));
  } catch {
    // Keep the current session usable when browser storage is unavailable or full.
  }
  return uniqueIds;
}

function readRememberedName() {
  if (typeof window === "undefined" || window.localStorage.getItem("siesie:remember-name") !== "true") return "";
  try { return window.localStorage.getItem("siesie:customer-name") ?? ""; } catch { return ""; }
}

function readSavedProfile(): CustomerProfile {
  if (typeof window !== "undefined") {
    try {
      const saved = JSON.parse(window.localStorage.getItem(PROFILE_KEY) ?? "null") as Partial<CustomerProfile> | null;
      if (saved && typeof saved.name === "string" && typeof saved.phone === "string") return { name: saved.name, phone: saved.phone };
    } catch {
      // Use the remembered name as a fallback if the saved profile is malformed.
    }
  }
  return { name: readRememberedName(), phone: "" };
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-GH", { dateStyle: "medium", timeStyle: "short" });
}

export default function ManualDispatchCustomer() {
  const [tab, setTab] = useState<Tab>("home");
  const [bookingOpen, setBookingOpen] = useState(false);
  const [step, setStep] = useState<BookingStep>(1);
  const [requestId, setRequestId] = useState("");
  const [request, setRequest] = useState<CustomerRequestStatus | null>(null);
  const [bookingIds, setBookingIds] = useState<string[]>([]);
  const [bookingRequests, setBookingRequests] = useState<CustomerRequestStatus[]>([]);
  const [bookingHistoryLoading, setBookingHistoryLoading] = useState(false);
  const [bookingHistoryOffline, setBookingHistoryOffline] = useState(false);
  const [connectionState, setConnectionState] = useState<"idle" | "online" | "offline">("idle");
  const [statusToast, setStatusToast] = useState<{ title: string; detail: string } | null>(null);
  const lastStatus = useRef<DispatchStatus | null>(null);
  const [profile, setProfile] = useState<CustomerProfile>({ name: "", phone: "" });
  const [rememberName, setRememberName] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleName, setVehicleName] = useState("");
  const [vehicleRegistration, setVehicleRegistration] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [saveLocationAs, setSaveLocationAs] = useState<"" | "Home" | "Work">("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [problem, setProblem] = useState("");
  const [notes, setNotes] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [washPackage, setWashPackage] = useState("");
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoError, setPhotoError] = useState("");
  const [explainOpen, setExplainOpen] = useState(false);
  const [explainSelection, setExplainSelection] = useState<(typeof SYMPTOMS)[number] | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationSource, setLocationSource] = useState<"gps" | "manual_pin">("gps");
  const [locationLabel, setLocationLabel] = useState("");
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [locationState, setLocationState] = useState<"idle" | "requesting" | "shared" | "unavailable">("idle");
  const [locationSearchQuery, setLocationSearchQuery] = useState("");
  const [locationSearchResults, setLocationSearchResults] = useState<LocationSearchResult[]>([]);
  const [locationSearchState, setLocationSearchState] = useState<"idle" | "loading" | "empty" | "error">("idle");
  const [locationSearchMessage, setLocationSearchMessage] = useState("");
  const locationSearchAbort = useRef<AbortController | null>(null);
  const [formState, setFormState] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const whatsAppNumber = process.env.NEXT_PUBLIC_SIESIE_WHATSAPP_NUMBER ?? "";
  const selectedServiceId = selectedServices[0] ?? "";
  const selectedService = SERVICE_CATEGORIES.find((service) => service.id === selectedServiceId);
  const serviceForm = SERVICE_FORM_COPY[selectedServiceId] ?? SERVICE_FORM_COPY.other;
  const hasPreferredTimeOption = selectedServices.some((id) => SCHEDULED_SERVICE_IDS.has(id));
  const isCarWashBooking = selectedServiceId === "car-wash";
  const supportsSymptomHelp = ["breakdown", "battery", "tyre", "brakes", "diagnostics"].includes(selectedServiceId);
  const selectedWashOption = CAR_WASH_OPTIONS.find((option) => option.id === washPackage);
  const minimumAppointmentTime = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  const progressStepTitles = ["Choose service", serviceForm.title, "Set location", "Review request"];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedRequestIds = readRequestIds();
      setBookingIds(savedRequestIds);
      setBookingHistoryLoading(savedRequestIds.length > 0);
      setRequestId(savedRequestIds[0] ?? "");
      const savedProfile = readSavedProfile();
      setProfile(savedProfile);
      setCustomerName(readRememberedName() || savedProfile.name);
      setCustomerPhone(savedProfile.phone);
      setRememberName(window.localStorage.getItem("siesie:remember-name") === "true");
      setVehicles(safeReadArray<Vehicle>(VEHICLES_KEY));
      setSavedLocations(safeReadArray<SavedLocation>(LOCATIONS_KEY));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (bookingIds.length === 0) return;
    let active = true;
    async function refreshBookingHistory() {
      const results = await Promise.all(bookingIds.map(async (id) => {
        try {
          const response = await fetch(`/api/requests?id=${encodeURIComponent(id)}`, { cache: "no-store" });
          if (response.status === 404) return { id, missing: true as const };
          if (!response.ok) throw new Error("Booking unavailable");
          return { id, request: await response.json() as CustomerRequestStatus };
        } catch {
          return { id, unavailable: true as const };
        }
      }));
      if (!active) return;

      const missingIds = new Set(results.filter((result) => "missing" in result).map((result) => result.id));
      if (missingIds.size > 0) {
        const retainedIds = bookingIds.filter((id) => !missingIds.has(id));
        setBookingIds(retainedIds);
        saveRequestIds(retainedIds);
      }
      setBookingRequests((current) => {
        const byId = new Map(current.map((savedRequest) => [savedRequest.id, savedRequest]));
        for (const result of results) {
          if ("request" in result && result.request) byId.set(result.id, result.request);
          if ("missing" in result) byId.delete(result.id);
        }
        return bookingIds.filter((id) => !missingIds.has(id)).flatMap((id) => {
          const savedRequest = byId.get(id);
          return savedRequest ? [savedRequest] : [];
        });
      });
      setBookingHistoryOffline(results.some((result) => "unavailable" in result));
      setBookingHistoryLoading(false);
    }

    void refreshBookingHistory();
    const timer = window.setInterval(() => void refreshBookingHistory(), 45_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [bookingIds]);

  useEffect(() => {
    if (!requestId) return;
    let active = true;
    async function loadStatus() {
      try {
        const response = await fetch(`/api/requests?id=${encodeURIComponent(requestId)}`, { cache: "no-store" });
        if (response.status === 404) {
          window.localStorage.removeItem(ACTIVE_REQUEST_ID_KEY);
          if (active) { setRequestId(""); setRequest(null); }
          return;
        }
        if (!response.ok) throw new Error("Request status unavailable");
        const nextRequest = await response.json() as CustomerRequestStatus;
        if (!active) return;
        if (lastStatus.current !== null && lastStatus.current !== nextRequest.status) {
          setStatusToast(statusCopyFor(nextRequest.status, nextRequest.service_type));
        }
        lastStatus.current = nextRequest.status;
        setRequest(nextRequest);
        setConnectionState("online");
      } catch {
        if (active) setConnectionState("offline");
      }
    }
    void loadStatus();
    const timer = window.setInterval(() => void loadStatus(), 12_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [requestId]);

  function toggleService(id: string) {
    setSelectedServices((current) => current[0] === id ? [] : [id]);
    setProblem("");
    setNotes("");
    setPreferredTime("");
    setWashPackage("");
    setSelectedPhotos([]);
    setPhotoError("");
    setFormState(null);
  }

  function beginBooking(serviceId?: string) {
    clearBooking();
    setBookingOpen(true);
    setStep(1);
    setTab("home");
    setFormState(null);
    setSelectedServices(serviceId ? [serviceId] : []);
  }

  function clearBooking() {
    setBookingOpen(false);
    setStep(1);
    setSelectedServices([]);
    setProblem("");
    setNotes("");
    setPreferredTime("");
    setWashPackage("");
    setSelectedPhotos([]);
    setPhotoError("");
    setSelectedVehicleId("");
    setLatitude(null);
    setLongitude(null);
    setLocationSource("gps");
    setLocationLabel("");
    setShowMapPicker(false);
    setLocationState("idle");
    setSaveLocationAs("");
    setLocationSearchQuery("");
    setLocationSearchResults([]);
    setLocationSearchState("idle");
    setLocationSearchMessage("");
    locationSearchAbort.current?.abort();
    locationSearchAbort.current = null;
    setFormState(null);
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationState("unavailable");
      setShowMapPicker(true);
      return;
    }
    setLocationState("requesting");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLatitude(coords.latitude);
        setLongitude(coords.longitude);
        setLocationSource("gps");
        setLocationState("shared");
        setLocationLabel("");
      },
      () => {
        setLocationState("unavailable");
        setShowMapPicker(true);
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
    );
  }

  async function searchForLocation() {
    if (locationSearchState === "loading") return;
    const query = locationSearchQuery.trim();
    if (query.length < 3) {
      setLocationSearchResults([]);
      setLocationSearchMessage("Enter at least 3 characters to search.");
      setLocationSearchState("error");
      return;
    }
    locationSearchAbort.current?.abort();
    const controller = new AbortController();
    locationSearchAbort.current = controller;
    setLocationSearchState("loading");
    setLocationSearchResults([]);
    setLocationSearchMessage("");
    try {
      const response = await fetch(`/api/location-search?q=${encodeURIComponent(query)}`, { cache: "no-store", signal: controller.signal });
      const result = await response.json() as { places?: LocationSearchResult[]; error?: string };
      if (!response.ok) throw new Error(result.error || "Place search is unavailable. Try moving the pin on the map.");
      const places = Array.isArray(result.places) ? result.places : [];
      setLocationSearchResults(places);
      setLocationSearchState(places.length ? "idle" : "empty");
      setLocationSearchMessage(places.length ? "" : "No matching places found in Ghana. Try a nearby area or landmark.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setLocationSearchResults([]);
      setLocationSearchMessage(error instanceof Error ? error.message : "Place search is unavailable. Try moving the pin on the map.");
      setLocationSearchState("error");
    } finally {
      if (locationSearchAbort.current === controller) locationSearchAbort.current = null;
    }
  }

  function chooseSearchResult(place: LocationSearchResult) {
    locationSearchAbort.current?.abort();
    locationSearchAbort.current = null;
    setLocationSearchResults([]);
    setLocationSearchState("idle");
    setLocationSearchMessage("");
    setLatitude(place.lat);
    setLongitude(place.lng);
    setLocationSource("manual_pin");
    setLocationState("shared");
    setLocationLabel(place.label.slice(0, 300));
  }

  function chooseSavedLocation(location: SavedLocation) {
    setLatitude(location.latitude);
    setLongitude(location.longitude);
    setLocationSource("manual_pin");
    setLocationState("shared");
    setLocationLabel(location.label);
    setSaveLocationAs("");
  }

  function handlePhotoSelection(files: FileList | null) {
    const next = Array.from(files ?? []);
    if (next.length > 3) {
      setPhotoError("Choose up to 3 photos.");
      setSelectedPhotos([]);
      return;
    }
    if (next.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      setPhotoError("Photos must be JPEG, PNG, or WebP and no larger than 5 MB each.");
      setSelectedPhotos([]);
      return;
    }
    setPhotoError("");
    setSelectedPhotos(next);
  }

  function continueToNextStep() {
    setFormState(null);
    if (step === 1 && selectedServices.length === 0) {
      setFormState({ type: "error", message: "Choose a service to continue. If you are unsure, use “Explain my car problem”." });
      return;
    }
    if (step === 2 && selectedServices.includes(OTHER_SERVICE_ID) && !problem.trim()) {
      setFormState({ type: "error", message: "Briefly describe the service you need so the dispatcher can review it." });
      return;
    }
    if (step === 2 && isCarWashBooking && !washPackage) {
      setFormState({ type: "error", message: "Choose the type of car wash you would like." });
      return;
    }
    if (step === 2 && isCarWashBooking && !preferredTime) {
      setFormState({ type: "error", message: "Choose a date and time for your car wash." });
      return;
    }
    if (step === 2 && preferredTime) {
      const appointmentTimestamp = new Date(preferredTime).getTime();
      if (!hasPreferredTimeOption || !Number.isFinite(appointmentTimestamp) || appointmentTimestamp <= Date.now()) {
        setFormState({ type: "error", message: "Choose a future date and time, or clear the preferred time." });
        return;
      }
    }
    if (step === 3 && (latitude === null || longitude === null)) {
      setFormState({ type: "error", message: "Share your location or choose a point on the map before continuing." });
      setLocationState("unavailable");
      setShowMapPicker(true);
      return;
    }
    if (step < 4) setStep((step + 1) as BookingStep);
  }

  function applySymptom() {
    if (!explainSelection) return;
    setSelectedServices((current) => current.includes(explainSelection.serviceId) ? current : [...current, explainSelection.serviceId]);
    setProblem(explainSelection.prompt);
    setExplainOpen(false);
    setStep(2);
    setFormState(null);
  }

  function saveNewVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = vehicleName.trim();
    if (!name) return;
    const next = [{ id: window.crypto.randomUUID(), name, registration: vehicleRegistration.trim() }, ...vehicles];
    setVehicles(next);
    window.localStorage.setItem(VEHICLES_KEY, JSON.stringify(next));
    setVehicleName("");
    setVehicleRegistration("");
  }

  function removeVehicle(id: string) {
    const next = vehicles.filter((vehicle) => vehicle.id !== id);
    setVehicles(next);
    window.localStorage.setItem(VEHICLES_KEY, JSON.stringify(next));
    if (selectedVehicleId === id) setSelectedVehicleId("");
  }

  function removeLocation(id: string) {
    const next = savedLocations.filter((location) => location.id !== id);
    setSavedLocations(next);
    window.localStorage.setItem(LOCATIONS_KEY, JSON.stringify(next));
  }

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step !== 4) return;
    const trimmedName = customerName.trim();
    const trimmedPhone = customerPhone.trim();
    if (!trimmedName || trimmedName.length > 120) {
      setFormState({ type: "error", message: "Enter your name (up to 120 characters)." });
      return;
    }
    if (!/^\+?[\d\s().\[\]-]{6,24}$/.test(trimmedPhone)) {
      setFormState({ type: "error", message: "Enter a valid Ghana phone number, for example 024 000 0000." });
      return;
    }
    if (latitude === null || longitude === null) {
      setFormState({ type: "error", message: "Add a confirmed location before submitting your request." });
      setStep(3);
      return;
    }
    if (photoError) {
      setFormState({ type: "error", message: photoError });
      setStep(2);
      return;
    }

    setSubmitting(true);
    setFormState(null);
    const data = new FormData();
    const selectedLabels = selectedServices.flatMap((id) => {
      if (id === OTHER_SERVICE_ID) return [];
      const service = SERVICE_CATEGORIES.find((item) => item.id === id);
      return service ? [service.label] : [];
    });
    const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedVehicleId);
    const requestNotes = [
      notes.trim(),
      selectedVehicle ? `Vehicle: ${selectedVehicle.name}${selectedVehicle.registration ? ` · Registration: ${selectedVehicle.registration}` : ""}` : "",
      selectedServices.includes(OTHER_SERVICE_ID) ? "Customer selected: Other service / not listed." : "",
    ].filter(Boolean).join("\n\n");

    data.set("website", "");
    data.set("customer_name", trimmedName);
    data.set("customer_phone", trimmedPhone);
    data.set("issue_description", isCarWashBooking && selectedWashOption ? `Car wash package: ${selectedWashOption.title}` : problem.trim());
    data.set("notes", requestNotes.slice(0, 2000));
    data.set("location_label", locationLabel.trim() || (locationSource === "manual_pin" ? "Map pin selected" : "GPS location shared"));
    data.set("location_source", locationSource);
    data.set("latitude", String(latitude));
    data.set("longitude", String(longitude));
    if (isCarWashBooking) data.set("wash_package", washPackage);
    if (preferredTime && selectedServices.some((id) => SCHEDULED_SERVICE_IDS.has(id))) {
      const time = new Date(preferredTime);
      if (!Number.isFinite(time.getTime()) || time.getTime() <= Date.now()) {
        setSubmitting(false);
        setFormState({ type: "error", message: "Choose a future date and time, or clear the preferred time." });
        return;
      }
      data.set("scheduled_at", time.toISOString());
    }
    selectedLabels.forEach((service) => data.append("services", service));
    selectedPhotos.forEach((photo) => data.append("photos", photo));

    try {
      const response = await fetch("/api/requests", { method: "POST", body: data });
      const result = await response.json() as { id?: string; message?: string; error?: string };
      if (!response.ok || !result.id) throw new Error(result.error || "We couldn’t submit your request. Please try again.");
      const nextProfile = { name: trimmedName, phone: trimmedPhone };
      window.localStorage.setItem(ACTIVE_REQUEST_ID_KEY, result.id);
      const nextBookingIds = saveRequestIds([result.id, ...readRequestIds()]);
      setBookingIds(nextBookingIds);
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...nextProfile, name: rememberName ? trimmedName : "" }));
      if (rememberName) {
        window.localStorage.setItem("siesie:remember-name", "true");
        window.localStorage.setItem("siesie:customer-name", trimmedName);
      } else {
        window.localStorage.removeItem("siesie:remember-name");
        window.localStorage.removeItem("siesie:customer-name");
      }
      if (saveLocationAs && latitude !== null && longitude !== null) {
        const nextSaved = [{ id: window.crypto.randomUUID(), name: saveLocationAs, label: locationLabel.trim() || `${saveLocationAs} location`, latitude, longitude }, ...savedLocations.filter((location) => location.name !== saveLocationAs)];
        setSavedLocations(nextSaved);
        window.localStorage.setItem(LOCATIONS_KEY, JSON.stringify(nextSaved));
      }
      setProfile(nextProfile);
      setRequestId(result.id);
      lastStatus.current = "new";
      setRequest(null);
      setConnectionState("idle");
      setStatusToast(null);
      setFormState({ type: "success", message: result.message || "Request received. A dispatcher will call to confirm the next step." });
      setBookingOpen(false);
      setTab("bookings");
      setStep(1);
      setSelectedServices([]);
      setProblem("");
      setNotes("");
      setPreferredTime("");
      setSelectedPhotos([]);
      setSelectedVehicleId("");
      setCustomerName(rememberName ? trimmedName : "");
      setCustomerPhone("");
      setLatitude(null);
      setLongitude(null);
      setLocationLabel("");
      setLocationState("idle");
      setShowMapPicker(false);
      setSaveLocationAs("");
    } catch (error) {
      setFormState({ type: "error", message: error instanceof Error ? error.message : "We couldn’t submit your request." });
    } finally {
      setSubmitting(false);
    }
  }

  function openMyCar() {
    setBookingOpen(false);
    setTab("car");
  }

  const selectedServiceLabels = selectedServices.map((id) => id === OTHER_SERVICE_ID ? "Other service" : SERVICE_CATEGORIES.find((service) => service.id === id)?.label).filter(Boolean);
  const encodedMessage = encodeURIComponent(`Hi Siesie, I need help with my car. My request reference is ${requestId || "not submitted yet"}.`);
  const whatsappHref = whatsAppNumber ? `https://wa.me/${whatsAppNumber.replace(/\D/g, "")}?text=${encodedMessage}` : null;

  return (
    <main className="min-h-screen bg-[#f5f7f3] pb-[calc(78px+env(safe-area-inset-bottom))] text-[#18231e] lg:pb-10">
      {statusToast && <div role="status" className="fixed inset-x-4 top-4 z-[70] mx-auto flex max-w-lg items-start gap-3 rounded-2xl border border-[#d2e2d4] bg-white p-4 shadow-xl"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#237148]" /><div className="min-w-0 flex-1"><p className="font-bold">{statusToast.title}</p><p className="mt-1 text-sm leading-5 text-[#64716a]">{statusToast.detail}</p></div><button type="button" onClick={() => setStatusToast(null)} aria-label="Dismiss notification" className="grid h-8 w-8 place-items-center rounded-lg text-[#526159] hover:bg-[#f1f4ef]"><X className="h-4 w-4" /></button></div>}

      <header className="sticky top-0 z-50 border-b border-[#e3e8e1] bg-[#fafbf8]/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-[1320px] items-center justify-between gap-5 px-4 sm:px-7 lg:px-10">
          <Link href="/" aria-label="Back to Siesie home" className="shrink-0"><BrandLogo compact /></Link>
          <nav aria-label="Customer navigation" className="hidden items-center gap-1 lg:flex">
            <NavButton active={tab === "home" && !bookingOpen} onClick={() => { setBookingOpen(false); setTab("home"); }} icon={House}>Home</NavButton>
            <NavButton active={tab === "bookings"} onClick={() => { setBookingOpen(false); setTab("bookings"); }} icon={ClipboardList}>Bookings</NavButton>
            <NavButton active={tab === "car"} onClick={openMyCar} icon={CarFront}>My car</NavButton>
            <NavButton active={tab === "profile"} onClick={() => { setBookingOpen(false); setTab("profile"); }} icon={UserRound}>Profile</NavButton>
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full bg-[#edf3eb] px-3 py-2 text-xs font-semibold text-[#42614d] sm:inline-flex"><span className="h-2 w-2 rounded-full bg-[#5d9a68]" />Accra launch</span>
            <button type="button" onClick={() => beginBooking()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#164b35] px-4 text-sm font-bold text-white transition hover:bg-[#103e2c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#164b35]"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Book a service</span><span className="sm:hidden">Book</span></button>
          </div>
        </div>
      </header>

      {connectionState === "offline" && requestId && <div role="status" className="mx-auto mt-4 flex max-w-[1240px] items-center gap-2 px-4 text-sm text-[#7c5e37] sm:px-7 lg:px-10"><span className="h-2 w-2 rounded-full bg-[#c38a3b]" />We couldn’t refresh your booking. Showing the last saved update.</div>}

      <div className="mx-auto max-w-[1320px] px-4 pb-10 pt-5 sm:px-7 lg:px-10 lg:pt-8">
        {bookingOpen ? (
          <section className="mx-auto max-w-[920px]">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <button type="button" onClick={clearBooking} className="mb-4 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#526159] hover:text-[#164b35]"><ArrowLeft className="h-4 w-4" />Back to home</button>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#64776b]">New request</p>
                <h1 className="mt-1 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Let’s arrange your car care.</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64716a]">A dispatcher reviews every request and confirms availability, timing and price with you before work begins.</p>
              </div>
              <div className="hidden rounded-2xl border border-[#e4e8e1] bg-white px-4 py-3 text-right sm:block"><p className="text-xs font-semibold text-[#768078]">Step {step} of 4</p><p className="mt-1 font-bold text-[#164b35]">{progressStepTitles[step - 1]}</p></div>
            </div>
            <ol aria-label="Booking progress" className="mb-5 grid grid-cols-4 gap-2">
              {["Service", selectedService?.shortLabel ?? "Details", "Location", "Review"].map((label, index) => <li key={label} className="min-w-0"><div className={`h-1.5 rounded-full ${step > index ? "bg-[#2e7751]" : "bg-[#dfe5dc]"}`} /><p className={`mt-2 truncate text-[11px] font-semibold sm:text-xs ${step === index + 1 ? "text-[#164b35]" : "text-[#849087]"}`}>{label}</p></li>)}
            </ol>

            <form onSubmit={submitRequest} className="overflow-hidden rounded-[24px] border border-[#e2e8e0] bg-white shadow-[0_12px_36px_rgba(30,60,42,0.06)]">
              {step === 1 && <div className="p-5 sm:p-8">
                <div className="mb-6"><h2 className="text-xl font-bold tracking-tight">What can we help with?</h2><p className="mt-1 text-sm text-[#6c776f]">Choose one service for this request. You can book another service separately.</p></div>
                <div className="space-y-7">
                  {SERVICE_GROUPS.map((group) => <section key={group.title}>
                    <div className="mb-3"><h3 className="font-bold">{group.title}</h3><p className="mt-0.5 text-xs text-[#778179]">{group.description}</p></div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {group.ids.map((id) => {
                        const service = SERVICE_CATEGORIES.find((item) => item.id === id);
                        if (!service) return null;
                        const selected = selectedServices.includes(service.id);
                        return <button key={service.id} type="button" aria-pressed={selected} onClick={() => toggleService(service.id)} className={`flex min-h-[78px] items-center gap-3 rounded-2xl border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2e7751] ${selected ? "border-[#55956d] bg-[#f0f6ed]" : "border-[#e5eae3] bg-white hover:border-[#b5c9b5] hover:bg-[#fbfcfa]"}`}>
                          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#edf3e9]"><Image src={service.logo} alt="" width={34} height={34} className="h-8 w-8 object-contain" /></span>
                          <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-[#24342a]">{service.shortLabel}</span><span className="mt-1 block text-xs leading-4 text-[#778179]">{SERVICE_DETAILS[service.id]}</span></span>
                          <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${selected ? "border-[#2e7751] bg-[#2e7751] text-white" : "border-[#cbd4ca] text-transparent"}`}><Check className="h-3 w-3" /></span>
                        </button>;
                      })}
                    </div>
                  </section>)}
                  <section>
                    <h3 className="font-bold">Another car care request</h3><p className="mt-0.5 text-xs text-[#778179]">Tell us what you need and the dispatcher will review it.</p>
                    <button type="button" aria-pressed={selectedServices.includes(OTHER_SERVICE_ID)} onClick={() => toggleService(OTHER_SERVICE_ID)} className={`mt-3 flex min-h-[62px] w-full items-center gap-3 rounded-2xl border px-4 text-left text-sm font-semibold ${selectedServices.includes(OTHER_SERVICE_ID) ? "border-[#55956d] bg-[#f0f6ed] text-[#164b35]" : "border-[#e5eae3] hover:bg-[#fbfcfa]"}`}><Wrench className="h-5 w-5 text-[#4c7258]" />Something else / custom request<ChevronRight className="ml-auto h-4 w-4 text-[#8a958d]" /></button>
                  </section>
                  <section className="rounded-2xl border border-dashed border-[#d8dfd5] bg-[#fafbf9] p-4 sm:p-5"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#edf2ea] text-[#45644e]"><Wrench className="h-4 w-4" /></span><div className="min-w-0 flex-1"><h3 className="font-bold">Towing</h3><p className="mt-1 text-sm leading-5 text-[#69756c]">Towing is not available to book in this launch phase. We’ll make this option available when a towing response is in place.</p></div><span className="rounded-md bg-[#ecefe9] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#667268]">Unavailable</span></div></section>
                </div>
              </div>}

              {step === 2 && <div className="p-5 sm:p-8">
                <div className="mb-6"><h2 className="text-xl font-bold tracking-tight">{serviceForm.title}</h2><p className="mt-1 text-sm text-[#6c776f]">{serviceForm.description}</p></div>
                {isCarWashBooking ? <fieldset>
                  <legend className="text-sm font-bold">What would you like cleaned?</legend>
                  <div role="radiogroup" aria-label="Car wash type" className="mt-3 grid gap-2 sm:grid-cols-2">
                    {CAR_WASH_OPTIONS.map((option) => <button key={option.id} type="button" role="radio" aria-checked={washPackage === option.id} onClick={() => setWashPackage(option.id)} className={`min-h-[78px] rounded-xl border p-3 text-left transition ${washPackage === option.id ? "border-[#55956d] bg-[#f0f6ed]" : "border-[#e5eae3] hover:bg-[#fbfcfa]"}`}><span className="flex items-center justify-between gap-3"><span className="text-sm font-bold">{option.title}</span><span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${washPackage === option.id ? "border-[#2e7751] bg-[#2e7751] text-white" : "border-[#cbd4ca] text-transparent"}`}><Check className="h-3 w-3" /></span></span><span className="mt-1 block text-xs leading-5 text-[#778179]">{option.detail}</span></button>)}
                  </div>
                </fieldset> : <>
                  {supportsSymptomHelp && <div className="rounded-2xl bg-[#f4f7f1] p-4 sm:p-5"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#325d40]"><CircleHelp className="h-5 w-5" /></span><div className="flex-1"><h3 className="font-bold">Need help describing it?</h3><p className="mt-1 text-sm text-[#68746c]">Answer a few simple prompts. This helps describe the request; it is not a diagnosis.</p><button type="button" onClick={() => { setExplainOpen(true); setExplainSelection(null); }} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#cddacb] bg-white px-3 text-sm font-bold text-[#24533a] hover:bg-[#f9fbf8]">Explain my car problem<ArrowRight className="h-4 w-4" /></button></div></div></div>}
                  <label className="mt-5 block"><span className="mb-2 block text-sm font-bold">{serviceForm.label} {selectedServiceId === OTHER_SERVICE_ID && <span className="text-[#a04433">Required</span>}</span><textarea value={problem} onChange={(event) => setProblem(event.target.value)} rows={4} maxLength={3000} className="min-h-28 w-full rounded-xl border border-[#dce3da] bg-white px-3 py-3 text-sm leading-6 outline-none placeholder:text-[#929b94] focus:border-[#5e926a] focus:ring-4 focus:ring-[#5e926a]/10" placeholder={serviceForm.placeholder} /><span className="mt-1 block text-xs text-[#778179]">{serviceForm.hint}</span></label>
                </>}
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="block"><span className="mb-2 block text-sm font-bold">{isCarWashBooking ? "Vehicle for the wash" : "Vehicle"} <span className="font-normal text-[#78837b]">(optional)</span></span><select value={selectedVehicleId} onChange={(event) => setSelectedVehicleId(event.target.value)} className="min-h-12 w-full rounded-xl border border-[#dce3da] bg-white px-3 text-sm outline-none focus:border-[#5e926a] focus:ring-4 focus:ring-[#5e926a]/10"><option value="">Choose a saved vehicle</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.name}{vehicle.registration ? ` · ${vehicle.registration}` : ""}</option>)}</select><button type="button" onClick={openMyCar} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#24533a]">{vehicles.length ? "Manage vehicles" : "Add a vehicle"}<ArrowRight className="h-3.5 w-3.5" /></button></label>
                  {!isCarWashBooking && <label className="block"><span className="mb-2 block text-sm font-bold">Photos <span className="font-normal text-[#78837b]">(optional)</span></span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => handlePhotoSelection(event.target.files)} className="block min-h-12 w-full rounded-xl border border-[#dce3da] bg-white p-2 text-xs file:mr-2 file:min-h-8 file:rounded-lg file:border-0 file:bg-[#edf3e9] file:px-3 file:font-bold file:text-[#315d40]" /><span className="mt-1 block text-xs text-[#778179]">Up to 3 images, 5 MB each. JPG, PNG or WebP.</span>{photoError && <span role="alert" className="mt-1 block text-xs font-semibold text-[#a04433]">{photoError}</span>}{selectedPhotos.length > 0 && <span className="mt-1 block text-xs text-[#43654b]">{selectedPhotos.length} photo{selectedPhotos.length === 1 ? "" : "s"} selected.</span>}</label>}
                </div>
                <label className="mt-5 block"><span className="mb-2 block text-sm font-bold">{isCarWashBooking ? "Access or parking details" : "Anything else for the dispatcher?"} <span className="font-normal text-[#78837b]">(optional)</span></span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} maxLength={1800} className="w-full rounded-xl border border-[#dce3da] px-3 py-3 text-sm outline-none placeholder:text-[#929b94] focus:border-[#5e926a] focus:ring-4 focus:ring-[#5e926a]/10" placeholder={isCarWashBooking ? "For example: parking level, access instructions, or where the car will be." : "Access instructions or other helpful details"} /></label>
                {hasPreferredTimeOption && <label className="mt-5 block"><span className="mb-2 block text-sm font-bold">Preferred date and time {isCarWashBooking ? <span className="text-[#a04433">Required</span> : <span className="font-normal text-[#78837b]">(optional)</span>}</span><span className="flex min-h-12 items-center gap-3 rounded-xl border border-[#dce3da] px-3"><CalendarDays className="h-4 w-4 text-[#6f7c73]" /><input type="datetime-local" value={preferredTime} min={minimumAppointmentTime} onChange={(event) => setPreferredTime(event.target.value)} required={isCarWashBooking} className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none" /></span><span className="mt-1 block text-xs text-[#778179]">{isCarWashBooking ? "We’ll confirm the time with you before the wash is booked." : "This is a timing preference; the dispatcher will confirm availability."}</span></label>}
                {selectedServiceId === OTHER_SERVICE_ID && !problem.trim() && <p className="mt-4 rounded-xl bg-[#fff5ea] px-3 py-2.5 text-sm text-[#775a34]">Describe your request above so we can send it to the dispatcher.</p>}
              </div>}

              {step === 3 && <div className="p-5 sm:p-8">
                <div className="mb-6"><h2 className="text-xl font-bold tracking-tight">Where should we meet you?</h2><p className="mt-1 text-sm text-[#6c776f]">Choose a saved place, share your current location, or drop a pin. A landmark alone cannot confirm the location.</p></div>
                {savedLocations.length > 0 && <div className="mb-4 flex flex-wrap gap-2">{savedLocations.map((location) => <button key={location.id} type="button" onClick={() => chooseSavedLocation(location)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#dce5da] bg-[#f8faf7] px-3 text-sm font-semibold text-[#345b40] hover:bg-[#eef5ec]"><MapPin className="h-4 w-4" />{location.name}</button>)}</div>}
                <div className="grid gap-2 sm:grid-cols-2">
                  <button type="button" onClick={requestLocation} disabled={locationState === "requesting"} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#174b35] px-4 text-sm font-bold text-white hover:bg-[#103e2c] disabled:opacity-60"><Navigation className="h-4 w-4" />{locationState === "requesting" ? "Finding your location…" : "Use my current location"}</button>
                  <button type="button" aria-pressed={showMapPicker} onClick={() => setShowMapPicker((visible) => !visible)} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold ${showMapPicker ? "border-[#b9cdb7] bg-[#f2f7ef] text-[#24533a]" : "border-[#dce3da] bg-white text-[#34433a] hover:bg-[#fafbf9]"}`}><MapPinned className="h-4 w-4" />{showMapPicker ? "Hide map" : "Search or choose on map"}</button>
                </div>
                {locationState === "shared" && <p role="status" className="mt-3 flex items-center gap-2 rounded-lg bg-[#eef6eb] px-3 py-2.5 text-sm font-semibold text-[#315d40]"><CheckCircle2 className="h-4 w-4 shrink-0" />{locationSource === "manual_pin" ? "Map location selected. You can adjust it below." : "Your current location is ready to share with the dispatcher."}</p>}
                {locationState === "unavailable" && <p role="status" className="mt-3 rounded-lg bg-[#fff4eb] px-3 py-2.5 text-sm leading-5 text-[#805335]">We couldn’t access your GPS. Search for a place or choose the location on the map.</p>}
                {showMapPicker && <div className="mt-4 rounded-2xl border border-[#e0e5dc] bg-[#f7f8f5] p-3">
                  <label htmlFor="location-search" className="mb-1.5 block text-sm font-bold">Search for a place in Ghana</label>
                  <div className="flex gap-2"><input id="location-search" value={locationSearchQuery} onChange={(event) => setLocationSearchQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void searchForLocation(); } }} maxLength={120} autoComplete="off" placeholder="Street, neighbourhood or landmark" className="min-h-11 min-w-0 flex-1 rounded-xl border border-[#dce3da] bg-white px-3 text-sm outline-none focus:border-[#5e926a] focus:ring-4 focus:ring-[#5e926a]/10" /><button type="button" onClick={() => void searchForLocation()} disabled={locationSearchState === "loading"} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-[#174b35] px-3 text-sm font-bold text-white disabled:opacity-60"><Search className="h-4 w-4" />{locationSearchState === "loading" ? "Searching…" : "Search"}</button></div>
                  <p className="mt-1.5 text-xs leading-5 text-[#778179]">Search terms are sent to OpenStreetMap. Results © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="font-semibold underline">OpenStreetMap contributors</a> via Nominatim.</p>
                  {locationSearchState === "loading" && <p role="status" className="px-1 py-2 text-sm text-[#69756c]">Finding places…</p>}
                  {(locationSearchState === "empty" || locationSearchState === "error") && <p role={locationSearchState === "error" ? "alert" : "status"} className="px-1 py-2 text-sm text-[#69756c]">{locationSearchMessage}</p>}
                  {locationSearchResults.length > 0 && <ul aria-label="Place search results" className="my-2 max-h-48 overflow-y-auto rounded-xl border border-[#e0e5dc] bg-white">{locationSearchResults.map((place) => <li key={place.id}><button type="button" onClick={() => chooseSearchResult(place)} className="min-h-12 w-full border-b border-[#edf0eb] px-3 py-2 text-left text-sm leading-5 last:border-0 hover:bg-[#f2f7ef]">{place.label}</button></li>)}</ul>}
                  <LocationMap center={{ lat: latitude ?? ACCRA_MAP_CENTER.lat, lng: longitude ?? ACCRA_MAP_CENTER.lng }} onPinMove={(location) => { setLatitude(location.lat); setLongitude(location.lng); setLocationSource("manual_pin"); setLocationState("shared"); setLocationLabel((current) => current || "Map pin selected"); }} className="h-[260px] w-full" />
                  <p className="px-1 py-2 text-xs leading-5 text-[#778179]">The map starts in Accra. Search for your area first, then drag the pin or tap the map to refine it. The dispatcher will confirm the service area with you.</p>
                </div>}
                <label className="mt-5 block"><span className="mb-2 block text-sm font-bold">Address or meeting-point details <span className="font-normal text-[#78837b]">(optional)</span></span><span className="flex min-h-12 items-center gap-3 rounded-xl border border-[#dce3da] bg-white px-3 focus-within:border-[#5e926a] focus-within:ring-4 focus-within:ring-[#5e926a]/10"><MapPin className="h-4 w-4 shrink-0 text-[#6f7c73]" /><input value={locationLabel} onChange={(event) => setLocationLabel(event.target.value)} maxLength={300} className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-[#929b94]" placeholder="Area, building, gate or nearby landmark" /></span></label>
                {latitude !== null && longitude !== null && <fieldset className="mt-4"><legend className="text-xs font-bold text-[#58655c]">Save this place on this device</legend><div className="mt-2 flex gap-2">{(["Home", "Work"] as const).map((place) => <button key={place} type="button" aria-pressed={saveLocationAs === place} onClick={() => setSaveLocationAs((current) => current === place ? "" : place)} className={`min-h-10 rounded-lg border px-3 text-sm font-semibold ${saveLocationAs === place ? "border-[#60916c] bg-[#edf5e9] text-[#24533a]" : "border-[#dce3da] text-[#58655c]"}`}>{place}</button>)}</div><p className="mt-1.5 text-xs text-[#778179]">Saved addresses stay in this browser and are not synced to an account.</p></fieldset>}
                {whatsappHref && <a href={whatsappHref} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#315d40]"><MapPin className="h-4 w-4" />Need help sharing your location? Message Siesie</a>}
                <p className="mt-5 rounded-xl bg-[#f6f7f4] px-3 py-2.5 text-xs leading-5 text-[#6e7a71]">We are launching in Accra. The dispatcher confirms whether your exact location and requested service can be supported.</p>
              </div>}

              {step === 4 && <div className="p-5 sm:p-8">
                <div className="mb-6"><h2 className="text-xl font-bold tracking-tight">Review your request</h2><p className="mt-1 text-sm text-[#6c776f]">We’ll call to confirm availability and price before work starts.</p></div>
                <div className="rounded-2xl border border-[#e2e8e0] bg-[#fafbf9] p-4 sm:p-5">
                  <SummaryRow label="Service" value={selectedServiceLabels.join(", ") || "Not selected"} />
                  {isCarWashBooking && selectedWashOption && <SummaryRow label="Wash type" value={selectedWashOption.title} />}
                  {!isCarWashBooking && problem.trim() && <SummaryRow label="Details" value={problem.trim()} />}
                  {selectedVehicleId && <SummaryRow label="Vehicle" value={vehicles.find((vehicle) => vehicle.id === selectedVehicleId)?.name ?? "Saved vehicle"} />}
                  <SummaryRow label="Location" value={locationLabel || (locationSource === "gps" ? "Current GPS location" : "Map pin selected")} />
                  {preferredTime && hasPreferredTimeOption && <SummaryRow label="Preferred time" value={new Date(preferredTime).toLocaleString("en-GH", { dateStyle: "medium", timeStyle: "short" })} />}
                </div>
                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[#dbe7d7] bg-[#f1f7ee] p-4"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#315d40]" /><div><h3 className="text-sm font-bold text-[#284a33]">Price and payment</h3><p className="mt-1 text-sm leading-5 text-[#617067]">No payment is collected here. The dispatcher confirms your fee before work begins. If additional work is proposed, the dispatcher should confirm the revised price with you first.</p></div></div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="block"><span className="mb-2 block text-sm font-bold">Your name</span><span className="flex min-h-12 items-center gap-3 rounded-xl border border-[#dce3da] px-3 focus-within:border-[#5e926a] focus-within:ring-4 focus-within:ring-[#5e926a]/10"><UserRound className="h-4 w-4 shrink-0 text-[#6f7c73]" /><input value={customerName} onChange={(event) => setCustomerName(event.target.value)} maxLength={120} autoComplete="name" required className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-[#929b94]" placeholder="Full name" /></span></label>
                  <label className="block"><span className="mb-2 block text-sm font-bold">Phone number</span><span className="flex min-h-12 items-center gap-3 rounded-xl border border-[#dce3da] px-3 focus-within:border-[#5e926a] focus-within:ring-4 focus-within:ring-[#5e926a]/10"><Phone className="h-4 w-4 shrink-0 text-[#6f7c73]" /><input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} type="tel" maxLength={24} autoComplete="tel" required className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-[#929b94]" placeholder="024 000 0000" /></span></label>
                </div>
                <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 rounded-xl bg-[#f6f8f4] px-3 text-sm font-medium text-[#58655c]"><input type="checkbox" checked={rememberName} onChange={(event) => setRememberName(event.target.checked)} className="h-5 w-5 accent-[#28714b]" />Remember my name on this device</label>
                {formState && <p role={formState.type === "error" ? "alert" : "status"} className={`mt-4 flex items-start gap-2 rounded-xl border px-3 py-3 text-sm font-semibold leading-5 ${formState.type === "success" ? "border-[#d5e6d1] bg-[#f0f7ec] text-[#315d40]" : "border-[#efd5c9] bg-[#fff4ef] text-[#913c2c]"}`}><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />{formState.message}</p>}
              </div>}

              {formState && step !== 4 && <p role="alert" className="mx-5 mb-4 rounded-xl border border-[#efd5c9] bg-[#fff4ef] px-3 py-3 text-sm font-semibold leading-5 text-[#913c2c] sm:mx-8">{formState.message}</p>}
              <div className="flex items-center justify-between gap-3 border-t border-[#e8ece6] bg-[#fcfdfb] px-5 py-4 sm:px-8">
                {step > 1 ? <button type="button" onClick={() => { setFormState(null); setStep((step - 1) as BookingStep); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#dce3da] bg-white px-4 text-sm font-bold text-[#425148] hover:bg-[#f6f8f4]"><ChevronLeft className="h-4 w-4" />Back</button> : <button type="button" onClick={clearBooking} className="min-h-11 px-2 text-sm font-semibold text-[#66736a] hover:text-[#25352b]">Cancel</button>}
                {step < 4 ? <button type="button" onClick={continueToNextStep} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#174b35] px-5 text-sm font-bold text-white hover:bg-[#103e2c]">Continue<ChevronRight className="h-4 w-4" /></button> : <button type="submit" disabled={submitting} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#174b35] px-5 text-sm font-bold text-white hover:bg-[#103e2c] disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Sending request…" : "Send request"}{!submitting && <ArrowRight className="h-4 w-4" />}</button>}
              </div>
            </form>
          </section>
        ) : tab === "home" ? (
          <section className="space-y-7">
            <div className="overflow-hidden rounded-[28px] bg-[#123d2c] text-white shadow-[0_20px_45px_rgba(20,65,45,0.13)]">
              <div className="grid min-h-[330px] lg:grid-cols-[1.05fr_0.95fr]">
                <div className="flex flex-col items-start justify-center px-6 py-8 sm:px-10 sm:py-10 lg:px-12">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#d7e9da]"><span className="h-2 w-2 rounded-full bg-[#b6d975]" />Car care for your day</span>
                  <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-[1.04] tracking-[-0.05em] sm:text-5xl">Car care comes to you.</h1>
                  <p className="mt-4 max-w-lg text-sm leading-6 text-white/75 sm:text-base sm:leading-7">Request help at home, work, or on the roadside. A Siesie dispatcher will review your request and confirm the next step with you.</p>
                  <div className="mt-6 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                    <button type="button" onClick={() => beginBooking()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#c7e08d] px-5 text-sm font-bold text-[#183c2a] hover:bg-[#d0e79d]">Book car care<ArrowRight className="h-4 w-4" /></button>
                    <button type="button" onClick={() => beginBooking("breakdown")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/25 px-5 text-sm font-bold text-white hover:bg-white/10"><Siren className="h-4 w-4" />Roadside help</button>
                  </div>
                  <p className="mt-4 text-xs leading-5 text-white/60">Accra launch · manual dispatcher updates · no payment collected online</p>
                </div>
                <div className="relative hidden min-h-[330px] lg:block">
                  <Image src="/hero-img.png" alt="A mechanic helping a driver with car care" width={1671} height={941} priority sizes="(min-width: 1024px) 50vw, 100vw" className="absolute inset-0 h-full w-full object-cover object-center" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#123d2c] via-[#123d2c]/20 to-transparent" />
                  <p className="absolute bottom-4 right-5 z-10 max-w-[250px] rounded-lg bg-[#123d2c]/85 px-2.5 py-1.5 text-center text-[10px] leading-4 text-white/85">Concept artwork · live tracking is not connected.</p>
                </div>
              </div>
            </div>

            {request && request.status !== "completed" && request.status !== "cancelled" && request.status !== "no_show" && <button type="button" onClick={() => { setBookingOpen(false); setTab("bookings"); }} className="flex w-full items-center gap-4 rounded-2xl border border-[#dce5da] bg-white p-4 text-left shadow-sm transition hover:border-[#a9c4aa] sm:p-5"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#edf5e9] text-[#315d40]"><ClipboardList className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-bold uppercase tracking-[0.12em] text-[#718077]">Booking update</span><span className="mt-1 block truncate font-bold">{statusCopyFor(request.status, request.service_type).title} · {request.service_type}</span><span className="mt-1 block text-xs text-[#768078]">Reference {request.id.slice(0, 8)}</span></span><ArrowRight className="h-5 w-5 shrink-0 text-[#4c6652]" /></button>}

            <div className="grid gap-7 lg:grid-cols-[1.5fr_0.8fr]">
              <section>
                <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#728078]">Start with what you need</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">Explore services</h2></div><button type="button" onClick={() => beginBooking()} className="hidden min-h-10 items-center gap-1 text-sm font-bold text-[#24533a] sm:inline-flex">View all<ArrowRight className="h-4 w-4" /></button></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {SERVICE_GROUPS.map((group) => {
                    const service = SERVICE_CATEGORIES.find((item) => item.id === group.ids[0]);
                    if (!service) return null;
                    return <button key={group.title} type="button" onClick={() => beginBooking(service.id)} className="flex min-h-[122px] items-start gap-4 rounded-2xl border border-[#e0e6de] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[#b7cbb5] hover:shadow-[0_12px_26px_rgba(35,66,43,0.07)]"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#eef4eb]"><Image src={service.logo} alt="" width={34} height={34} className="h-8 w-8 object-contain" /></span><span className="min-w-0 flex-1"><span className="block font-bold text-[#25372b]">{group.title}</span><span className="mt-1 block text-sm leading-5 text-[#748077]">{group.description}</span><span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#326247]">Browse services<ArrowRight className="h-3.5 w-3.5" /></span></span></button>;
                  })}
                  <button type="button" onClick={() => { setTab("bookings"); setBookingOpen(false); }} className="flex min-h-[122px] items-start gap-4 rounded-2xl border border-[#e0e6de] bg-white p-4 text-left transition hover:border-[#b7cbb5] hover:shadow-[0_12px_26px_rgba(35,66,43,0.07)]"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#f0f2ec] text-[#496653]"><ClipboardList className="h-5 w-5" /></span><span><span className="block font-bold text-[#25372b]">Your bookings</span><span className="mt-1 block text-sm leading-5 text-[#748077]">Review each status shared by your dispatcher.</span><span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#326247]">View bookings<ArrowRight className="h-3.5 w-3.5" /></span></span></button>
                </div>
              </section>
              <aside className="space-y-4">
                <div className="rounded-2xl border border-[#e0e6de] bg-white p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f4f1e8] text-[#76633c]"><CircleHelp className="h-5 w-5" /></span><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#78837b]">Need a hand?</p><h2 className="font-bold">Unsure what your car needs?</h2></div></div><p className="mt-3 text-sm leading-5 text-[#6b776e]">Describe a symptom in everyday language and we’ll help you prepare a clear request.</p><button type="button" onClick={() => { beginBooking(); setExplainOpen(true); setExplainSelection(null); }} className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#24533a]">Explain my car problem<ArrowRight className="h-4 w-4" /></button></div>
                <div className="rounded-2xl border border-[#e7e7de] bg-[#fbfaf5] p-5"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#746442]"><Clock3 className="h-5 w-5" /></span><div><h2 className="font-bold">Clear before work begins</h2><p className="mt-1 text-sm leading-5 text-[#72776d]">The dispatcher confirms service availability and price with you. Discuss any price changes before work continues.</p></div></div></div>
                <div className="rounded-2xl bg-[#edf2ec] p-5"><p className="text-sm font-bold text-[#2e4f39]">Personal safety</p><p className="mt-1 text-xs leading-5 text-[#657469]">For immediate danger, call Ghana Police directly on 191. This number does not connect to Siesie.</p><a href="tel:191" className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#cdd9cb] bg-white px-3 text-sm font-bold text-[#284a33]"><Phone className="h-4 w-4" />Call 191</a></div>
              </aside>
            </div>
          </section>
        ) : tab === "bookings" ? (
          <BookingsView requests={bookingIds.flatMap((id) => {
            const savedRequest = id === requestId && request ? request : bookingRequests.find((item) => item.id === id);
            return savedRequest ? [savedRequest] : [];
          })} hasSavedBookings={bookingIds.length > 0} loading={bookingHistoryLoading || (connectionState === "idle" && Boolean(requestId))} connectionError={connectionState === "offline" || bookingHistoryOffline} onNew={() => beginBooking()} onDismissToast={() => setStatusToast(null)} formState={formState} />
        ) : tab === "car" ? (
          <section className="mx-auto max-w-[920px]">
            <PageHeading eyebrow="Your vehicle care" title="My car" description="Keep useful vehicle details close for your next service request. This information is saved only on this device." />
            {request && <div className="mb-6 rounded-2xl border border-[#e0e6de] bg-white p-4 sm:p-5"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#78837b]">Latest request</p><div className="mt-2 flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold">{request.service_type}</p><p className="mt-1 text-sm text-[#6f7a72]">{statusCopyFor(request.status, request.service_type).title} · {formatDate(request.updated_at)}</p></div><button type="button" onClick={() => { setBookingOpen(false); setTab("bookings"); }} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#dce3da] px-3 text-sm font-bold text-[#315d40]">View request<ArrowRight className="h-4 w-4" /></button></div></div>}
            <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-2xl border border-[#e0e6de] bg-white p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Saved vehicles</h2><p className="mt-1 text-sm text-[#6f7a72]">Add more than one vehicle. Details are optional when booking.</p></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf3e9] text-[#315d40]"><CarFront className="h-5 w-5" /></span></div>
                {vehicles.length ? <ul className="mt-5 divide-y divide-[#edf0eb]">{vehicles.map((vehicle) => <li key={vehicle.id} className="flex items-center gap-3 py-4 first:pt-0 last:pb-0"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f3f6f1] text-[#496653]"><CarFront className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{vehicle.name}</span><span className="mt-1 block text-xs text-[#7b857d]">{vehicle.registration || "No registration added"}</span></span><button type="button" onClick={() => removeVehicle(vehicle.id)} aria-label={`Remove ${vehicle.name}`} className="grid h-10 w-10 place-items-center rounded-lg text-[#79837b] hover:bg-[#f5f6f3] hover:text-[#a24232]"><Trash2 className="h-4 w-4" /></button></li>)}</ul> : <div className="mt-5 rounded-xl border border-dashed border-[#dce3da] px-4 py-7 text-center"><CarFront className="mx-auto h-7 w-7 text-[#718078]" /><p className="mt-2 text-sm font-bold">No vehicles saved</p><p className="mt-1 text-xs text-[#778179]">You can still request a service without adding a vehicle.</p></div>}
                <form onSubmit={saveNewVehicle} className="mt-5 grid gap-3 border-t border-[#edf0eb] pt-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><label><span className="mb-1.5 block text-xs font-bold text-[#58655c]">Make and model</span><input value={vehicleName} onChange={(event) => setVehicleName(event.target.value)} maxLength={100} placeholder="e.g. Toyota Corolla" className="min-h-11 w-full rounded-lg border border-[#dce3da] px-3 text-sm outline-none focus:border-[#5e926a] focus:ring-4 focus:ring-[#5e926a]/10" /></label><label><span className="mb-1.5 block text-xs font-bold text-[#58655c]">Registration (optional)</span><input value={vehicleRegistration} onChange={(event) => setVehicleRegistration(event.target.value)} maxLength={30} placeholder="e.g. GT 1234-24" className="min-h-11 w-full rounded-lg border border-[#dce3da] px-3 text-sm outline-none focus:border-[#5e926a] focus:ring-4 focus:ring-[#5e926a]/10" /></label><button type="submit" disabled={!vehicleName.trim()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#174b35] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-4 w-4" />Add vehicle</button></form>
              </div>
              <div className="space-y-4"><div className="rounded-2xl border border-[#e0e6de] bg-white p-5"><h2 className="font-bold">Service history</h2><p className="mt-2 text-sm leading-5 text-[#6f7a72]">A full service record and receipt will appear here when those details are available from your assigned service professional.</p><div className="mt-4 rounded-xl bg-[#f6f8f4] p-3 text-xs leading-5 text-[#78837b]">Your requests and their current status are listed under Bookings. Completed service records will appear here when available.</div></div><div className="rounded-2xl bg-[#edf2ec] p-5"><h2 className="text-sm font-bold text-[#2e4f39]">Maintenance reminders</h2><p className="mt-1 text-sm leading-5 text-[#66746a]">Reminders will be based on recorded service information. No dates or maintenance recommendations have been added to this account.</p></div></div>
            </div>
          </section>
        ) : (
          <section className="mx-auto max-w-[920px]">
            <PageHeading eyebrow="Your details" title="Profile" description="Your contact details and saved places on this device." />
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#e0e6de] bg-white p-5 sm:p-6"><div className="flex items-center gap-4"><span className="grid h-14 w-14 place-items-center rounded-full bg-[#edf3e9] text-lg font-bold text-[#315d40]">{profile.name ? profile.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() : "SI"}</span><div><p className="font-bold">{profile.name || "Siesie customer"}</p><p className="mt-1 text-sm text-[#6f7a72]">{profile.phone || "Add your details when you make a request."}</p></div></div><div className="mt-5 rounded-xl bg-[#f6f8f4] p-4"><p className="text-sm font-bold">How requests are handled</p><p className="mt-1 text-sm leading-5 text-[#6f7a72]">Manual dispatch. A Siesie dispatcher reviews your request, confirms availability and price, and shares updates as they are received.</p></div><p className="mt-4 text-xs leading-5 text-[#79847c]">Your name preference and saved contact details are stored in this browser. There is no customer sign-in or cross-device sync yet.</p></div>
              <div className="rounded-2xl border border-[#e0e6de] bg-white p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="font-bold">Saved places</h2><p className="mt-1 text-sm text-[#6f7a72]">Home and work locations for faster booking.</p></div><MapPin className="h-5 w-5 text-[#496653]" /></div>{savedLocations.length ? <ul className="mt-4 divide-y divide-[#edf0eb]">{savedLocations.map((location) => <li key={location.id} className="flex items-start gap-3 py-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#f3f6f1] text-[#496653]"><MapPin className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold">{location.name}</span><span className="mt-1 block text-xs leading-5 text-[#768078]">{location.label}</span></span><button type="button" onClick={() => removeLocation(location.id)} aria-label={`Remove saved ${location.name} location`} className="grid h-9 w-9 place-items-center rounded-lg text-[#79837b] hover:bg-[#f5f6f3] hover:text-[#a24232]"><Trash2 className="h-4 w-4" /></button></li>)}</ul> : <div className="mt-4 rounded-xl border border-dashed border-[#dce3da] px-4 py-7 text-center"><MapPin className="mx-auto h-6 w-6 text-[#718078]" /><p className="mt-2 text-sm font-semibold">No saved places yet</p><p className="mt-1 text-xs text-[#778179]">Save Home or Work after selecting a location in a booking.</p></div>}<p className="mt-4 text-xs leading-5 text-[#79847c]">Saved coordinates stay in this browser. Review or remove them here at any time.</p></div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-[#edf2ec] p-4"><div className="flex-1"><p className="text-sm font-bold text-[#2e4f39]">Need roadside help?</p><p className="mt-1 text-xs text-[#66746a]">Create a request and the dispatcher will confirm the next step.</p></div><button type="button" onClick={() => beginBooking("breakdown")} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#174b35] px-3 text-sm font-bold text-white"><Siren className="h-4 w-4" />Request help</button></div>
          </section>
        )}
      </div>

      {explainOpen && <div className="fixed inset-0 z-[80] grid items-end bg-[#14251d]/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setExplainOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="explain-title" className="mx-auto max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-[24px] bg-white p-5 shadow-2xl sm:rounded-[24px] sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#718078]">Guided symptom help</p><h2 id="explain-title" className="mt-1 text-2xl font-bold tracking-tight">What are you noticing?</h2><p className="mt-2 text-sm leading-5 text-[#6d796f]">This helps describe your request; it cannot diagnose the vehicle.</p></div><button type="button" onClick={() => setExplainOpen(false)} aria-label="Close symptom help" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[#64716a] hover:bg-[#f2f5f0]"><X className="h-5 w-5" /></button></div><div className="mt-5 space-y-2">{SYMPTOMS.map((symptom) => <button key={symptom.id} type="button" aria-pressed={explainSelection?.id === symptom.id} onClick={() => setExplainSelection(symptom)} className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 text-left text-sm font-semibold ${explainSelection?.id === symptom.id ? "border-[#60916c] bg-[#f0f6ed] text-[#24533a]" : "border-[#e1e7df] text-[#334239] hover:bg-[#fafbf9]"}`}><span className={`grid h-5 w-5 place-items-center rounded-full border ${explainSelection?.id === symptom.id ? "border-[#2e7751] bg-[#2e7751] text-white" : "border-[#cbd4ca] text-transparent"}`}><Check className="h-3 w-3" /></span>{symptom.title}</button>)}</div>{explainSelection && <div className="mt-4 rounded-xl bg-[#f6f8f4] p-4"><p className="text-sm font-bold text-[#35453a]">A useful detail to add</p><p className="mt-1 text-sm leading-5 text-[#6c776f]">Think about when it happens, any warning light you can see, or whether the vehicle can move safely.</p>{explainSelection.id === "heat" && <p className="mt-3 border-l-2 border-[#be7552] pl-3 text-sm leading-5 text-[#79523e]">If there is smoke or the vehicle feels unsafe, stop in a safe place if possible and move away. For immediate danger, contact local emergency services.</p>}</div>}<div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setExplainOpen(false)} className="min-h-11 rounded-xl border border-[#dce3da] px-4 text-sm font-bold text-[#526159]">Cancel</button><button type="button" onClick={applySymptom} disabled={!explainSelection} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#174b35] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Add to request<ArrowRight className="h-4 w-4" /></button></div></section></div>}

      <a href="tel:191" aria-label="Call Ghana Police directly on 191 for immediate danger" title="Call Ghana Police directly on 191" className="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] right-4 z-40 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#d5ddd3] bg-white px-3 text-xs font-bold text-[#47584b] shadow-md sm:right-7 lg:hidden"><Siren className="h-4 w-4" />Call Police 191</a>
      <BottomNav activeTab={bookingOpen ? "home" : tab} onChange={(nextTab) => { setBookingOpen(false); setTab(nextTab); }} />
    </main>
  );
}

function NavButton({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: typeof House; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-current={active ? "page" : undefined} className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${active ? "bg-[#edf3e9] text-[#174b35]" : "text-[#66736a] hover:bg-[#f0f3ee] hover:text-[#26372c]"}`}><Icon className="h-4 w-4" />{children}</button>;
}

function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#728078]">{eyebrow}</p><h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#6f7a72]">{description}</p></div>;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-1 border-b border-[#e8ece6] py-3 first:pt-0 last:border-0 last:pb-0 sm:grid-cols-[140px_1fr] sm:gap-4"><span className="text-xs font-bold uppercase tracking-wide text-[#778179]">{label}</span><span className="break-words text-sm font-semibold leading-5 text-[#29372e]">{value}</span></div>;
}

function BookingsView({ requests, hasSavedBookings, loading, connectionError, onNew, onDismissToast, formState }: { requests: CustomerRequestStatus[]; hasSavedBookings: boolean; loading: boolean; connectionError: boolean; onNew: () => void; onDismissToast: () => void; formState: { type: "error" | "success"; message: string } | null }) {
  return <section className="mx-auto max-w-[920px]"><PageHeading eyebrow="Request progress" title="Bookings" description="Your dispatcher shares progress here as each request is reviewed and updated." />
    {formState?.type === "success" && <p role="status" className="mb-4 flex items-start gap-2 rounded-xl border border-[#d5e6d1] bg-[#f0f7ec] px-4 py-3 text-sm font-semibold text-[#315d40]"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{formState.message}<button type="button" onClick={onDismissToast} aria-label="Dismiss" className="ml-auto text-xs font-bold">Dismiss</button></p>}
    {connectionError && requests.length > 0 && <p role="status" className="mb-4 rounded-xl border border-[#eadcc4] bg-[#fffaf1] px-4 py-3 text-sm font-medium text-[#765d36]">Some booking updates could not be refreshed. We’ll retry automatically.</p>}
    {requests.length > 0 ? <div className="space-y-4">{requests.map((savedRequest, index) => <BookingCard key={savedRequest.id} request={savedRequest} isLatest={index === 0} onNew={onNew} />)}</div> : loading ? <div role="status" className="rounded-[24px] border border-[#e0e6de] bg-white px-5 py-12 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#dce7d9] border-t-[#2e7751]" /><p className="mt-4 text-sm font-semibold">Loading your bookings…</p></div> : hasSavedBookings && connectionError ? <div role="alert" className="rounded-[24px] border border-[#e0e6de] bg-white px-5 py-10 text-center"><ClipboardList className="mx-auto h-8 w-8 text-[#54745b]" /><h2 className="mt-3 text-lg font-bold">Your bookings could not be refreshed</h2><p className="mx-auto mt-2 max-w-md text-sm leading-5 text-[#6f7a72]">We’ll retry automatically. Check your connection, or reload this page to try again.</p></div> : <div className="rounded-[24px] border border-dashed border-[#d8e1d6] bg-white px-5 py-12 text-center"><ClipboardList className="mx-auto h-9 w-9 text-[#54745b]" /><h2 className="mt-3 text-lg font-bold">No bookings on this device yet</h2><p className="mx-auto mt-2 max-w-md text-sm leading-5 text-[#6f7a72]">Bookings are saved in this browser. There is no customer sign-in or cross-device history yet.</p><button type="button" onClick={onNew} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#174b35] px-4 text-sm font-bold text-white">Book a service<ArrowRight className="h-4 w-4" /></button></div>}
  </section>;
}

function BookingCard({ request, isLatest, onNew }: { request: CustomerRequestStatus; isLatest: boolean; onNew: () => void }) {
  const terminal = request.status === "completed" || request.status === "cancelled" || request.status === "no_show";
  const current = statusCopyFor(request.status, request.service_type);
  const workerTitle = serviceWorkerTitle(request.service_type);
  return <article className="overflow-hidden rounded-[24px] border border-[#e0e6de] bg-white shadow-sm">
    <div className="border-b border-[#e8ece6] bg-[#fafbf9] p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#728078]">{isLatest ? "Latest booking" : "Earlier booking"}</p><h2 className="mt-1 text-2xl font-bold tracking-tight">{current.title}</h2><p className="mt-2 max-w-xl text-sm leading-5 text-[#69756d]">{current.detail}</p></div>
        <span className="inline-flex min-h-8 items-center rounded-lg bg-[#e9f1e7] px-3 text-xs font-bold capitalize text-[#315d40]">{request.status.replaceAll("_", " ")}</span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[#e6ebe3] bg-white p-3"><p className="text-xs font-bold uppercase tracking-wide text-[#7a857d]">Service</p><p className="mt-1 text-sm font-semibold">{request.service_type}</p></div>
        <div className="rounded-xl border border-[#e6ebe3] bg-white p-3"><p className="text-xs font-bold uppercase tracking-wide text-[#7a857d]">Request reference</p><p className="mt-1 break-all text-sm font-semibold">{request.id}</p></div>
        <div className="rounded-xl border border-[#e6ebe3] bg-white p-3"><p className="text-xs font-bold uppercase tracking-wide text-[#7a857d]">Submitted</p><p className="mt-1 text-sm font-semibold">{formatDate(request.created_at)}</p></div>
        {request.scheduled_at && <div className="rounded-xl border border-[#e6ebe3] bg-white p-3"><p className="text-xs font-bold uppercase tracking-wide text-[#7a857d]">Requested time</p><p className="mt-1 text-sm font-semibold">{formatDate(request.scheduled_at)}</p><p className="mt-1 text-xs text-[#7a857d]">Pending dispatcher confirmation</p></div>}
      </div>
    </div>
    {request.arrival_code && (request.status === "arrived" || request.status === "in_progress") && <div className="border-b border-[#e8ece6] p-5 sm:px-7"><div className="rounded-xl border border-[#d8e6d5] bg-[#f1f7ee] p-4"><p className="text-xs font-bold uppercase tracking-wide text-[#315d40]">Arrival verification code</p><p className="mt-1 text-3xl font-bold tracking-[0.2em] text-[#214b33]">{request.arrival_code}</p><p className="mt-1 text-sm text-[#69756d]">Share this with your {workerTitle.toLowerCase()} to confirm you are meeting the right person.</p></div></div>}
    {request.mechanic && !terminal && <div className="border-b border-[#e8ece6] px-5 py-4 sm:px-7"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold">{request.mechanic.name}</p><p className="mt-1 text-xs text-[#758078]">Assigned {workerTitle.toLowerCase()}</p></div><a href={`tel:${request.mechanic.phone.replace(/[^+\d]/g, "")}`} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#174b35] px-3 text-sm font-bold text-white"><Phone className="h-4 w-4" />Call {workerTitle.toLowerCase()}</a></div></div>}
    <div className="p-5 sm:p-7"><h3 className="font-bold">Updates</h3>{request.status_history?.length ? <ol className="mt-4 space-y-0 border-l-2 border-[#dbe7d7] pl-5">{request.status_history.map((entry, index) => <li key={`${entry.at}-${index}`} className="relative pb-5 last:pb-0"><span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-white bg-[#4f8b60] ring-1 ring-[#4f8b60]" /><p className="text-sm font-bold">{statusCopyFor(entry.status, request.service_type).title}</p><p className="mt-1 text-xs text-[#7b857d]">{formatDate(entry.at)}</p>{entry.note && <p className="mt-1 text-sm text-[#64716a]">{entry.note}</p>}</li>)}</ol> : <p className="mt-3 text-sm text-[#748077]">Your request is received. Updates will appear here.</p>}
      {request.support_contacts && request.support_contacts.length > 0 && <div className="mt-5 rounded-xl border border-[#e4e7de] bg-[#fbfaf5] p-4"><h3 className="font-bold">Need an update?</h3><p className="mt-1 text-sm text-[#6f776d]">This request is taking longer than expected. Call the dispatcher for help.</p><div className="mt-3 flex flex-wrap gap-2">{request.support_contacts.map((contact) => <a key={`${contact.name}-${contact.phone}`} href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#174b35] px-3 text-sm font-bold text-white"><Phone className="h-4 w-4" />Call {contact.name}</a>)}</div></div>}
      {terminal && <div className="mt-6 rounded-xl bg-[#f6f8f4] p-4"><p className="text-sm font-bold">Need more help?</p><p className="mt-1 text-sm leading-5 text-[#6f7a72]">Create a new request or contact the dispatcher if you need help with this booking.</p></div>}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e8ece6] bg-[#fcfdfb] px-5 py-4 sm:px-7"><p className="text-xs text-[#79847c]">Status updates are entered by the dispatcher. This page does not show live location tracking.</p>{terminal && <button type="button" onClick={onNew} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#174b35] px-3 text-sm font-bold text-white">Request another service<ArrowRight className="h-4 w-4" /></button>}</div>
  </article>;
}

function BottomNav({ activeTab, onChange }: { activeTab: Tab; onChange: (tab: Tab) => void }) {
  const items = [
    { id: "home" as const, label: "Home", icon: House },
    { id: "bookings" as const, label: "Bookings", icon: ClipboardList },
    { id: "car" as const, label: "My car", icon: CarFront },
    { id: "profile" as const, label: "Profile", icon: UserRound },
  ];
  return <nav aria-label="Main navigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-[#e2e8e0] bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-6px_24px_rgba(23,33,31,0.06)] backdrop-blur lg:hidden"><div className="mx-auto grid max-w-xl grid-cols-4">{items.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => onChange(id)} aria-current={activeTab === id ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-bold transition ${activeTab === id ? "text-[#174b35]" : "text-[#7b857d]"}`}><Icon className="h-5 w-5" strokeWidth={activeTab === id ? 2.4 : 1.8} />{label}</button>)}</div></nav>;
}
