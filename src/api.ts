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

export function saveConnection(baseUrl: string, apiKey: string) {
  const u = baseUrl.replace(/\/$/, "");
  localStorage.setItem(LS_URL, u);
  localStorage.setItem(LS_KEY, apiKey);
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
