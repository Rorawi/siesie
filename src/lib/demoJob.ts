export type DemoJobStatus =
  | "matching"
  | "accepted"
  | "en_route"
  | "arrived"
  | "in_progress"
  | "completed"
  | "declined"
  | "no_provider";

export type DemoJob = {
  id: string;
  status: DemoJobStatus;
  service: string;
  price: string;
  completionPin: string;
  attempts: number;
  updatedAt: number;
};

export const DEMO_JOB_KEY = "siesie:demo-job";
export const DEMO_JOB_EVENT = "siesie:demo-job-updated";

export function readDemoJob(): DemoJob | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(DEMO_JOB_KEY);
  if (!value) return null;
  try {
    const job = JSON.parse(value) as Partial<DemoJob>;
    return { ...job, attempts: job.attempts ?? 0 } as DemoJob;
  } catch {
    return null;
  }
}

export function writeDemoJob(job: DemoJob) {
  window.localStorage.setItem(DEMO_JOB_KEY, JSON.stringify(job));
  window.dispatchEvent(new Event(DEMO_JOB_EVENT));
}

export function updateDemoJob(status: DemoJobStatus) {
  const current = readDemoJob();
  if (!current) return;
  writeDemoJob({ ...current, status, updatedAt: Date.now() });
}

export function retryMatching() {
  const current = readDemoJob();
  if (!current) return;
  const attempts = current.attempts + 1;
  writeDemoJob({
    ...current,
    attempts,
    status: attempts >= 5 ? "no_provider" : "matching",
    updatedAt: Date.now(),
  });
}

export function clearDemoJob() {
  window.localStorage.removeItem(DEMO_JOB_KEY);
  window.dispatchEvent(new Event(DEMO_JOB_EVENT));
}
