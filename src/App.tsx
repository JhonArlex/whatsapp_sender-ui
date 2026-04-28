import { useCallback, useEffect, useRef, useState } from "react";
import {
  cancelarEnvio,
  fetchJob,
  getSavedKey,
  getSavedUrl,
  iniciarEnvio,
  type JobEstado,
  saveConnection,
} from "./api";
import "./app.css";

const POLL_MS = 1500;

const estadosOk = (e: string) =>
  e === "completado" || e === "error" || e === "cancelado";

function badgeClass(est: string) {
  if (est === "ok") {
    return "ok";
  }
  if (est === "error") {
    return "bad";
  }
  if (est === "pendiente" || est === "ejecutando") {
    return "pending";
  }
  return "muted";
}

export function App() {
  const [baseUrl, setBaseUrl] = useState(getSavedUrl);
  const [apiKey, setApiKey] = useState(getSavedKey);
  const [desde, setDesde] = useState(1);
  const [job, setJob] = useState<JobEstado | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stopping, setStopping] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollOnce = useCallback(
    async (id: string) => {
      try {
        const j = await fetchJob(baseUrl, apiKey, id);
        setJob(j);
        if (estadosOk(j.estado)) {
          stopPoll();
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Error al consultar el job");
        stopPoll();
      }
    },
    [apiKey, baseUrl, stopPoll],
  );

  useEffect(() => {
    if (!jobId) {
      return;
    }
    void pollOnce(jobId);
    pollRef.current = setInterval(() => {
      void pollOnce(jobId);
    }, POLL_MS);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [jobId, pollOnce]);

  async function handleIniciar() {
    setErr(null);
    setJob(null);
    setJobId(null);
    saveConnection(baseUrl, apiKey);
    setLoading(true);
    try {
      const res = await iniciarEnvio(baseUrl, apiKey, desde);
      setJobId(res.job_id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo iniciar el envío");
    } finally {
      setLoading(false);
    }
  }

  async function handleDetener() {
    saveConnection(baseUrl, apiKey);
    setErr(null);
    setStopping(true);
    try {
      await cancelarEnvio(baseUrl, apiKey);
      if (jobId) {
        void pollOnce(jobId);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo detener el envío");
    } finally {
      setStopping(false);
    }
  }

  const pct =
    job && job.total_grupos > 0 ? Math.min(100, (job.procesados / job.total_grupos) * 100) : 0;

  return (
    <div className="layout">
      <header className="head">
        <h1>Envío masivo a grupos</h1>
        <p>
          Conecta con <code>bulk-sender-api</code>, inicia el lote y sigue el log en esta pantalla.
        </p>
      </header>

      <section className="card">
        <h2>Conexión</h2>
        <div className="row">
          <label>
            URL de la API
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value.replace(/\/$/, ""))}
              placeholder="https://api-tu-servidor:8010"
            />
          </label>
        </div>
        <div className="row">
          <label>
            X-API-Key
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Misma clave que SERVICE_API_KEY (si la configuraste)"
              autoComplete="off"
            />
          </label>
        </div>
        <div className="row row-inline">
          <label>
            Empezar desde fila (CSV)
            <input
              type="number"
              min={1}
              value={desde}
              onChange={(e) => setDesde(Number(e.target.value) || 1)}
            />
          </label>
          <button type="button" className="btn primary" disabled={loading} onClick={handleIniciar}>
            {loading ? "Iniciando…" : "Iniciar envío de mensajes"}
          </button>
        </div>
        {err && <p className="err">{err}</p>}
        <p className="hint">
          En <code>bulk-sender-api</code> añade <code>CORS_ORIGINS</code> con la URL de esta UI
          (por ej. <code>http://localhost:3010</code>) si usas otro origen.
        </p>
      </section>

      {jobId && (
        <section className="card">
          <h2>Estado del envío</h2>
          <p className="meta">
            Job ID: <code>{jobId}</code>
          </p>
          {!job && <p className="muted">Cargando primer estado…</p>}
          {job && (
            <>
              <div className="summary">
                <span
                  className={
                    job.estado === "completado"
                      ? "tag ok"
                      : job.estado === "error"
                        ? "tag bad"
                        : job.estado === "cancelado"
                          ? "tag warn"
                          : "tag pending"
                  }
                >
                  {job.estado}
                </span>
                {job.error && <span className="err-inline">{job.error}</span>}
              </div>
              <div className="stats">
                <div>Total: {job.total_grupos}</div>
                <div>Procesados: {job.procesados}</div>
                <div className="ok">Éxitos: {job.exitosos}</div>
                <div className="bad">Fallos: {job.fallidos}</div>
                {job.grupo_actual && <div className="current">Ahora: {job.grupo_actual}</div>}
                {(job.estado === "ejecutando" || (!job && jobId)) && (
                  <button
                    type="button"
                    className="btn danger"
                    disabled={stopping}
                    onClick={handleDetener}
                  >
                    {stopping ? "Deteniendo…" : "Detener envío"}
                  </button>
                )}
              </div>
              {job.total_grupos > 0 && (
                <div className="bar-wrap">
                  <div className="bar" style={{ width: `${pct}%` }} />
                </div>
              )}

              <h3>Log por grupo</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Fila</th>
                      <th>ID</th>
                      <th>Nombre</th>
                      <th>Resultado</th>
                      <th>Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {job.envios.map((row) => (
                      <tr key={row.fila} className={row.estado === "ok" ? "row-ok" : row.estado === "error" ? "row-err" : ""}>
                        <td>{row.fila}</td>
                        <td className="mono">{row.grupo_id}</td>
                        <td>{row.nombre}</td>
                        <td>
                          <span className={`tag ${badgeClass(row.estado)}`}>{row.estado}</span>
                        </td>
                        <td className="detalle">{row.detalle || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
