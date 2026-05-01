const LS_URL = "bulk_sender_api_url";
const LS_KEY = "bulk_sender_api_key";

export function getSavedUrl(): string {
  if (typeof localStorage === "undefined") {
    return "";
  }
  return localStorage.getItem(LS_URL) || import.meta.env.VITE_BULK_API_URL || "http://localhost:8010";
}

export function getSavedKey(): string {
  if (typeof localStorage === "undefined") {
    return "";
  }
  return localStorage.getItem(LS_KEY) || "";
}

const LS_JOB_ID = "bulk_sender_last_job_id";

export function saveConnection(baseUrl: string, apiKey: string) {
  const u = baseUrl.replace(/\/$/, "");
  localStorage.setItem(LS_URL, u);
  localStorage.setItem(LS_KEY, apiKey);
}

export function getSavedJobId(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(LS_JOB_ID);
}

export function saveJobId(jobId: string) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(LS_JOB_ID, jobId);
  }
}

export function clearSavedJobId() {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(LS_JOB_ID);
  }
}

export async function fetchLatestJob(baseUrl: string, apiKey: string): Promise<string | null> {
  const r = await fetch(`${baseUrl}/api/v1/envios`, {
    headers: headers(apiKey),
  });
  if (!r.ok) return null;
  const data = await r.json();
  const ids: string[] = data.job_ids ?? [];
  return ids.length > 0 ? ids[ids.length - 1] : null;
}

export interface JobEstado {
  id: string;
  estado: string;
  desde_fila: number;
  total_grupos: number;
  procesados: number;
  exitosos: number;
  fallidos: number;
  grupo_actual: string | null;
  error: string | null;
  creado: string;
  iniciado: string | null;
  finalizado: string | null;
  envios: Array<{
    fila: number;
    grupo_id: string;
    nombre: string;
    estado: string;
    detalle: string | null;
  }>;
}

function headers(apiKey: string): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) {
    h["X-API-Key"] = apiKey;
  }
  return h;
}

export async function iniciarEnvio(
  baseUrl: string,
  apiKey: string,
  desde: number,
): Promise<{ job_id: string; estado: string; mensaje: string }> {
  const r = await fetch(`${baseUrl}/api/v1/envios`, {
    method: "POST",
    headers: headers(apiKey),
    body: JSON.stringify({ desde }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || r.statusText);
  }
  return r.json();
}

export async function cancelarEnvio(
  baseUrl: string,
  apiKey: string,
): Promise<{ ok: boolean; mensaje: string }> {
  const r = await fetch(`${baseUrl}/api/v1/envios/cancelar`, {
    method: "POST",
    headers: headers(apiKey),
    body: "{}",
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || r.statusText);
  }
  return r.json();
}

export async function fetchJob(baseUrl: string, apiKey: string, jobId: string): Promise<JobEstado> {
  const r = await fetch(`${baseUrl}/api/v1/envios/${encodeURIComponent(jobId)}`, {
    headers: headers(apiKey),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || r.statusText);
  }
  return r.json();
}

// ═══════════════════════════════════════════════════════════════════════════
// Schedule API
// ═══════════════════════════════════════════════════════════════════════════

export interface Schedule {
  id: string;
  hora: string;
  dias_semana: string[];
  desde_fila: number;
  activo: boolean;
  ultima_ejecucion: string | null;
  creado: string;
}

export interface ScheduleHistoryEntry {
  id: string;
  schedule_id: string;
  hora_programada: string;
  ejecutado_en: string;
  job_id: string | null;
  estado: string;
  detalle: string | null;
}

export async function fetchSchedules(baseUrl: string, apiKey: string): Promise<{ schedules: Schedule[] }> {
  const r = await fetch(`${baseUrl}/api/v1/schedules`, {
    headers: headers(apiKey),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || r.statusText);
  }
  return r.json();
}

export async function createSchedule(
  baseUrl: string,
  apiKey: string,
  data: { hora: string; dias_semana?: string[]; desde_fila?: number },
): Promise<Schedule> {
  const r = await fetch(`${baseUrl}/api/v1/schedules`, {
    method: "POST",
    headers: headers(apiKey),
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || r.statusText);
  }
  return r.json();
}

export async function deleteSchedule(baseUrl: string, apiKey: string, scheduleId: string): Promise<void> {
  const r = await fetch(`${baseUrl}/api/v1/schedules/${encodeURIComponent(scheduleId)}`, {
    method: "DELETE",
    headers: headers(apiKey),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || r.statusText);
  }
}

export async function toggleSchedule(
  baseUrl: string,
  apiKey: string,
  scheduleId: string,
): Promise<{ ok: boolean; activo: boolean }> {
  const r = await fetch(`${baseUrl}/api/v1/schedules/${encodeURIComponent(scheduleId)}/toggle`, {
    method: "PUT",
    headers: headers(apiKey),
    body: "{}",
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || r.statusText);
  }
  return r.json();
}

export async function fetchScheduleHistory(
  baseUrl: string,
  apiKey: string,
): Promise<{ history: ScheduleHistoryEntry[] }> {
  const r = await fetch(`${baseUrl}/api/v1/schedules/history`, {
    headers: headers(apiKey),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || r.statusText);
  }
  return r.json();
}
