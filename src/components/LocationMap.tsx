"use client";

import { useEffect, useRef } from "react";

export type PinLocation = { lat: number; lng: number; label?: string };

interface LocationMapProps {
  center: PinLocation;
  onPinMove?: (loc: PinLocation) => void;
  draggable?: boolean;
  className?: string;
}

/**
 * Leaflet map with a draggable pin. Loaded dynamically to avoid SSR issues.
 * Uses OpenStreetMap tiles — no API key needed.
 */
export default function LocationMap({ center, onPinMove, draggable = true, className = "" }: LocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;

    async function init() {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      if (destroyed || !containerRef.current) return;

      // Fix default icon paths broken by bundlers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current).setView([center.lat, center.lng], 16);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([center.lat, center.lng], { draggable }).addTo(map);
      markerRef.current = marker;

      if (draggable && onPinMove) {
        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          onPinMove({ lat: pos.lat, lng: pos.lng });
        });
        map.on("click", (event) => {
          marker.setLatLng(event.latlng);
          onPinMove({ lat: event.latlng.lat, lng: event.latlng.lng });
        });
      }
    }

    void init();

    return () => {
      destroyed = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker & view when center prop changes (e.g. user picks a search result)
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    markerRef.current.setLatLng([center.lat, center.lng]);
    mapRef.current.setView([center.lat, center.lng], 16, { animate: true });
  }, [center.lat, center.lng]);

  return <div ref={containerRef} className={`rounded-xl overflow-hidden ${className}`} style={{ minHeight: 220 }} />;
}
