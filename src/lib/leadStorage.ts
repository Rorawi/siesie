import { promises as fs } from "fs";
import path from "path";

export type WaitlistEntry = {
  id: string;
  name?: string;
  email: string;
  city?: string;
  createdAt: string;
};

export type ProviderEntry = {
  id: string;
  fullName: string;
  phone: string;
  type: "Mechanic" | "Tow operator";
  yearsOfExperience: string;
  servicesOffered: string[];
  area: string;
  note?: string;
  createdAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const WAITLIST_FILE = path.join(DATA_DIR, "waitlist.json");
const PROVIDERS_FILE = path.join(DATA_DIR, "providers.json");
let waitlistWrite = Promise.resolve();

async function ensureDataFile(filePath: string, fallback: string) {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, fallback, "utf8");
  }
}

async function readJsonFile<T>(filePath: string): Promise<T[]> {
  await ensureDataFile(filePath, "[]");

  try {
    const contents = await fs.readFile(filePath, "utf8");
    if (!contents.trim()) return [] as T[];
    const parsed = JSON.parse(contents) as T[];
    return Array.isArray(parsed) ? parsed : [] as T[];
  } catch {
    return [] as T[];
  }
}

async function writeJsonFile<T>(filePath: string, entries: T[]) {
  await ensureDataFile(filePath, "[]");
  const temporaryPath = `${filePath}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(temporaryPath, JSON.stringify(entries, null, 2), "utf8");
  await fs.rename(temporaryPath, filePath);
}

export async function getWaitlistEntries(): Promise<WaitlistEntry[]> {
  return readJsonFile<WaitlistEntry>(WAITLIST_FILE);
}

export async function saveWaitlistEntry(entry: WaitlistEntry) {
  const save = waitlistWrite.then(async () => {
    const entries = await getWaitlistEntries();
    const duplicate = entries.some((item) => item.email.toLowerCase() === entry.email.toLowerCase());
    if (duplicate) return { duplicate: true };

    await writeJsonFile(WAITLIST_FILE, [entry, ...entries]);
    return { duplicate: false };
  });
  waitlistWrite = save.then(() => undefined, () => undefined);
  return save;
}

export async function getProviderEntries(): Promise<ProviderEntry[]> {
  return readJsonFile<ProviderEntry>(PROVIDERS_FILE);
}

export async function saveProviderEntry(entry: ProviderEntry) {
  const entries = await getProviderEntries();
  const nextEntries = [entry, ...entries];
  await writeJsonFile(PROVIDERS_FILE, nextEntries);
  return { success: true };
}

export function toCsv<T extends Record<string, unknown>>(rows: T[], columns: Array<keyof T>) {
  const header = columns.map((column) => `"${String(column)}"`).join(",");
  const csvLines = [header];

  for (const row of rows) {
    const values = columns.map((column) => {
      const rawValue = row[column];
      const normalized = Array.isArray(rawValue) ? rawValue.join(" | ") : rawValue;
      const value = normalized == null ? "" : String(normalized);
      const text = /^[\s]*[=+@\-]/.test(value) ? `'${value}` : value;
      return `"${text.replace(/"/g, '""')}"`;
    });
    csvLines.push(values.join(","));
  }

  return csvLines.join("\n");
}
