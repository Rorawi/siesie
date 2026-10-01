import { promises as fs } from "fs";
import path from "path";
import { randomInt } from "node:crypto";

export type DispatchStatus = "new" | "reviewed" | "assigned" | "arrived" | "in_progress" | "completed" | "cancelled" | "no_show";

export type StatusEvent = {
  status: DispatchStatus;
  at: string;
  note?: string;
};

export type MechanicRecord = {
  id: string;
  name: string;
  phone: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type DispatchRequest = {
  id: string;
  customer_name: string;
  customer_phone: string;
  service_type: string;
  issue_description: string;
  notes: string | null;
  photo_paths: string[];
  arrival_code: string;
  location_label: string;
  latitude: number | null;
  longitude: number | null;
  status: DispatchStatus;
  assigned_mechanic_id: string | null;
  status_history: StatusEvent[];
  created_at: string;
  updated_at: string;
};

const dataDir = path.join(process.cwd(), "data");
const requestsFile = path.join(dataDir, "requests.json");
const mechanicsFile = path.join(dataDir, "mechanics.json");
let requestWrite = Promise.resolve();

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

function defaultMechanic(): MechanicRecord {
  const now = new Date().toISOString();
  return {
    id: "mechanic-puff-daddy",
    name: "Puff Daddy",
    phone: "0200 000 000",
    active: true,
    created_at: now,
    updated_at: now,
  };
}

async function readLocal<T>(file: string): Promise<T[]> {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    const value = await fs.readFile(file, "utf8");
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

async function writeLocal<T>(file: string, value: T[]) {
  await fs.mkdir(dataDir, { recursive: true });
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(value, null, 2), "utf8");
  await fs.rename(temporary, file);
}

async function supabase<T>(tablePath: string, init?: RequestInit): Promise<T> {
  if (!supabaseUrl || !supabaseKey) throw new Error("Supabase is not configured.");
  const response = await fetch(`${supabaseUrl}/rest/v1/${tablePath}`, {
    ...init,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${detail}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function listMechanics(): Promise<MechanicRecord[]> {
  if (isSupabaseConfigured) {
    return supabase<MechanicRecord[]>("mechanics?select=*&order=created_at.asc");
  }
  const mechanics = await readLocal<MechanicRecord>(mechanicsFile);
  if (mechanics.length) return mechanics;
  const initial = defaultMechanic();
  await writeLocal(mechanicsFile, [initial]);
  return [initial];
}

export async function saveMechanic(mechanic: Pick<MechanicRecord, "id" | "name" | "phone" | "active">) {
  const now = new Date().toISOString();
  if (isSupabaseConfigured) {
    const rows = await supabase<MechanicRecord[]>("mechanics?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ ...mechanic, updated_at: now }),
    });
    return rows[0];
  }
  const mechanics = await listMechanics();
  const existing = mechanics.find((item) => item.id === mechanic.id);
  const saved: MechanicRecord = {
    ...mechanic,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
  await writeLocal(mechanicsFile, existing
    ? mechanics.map((item) => item.id === mechanic.id ? saved : item)
    : [...mechanics, saved]);
  return saved;
}

export async function createDispatchRequest(input: Omit<DispatchRequest, "status" | "assigned_mechanic_id" | "status_history" | "arrival_code" | "created_at" | "updated_at">) {
  const now = new Date().toISOString();
  const request: DispatchRequest = {
    ...input,
    arrival_code: randomInt(1000, 10000).toString(),
    status: "new",
    assigned_mechanic_id: null,
    status_history: [{ status: "new", at: now }],
    created_at: now,
    updated_at: now,
  };
  if (isSupabaseConfigured) {
    const rows = await supabase<DispatchRequest[]>("service_requests?select=*", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(request),
    });
    return rows[0];
  }
  await withRequestWrite(async () => {
    const requests = await readLocal<DispatchRequest>(requestsFile);
    await writeLocal(requestsFile, [request, ...requests]);
  });
  return request;
}

export async function listDispatchRequests(): Promise<DispatchRequest[]> {
  if (isSupabaseConfigured) {
    return supabase<DispatchRequest[]>("service_requests?select=*&order=created_at.desc");
  }
  const requests = await readLocal<DispatchRequest>(requestsFile);
  let changed = false;
  const normalized = requests.map((request) => {
    if (request.arrival_code) return request;
    changed = true;
    return { ...request, arrival_code: randomInt(1000, 10000).toString() };
  });
  if (changed) await writeLocal(requestsFile, normalized);
  return normalized;
}

export async function getDispatchRequest(id: string): Promise<DispatchRequest | null> {
  if (isSupabaseConfigured) {
    const rows = await supabase<DispatchRequest[]>(`service_requests?id=eq.${encodeURIComponent(id)}&select=*&limit=1`);
    return rows[0] ?? null;
  }
  const requests = await listDispatchRequests();
  return requests.find((request) => request.id === id) ?? null;
}

export async function updateDispatchRequest(
  id: string,
  update: { status?: DispatchStatus; assigned_mechanic_id?: string | null; location_label?: string; note?: string },
) {
  const current = await getDispatchRequest(id);
  if (!current) return null;
  const now = new Date().toISOString();
  const statusHistory = update.status && update.status !== current.status
    ? [...current.status_history, { status: update.status, at: now, note: update.note?.trim() || undefined }]
    : current.status_history;
  const updated: DispatchRequest = {
    ...current,
    status: update.status ?? current.status,
    assigned_mechanic_id: update.assigned_mechanic_id === undefined ? current.assigned_mechanic_id : update.assigned_mechanic_id,
    location_label: update.location_label?.trim() || current.location_label,
    status_history: statusHistory,
    updated_at: now,
  };
  if (isSupabaseConfigured) {
    const rows = await supabase<DispatchRequest[]>(`service_requests?id=eq.${encodeURIComponent(id)}&select=*`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        status: updated.status,
        assigned_mechanic_id: updated.assigned_mechanic_id,
        location_label: updated.location_label,
        status_history: updated.status_history,
        updated_at: updated.updated_at,
      }),
    });
    return rows[0] ?? null;
  }
  await withRequestWrite(async () => {
    const requests = await readLocal<DispatchRequest>(requestsFile);
    await writeLocal(requestsFile, requests.map((item) => item.id === id ? updated : item));
  });
  return updated;
}

export async function saveRequestPhoto(requestId: string, file: File): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "photo.jpg";
  const objectPath = `${requestId}/${crypto.randomUUID()}-${safeName}`;
  if (isSupabaseConfigured) {
    const response = await fetch(`${supabaseUrl}/storage/v1/object/request-photos/${objectPath.split("/").map(encodeURIComponent).join("/")}`, {
      method: "POST",
      headers: {
        apikey: supabaseKey!,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": file.type,
        "x-upsert": "false",
      },
      body: file,
    });
    if (!response.ok) throw new Error(`Photo upload failed (${response.status}).`);
    return objectPath;
  }
  const photoDir = path.join(dataDir, "request-photos", requestId);
  await fs.mkdir(photoDir, { recursive: true });
  await fs.writeFile(path.join(photoDir, path.basename(objectPath)), Buffer.from(await file.arrayBuffer()));
  return objectPath;
}

export async function getRequestPhotoUrl(objectPath: string): Promise<string | null> {
  if (isSupabaseConfigured) {
    const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
    const response = await fetch(`${supabaseUrl}/storage/v1/object/sign/request-photos/${encodedPath}`, {
      method: "POST",
      headers: { apikey: supabaseKey!, Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: 3600 }),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = await response.json() as { signedURL?: string };
    return data.signedURL?.startsWith("http") ? data.signedURL : `${supabaseUrl}/storage/v1${data.signedURL}`;
  }
  return `/api/requests/photos/${objectPath.split("/").map(encodeURIComponent).join("/")}`;
}

async function withRequestWrite<T>(operation: () => Promise<T>) {
  const current = requestWrite.then(operation);
  requestWrite = current.then(() => undefined, () => undefined);
  return current;
}
