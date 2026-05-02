import { useCallback, useEffect, useRef, useState } from "react";
import {
  cancelarEnvio,
  createSchedule,
  deleteSchedule,
  fetchJob,
  fetchLatestJob,
  fetchScheduleHistory,
  fetchSchedules,
  getSavedJobId,
  getSavedKey,
  getSavedUrl,
  iniciarEnvio,
  type JobEstado,
  type Schedule,
  type ScheduleHistoryEntry,
  saveConnection,
  saveJobId,
  toggleSchedule,
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
  if (est === "enviando") {
    return "running";
  }
  if (est === "pendiente" || est === "ejecutando") {
    return "pending";
  }
  return "muted";
}

function filaEnvioLabel(est: string) {
  switch (est) {
    case "pendiente":
      return "Pendiente";
    case "enviando":
      return "Enviando…";
    case "ok":
      return "OK";
    case "error":
      return "Error";
    default:
      return est;
  }
}

// ── Helpers para días de semana ─────────────────────────────────────────────

const DIAS_LABELS: Record<string, string> = {
  lun: "Lun",
  mar: "Mar",
  mie: "Mié",
  jue: "Jue",
  vie: "Vie",
  sab: "Sáb",
  dom: "Dom",
};

const DIAS_ORDER = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"];

function diasLabel(dias: string[]): string {
  if (!dias.length) return "Todos los días";
  return dias.map((d) => DIAS_LABELS[d] ?? d).join(", ");
}

// ── Generar opciones HH:MM ──────────────────────────────────────────────────

function horaOptions(): string[] {
  const opts: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 5) {
      opts.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return opts;
}

// ── Componente principal ────────────────────────────────────────────────────

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

  // Estado de programación
  const [tab, setTab] = useState<"envios" | "programacion">("envios");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [scheduleHistory, setScheduleHistory] = useState<ScheduleHistoryEntry[]>([]);
  const [schLoading, setSchLoading] = useState(false);
  const [schErr, setSchErr] = useState<string | null>(null);

  // Formulario nuevo schedule
  const [newHora, setNewHora] = useState("08:00");
  const [newDias, setNewDias] = useState<string[]>([]);
  const [newDesde, setNewDesde] = useState(1);
  const [submitting, setSubmitting] = useState(false);

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

  // ── Persistir / restaurar jobId entre recargas ────────────────────────

  // Al montar, intenta recuperar el último job del localStorage o de la API
  useEffect(() => {
    const saved = getSavedJobId();
    if (saved) {
      setJobId(saved);
      return;
    }
    // Si no hay saved, preguntar a la API por el último job
    const url = getSavedUrl();
    const key = getSavedKey();
    fetchLatestJob(url, key).then((id) => {
      if (id) setJobId(id);
    });
    // Solo al montar, sin depender de state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persistir jobId cada vez que cambia
  useEffect(() => {
    if (jobId) {
      saveJobId(jobId);
    }
  }, [jobId]);

  // ── Cargar schedules / historial ──────────────────────────────────────

  const loadSchedules = useCallback(async () => {
    setSchLoading(true);
    setSchErr(null);
    try {
      const [s, h] = await Promise.all([
        fetchSchedules(baseUrl, apiKey),
        fetchScheduleHistory(baseUrl, apiKey),
      ]);
      setSchedules(s.schedules);
      setScheduleHistory(h.history);
    } catch (e) {
      setSchErr(e instanceof Error ? e.message : "Error al cargar schedules");
    } finally {
      setSchLoading(false);
    }
  }, [baseUrl, apiKey]);

  // ── Handlers de envíos ────────────────────────────────────────────────

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

  // ── Handlers de schedules ─────────────────────────────────────────────

  async function handleCrearSchedule() {
    saveConnection(baseUrl, apiKey);
    setSubmitting(true);
    setSchErr(null);
    try {
      await createSchedule(baseUrl, apiKey, {
        hora: newHora,
        dias_semana: newDias,
        desde_fila: newDesde,
      });
      setNewHora("08:00");
      setNewDias([]);
      setNewDesde(1);
      await loadSchedules();
    } catch (e) {
      setSchErr(e instanceof Error ? e.message : "Error al crear schedule");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleSchedule(id: string) {
    try {
      await toggleSchedule(baseUrl, apiKey, id);
      await loadSchedules();
    } catch (e) {
      setSchErr(e instanceof Error ? e.message : "Error al cambiar estado");
    }
  }

  async function handleDeleteSchedule(id: string) {
    try {
      await deleteSchedule(baseUrl, apiKey, id);
      await loadSchedules();
    } catch (e) {
      setSchErr(e instanceof Error ? e.message : "Error al eliminar schedule");
    }
  }

  function toggleDia(dia: string) {
    setNewDias((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia],
    );
  }

  // ── Cargar schedules al cambiar a pestaña ─────────────────────────────

  useEffect(() => {
    if (tab === "programacion") {
      void loadSchedules();
    }
  }, [tab, loadSchedules]);

  const pct =
    job && job.total_grupos > 0 ? Math.min(100, (job.procesados / job.total_grupos) * 100) : 0;

  return (
    <div className="layout">
      <header className="head">
        <h1>Bulk Sender</h1>
        <p>
          Envío masivo de mensajes a grupos vía Evolution API.
        </p>
      </header>

      {/* ── Conexión (compartida) ─────────────────────────────── */}
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
        {err && <p className="err">{err}</p>}
        <p className="hint">
          En <code>bulk-sender-api</code> añade <code>CORS_ORIGINS</code> con la URL de esta UI.
        </p>
      </section>

      {/* ── Tabs ──────────────────────────────────────────────── */}
      <nav className="tabs">
        <button
          type="button"
          className={`tab ${tab === "envios" ? "active" : ""}`}
          onClick={() => setTab("envios")}
        >
          Envíos
        </button>
        <button
          type="button"
          className={`tab ${tab === "programacion" ? "active" : ""}`}
          onClick={() => setTab("programacion")}
        >
          Programación
        </button>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════
          TAB: ENVÍOS
          ══════════════════════════════════════════════════════════════════ */}
      {tab === "envios" && (
        <>
          <section className="card">
            <h2>Iniciar envío</h2>
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
              <button
                type="button"
                className="btn primary"
                disabled={loading}
                onClick={handleIniciar}
              >
                {loading ? "Iniciando…" : "Iniciar envío de mensajes"}
              </button>
            </div>
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
                          <th>Estado</th>
                          <th>Detalle</th>
                        </tr>
                      </thead>
                      <tbody>
                        {job.envios.map((row) => (
                          <tr
                            key={row.fila}
                            className={
                              row.estado === "ok"
                                ? "row-ok"
                                : row.estado === "error"
                                  ? "row-err"
                                  : row.estado === "enviando"
                                    ? "row-enviando"
                                    : ""
                            }
                          >
                            <td>{row.fila}</td>
                            <td className="mono">{row.grupo_id}</td>
                            <td>{row.nombre}</td>
                            <td>
                              <span className={`tag ${badgeClass(row.estado)}`}>
                                {filaEnvioLabel(row.estado)}
                              </span>
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
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB: PROGRAMACIÓN
          ══════════════════════════════════════════════════════════════════ */}
      {tab === "programacion" && (
        <>
          {/* ── Lista de schedules ───────────────────────── */}
          <section className="card">
            <h2>Envíos programados</h2>
            {schErr && <p className="err">{schErr}</p>}
            {schLoading && <p className="muted">Cargando…</p>}
            {!schLoading && schedules.length === 0 && (
              <p className="muted">No hay envíos programados. Crea uno abajo.</p>
            )}
            {schedules.length > 0 && (
              <div className="schedule-list">
                {schedules.map((s) => (
                  <div key={s.id} className="schedule-row">
                    <div className="schedule-info">
                      <strong>{s.hora}</strong>
                      <span className="dias">{diasLabel(s.dias_semana)}</span>
                      <span className="desde">Fila {s.desde_fila}</span>
                      {s.ultima_ejecucion && (
                        <span className="ultima">
                          Última: {new Date(s.ultima_ejecucion).toLocaleString("es-CO")}
                        </span>
                      )}
                    </div>
                    <div className="schedule-actions">
                      <button
                        type="button"
                        className={`toggle-btn ${s.activo ? "on" : "off"}`}
                        onClick={() => void handleToggleSchedule(s.id)}
                        title={s.activo ? "Desactivar" : "Activar"}
                      >
                        {s.activo ? "ON" : "OFF"}
                      </button>
                      <button
                        type="button"
                        className="btn danger-sm"
                        onClick={() => void handleDeleteSchedule(s.id)}
                        title="Eliminar"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Crear nuevo schedule ────────────────────── */}
          <section className="card">
            <h2>Crear programación</h2>
            <div className="schedule-form">
              <div className="form-row">
                <label>
                  Hora
                  <select value={newHora} onChange={(e) => setNewHora(e.target.value)}>
                    {horaOptions().map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="form-row">
                <label>Días de semana</label>
                <div className="dias-checkboxes">
                  {DIAS_ORDER.map((d) => (
                    <label key={d} className="dia-check">
                      <input
                        type="checkbox"
                        checked={newDias.includes(d)}
                        onChange={() => toggleDia(d)}
                      />
                      {DIAS_LABELS[d]}
                    </label>
                  ))}
                </div>
                <p className="hint">(ninguno seleccionado = todos los días)</p>
              </div>
              <div className="form-row">
                <label>
                  Desde fila
                  <input
                    type="number"
                    min={1}
                    value={newDesde}
                    onChange={(e) => setNewDesde(Number(e.target.value) || 1)}
                    className="num-input"
                  />
                </label>
              </div>
              <button
                type="button"
                className="btn primary"
                disabled={submitting}
                onClick={() => void handleCrearSchedule()}
              >
                {submitting ? "Creando…" : "Programar envío"}
              </button>
            </div>
          </section>

          {/* ── Historial ────────────────────────────────── */}
          <section className="card">
            <h2>Historial de ejecuciones</h2>
            {!schLoading && scheduleHistory.length === 0 && (
              <p className="muted">Sin ejecuciones registradas todavía.</p>
            )}
            {scheduleHistory.length > 0 && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Hora prog.</th>
                      <th>Ejecutado</th>
                      <th>Estado</th>
                      <th>Job ID</th>
                      <th>Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...scheduleHistory].reverse().slice(0, 100).map((h) => (
                      <tr
                        key={h.id}
                        className={
                          h.estado === "completado"
                            ? "row-ok"
                            : h.estado === "error"
                              ? "row-err"
                              : ""
                        }
                      >
                        <td>{h.hora_programada}</td>
                        <td>{new Date(h.ejecutado_en).toLocaleString("es-CO")}</td>
                        <td>
                          <span className={`tag ${badgeClass(h.estado)}`}>{h.estado}</span>
                        </td>
                        <td className="mono">{h.job_id || "—"}</td>
                        <td className="detalle">{h.detalle || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
