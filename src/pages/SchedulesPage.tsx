import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { jobsApi, schedulesApi } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

interface Schedule {
  id: string;
  job_id: string;
  job_name: string;
  job_deleted: boolean;
  schedule_type: string;
  schedule_type_label: string;
  run_date: string | null;
  run_time: string | null;
  days_of_week: string[];
  interval_minutes: number;
  next_run: string | null;
  last_run: string | null;
  last_status: string | null;
  is_active: boolean;
  timezone: string;
  timezone_label: string;
  timezone_effective: string;
}

interface JobOption {
  id: string;
  name: string;
  status: string;
}

interface HistoryRow {
  id: string;
  job_id: string | null;
  job_name: string;
  schedule_type: string;
  hora_programada: string;
  ejecutado_en: string | null;
  finalizado_en: string | null;
  estado: string;
  detalle: string | null;
  timezone?: string;
  timezone_label?: string;
}

const DAYS = [
  { value: "lun", label: "Lun" },
  { value: "mar", label: "Mar" },
  { value: "mie", label: "Mié" },
  { value: "jue", label: "Jue" },
  { value: "vie", label: "Vie" },
  { value: "sab", label: "Sáb" },
  { value: "dom", label: "Dom" },
];

function fmt(dt: string | null, tz?: string) {
  if (!dt) return "—";
  try {
    return new Intl.DateTimeFormat("es-CO", {
      timeZone: tz || undefined,
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(dt));
  } catch {
    try {
      return new Date(dt).toLocaleString();
    } catch {
      return dt;
    }
  }
}

const TZ_FALLBACK = [
  { value: "America/Bogota", label: "Colombia (Bogotá)" },
  { value: "America/Santiago", label: "Chile (Santiago)" },
];

function describe(s: Schedule) {
  const tzName = s.timezone_label || s.timezone_effective || "";
  const hora = s.timezone_effective || s.timezone;
  switch (s.schedule_type) {
    case "once":
      return `Una vez · ${fmt(s.run_date || s.next_run, hora)}${tzName ? ` · hora ${tzName}` : ""}`;
    case "daily":
      return `Diario a las ${s.run_time || ""}${tzName ? ` · hora ${tzName}` : ""}`;
    case "weekly":
      return `Semanal ${(s.days_of_week || []).join(", ")} a las ${s.run_time || ""}${tzName ? ` · hora ${tzName}` : ""}`;
    case "interval":
      return `Cada ${s.interval_minutes} min`;
    default:
      return s.schedule_type;
  }
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Formulario
  const [jobId, setJobId] = useState("");
  const [scheduleType, setScheduleType] = useState("daily");
  const [runDate, setRunDate] = useState("");
  const [runTime, setRunTime] = useState("09:00");
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>(["lun", "mar", "mie", "jue", "vie"]);
  const [intervalMin, setIntervalMin] = useState(60);
  const [saving, setSaving] = useState(false);
  const [tzOptions, setTzOptions] = useState<{ value: string; label: string }[]>(TZ_FALLBACK);
  const [timezone, setTimezone] = useState("America/Bogota");

  const load = async () => {
    setLoading(true);
    try {
      const [schedRes, jobsRes, tzRes] = await Promise.all([
        schedulesApi.list(),
        jobsApi.list({ limit: 100 }),
        schedulesApi.timezones().catch(() => null),
      ]);
      if (tzRes?.data?.timezones?.length) {
        setTzOptions(tzRes.data.timezones);
        setTimezone((prev) => prev || tzRes.data.default || "America/Bogota");
      }
      setSchedules(schedRes.data.schedules || []);
      const activeJobs: JobOption[] = (jobsRes.data.jobs || []).filter(
        (j: JobOption) => j.status !== "running" && j.status !== "pending"
      );
      setJobs(activeJobs);
      if (!jobId && activeJobs.length > 0) setJobId(activeJobs[0].id);
    } catch (err: any) {
      setError(err.response?.data?.detail || "No se pudieron cargar las programaciones");
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await schedulesApi.history(50);
      setHistory(res.data.history || []);
    } catch {
      setHistory([]);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (showHistory) loadHistory();
  }, [showHistory]);

  const handleCreate = async () => {
    if (!jobId) {
      setError("Selecciona el job que se va a programar");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const data: any = { job_id: jobId, schedule_type: scheduleType, timezone };
      if (scheduleType === "once") {
        if (!runDate) throw new Error("Indica fecha y hora");
        // Se envía la hora "naive" (YYYY-MM-DDTHH:MM) para que el backend la
        // interprete en la zona horaria elegida, no en la del navegador.
        data.run_date = runDate.length === 16 ? `${runDate}:00` : runDate;
      }
      if (scheduleType === "daily" || scheduleType === "weekly") data.run_time = runTime;
      if (scheduleType === "weekly") {
        if (daysOfWeek.length === 0) throw new Error("Selecciona al menos un día");
        data.days_of_week = daysOfWeek;
      }
      if (scheduleType === "interval") data.interval_minutes = intervalMin;

      const res = await schedulesApi.create(data);
      setNotice(`Programación creada · próxima ejecución: ${fmt(res.data.next_run)}`);
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Error al programar");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (s: Schedule) => {
    setBusy(s.id);
    try {
      const res = await schedulesApi.toggle(s.id);
      setNotice(
        res.data.is_active
          ? `Programación activada · próxima ejecución: ${fmt(res.data.next_run)}`
          : "Programación pausada"
      );
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail || "No se pudo cambiar el estado");
    } finally {
      setBusy(null);
    }
  };

  const handleRunNow = async (s: Schedule) => {
    if (!window.confirm(`¿Ejecutar ahora "${s.job_name || s.job_id.slice(0, 8)}"?\n\nSe creará un job nuevo con los mismos grupos y mensajes.`)) return;
    setBusy(s.id);
    try {
      const res = await schedulesApi.runNow(s.id);
      setNotice(`Job ejecutado (${res.data.job?.id?.slice(0, 8)}…)`);
      load();
      if (showHistory) loadHistory();
    } catch (err: any) {
      setError(err.response?.data?.detail || "No se pudo ejecutar");
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (s: Schedule) => {
    if (!window.confirm("¿Eliminar esta programación?\n\nEl job original no se borra.")) return;
    setBusy(s.id);
    try {
      await schedulesApi.delete(s.id);
      setNotice("Programación eliminada");
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail || "No se pudo eliminar");
    } finally {
      setBusy(null);
    }
  };

  const activeCount = schedules.filter((s) => s.is_active).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-3xl font-bold">Programaciones</h1>
          <p className="text-muted-foreground">
            {activeCount} activa(s) · el scheduler revisa cada 30 segundos y ejecuta solo
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/jobs">
            <Button variant="outline">← Jobs</Button>
          </Link>
          <Button variant="outline" onClick={() => setShowHistory((v) => !v)}>
            🕘 Historial
          </Button>
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cerrar" : "Nueva programación"}
          </Button>
        </div>
      </div>

      {notice && (
        <div className="rounded-md bg-green-50 text-green-700 border border-green-200 px-3 py-2 text-sm flex items-center justify-between gap-2">
          <span>{notice}</span>
          <button className="text-xs underline" onClick={() => setNotice("")}>cerrar</button>
        </div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 text-red-700 border border-red-200 px-3 py-2 text-sm flex items-center justify-between gap-2">
          <span>{error}</span>
          <button className="text-xs underline" onClick={() => setError("")}>cerrar</button>
        </div>
      )}

      {showForm && (
        <Card className="border-blue-300">
          <CardHeader>
            <CardTitle>Nueva programación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Job a programar</label>
              <select
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Selecciona un job…</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.name || j.id.slice(0, 8)} ({j.status})
                  </option>
                ))}
              </select>
              {jobs.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  No hay jobs disponibles. Crea primero un job en{" "}
                  <Link to="/jobs/new" className="text-primary underline">Nuevo job</Link>.
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Tipo</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "once", label: "Una vez" },
                  { value: "daily", label: "Diario" },
                  { value: "weekly", label: "Semanal" },
                  { value: "interval", label: "Cada X min" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setScheduleType(opt.value)}
                    className={`px-3 py-2 rounded-md text-sm border transition-colors ${
                      scheduleType === opt.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {scheduleType !== "interval" && (
              <div>
                <label className="text-sm font-medium block mb-1">Zona horaria</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {tzOptions.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Las horas y fechas se interpretan en esta zona (ej. 09:00 en Chile ≠ 09:00 en
                  Colombia). El servidor las guarda en UTC y ajusta solo el horario de verano.
                </p>
              </div>
            )}

            {scheduleType === "once" && (
              <div>
                <label className="text-sm font-medium block mb-1">
                  Fecha y hora ({tzOptions.find((t) => t.value === timezone)?.label || timezone})
                </label>
                <input
                  type="datetime-local"
                  value={runDate}
                  onChange={(e) => setRunDate(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            )}

            {(scheduleType === "daily" || scheduleType === "weekly") && (
              <div>
                <label className="text-sm font-medium block mb-1">
                  Hora ({tzOptions.find((t) => t.value === timezone)?.label || timezone})
                </label>
                <input
                  type="time"
                  value={runTime}
                  onChange={(e) => setRunTime(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            )}

            {scheduleType === "weekly" && (
              <div>
                <label className="text-sm font-medium block mb-1">Días</label>
                <div className="flex flex-wrap gap-1">
                  {DAYS.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() =>
                        setDaysOfWeek((prev) =>
                          prev.includes(d.value)
                            ? prev.filter((x) => x !== d.value)
                            : [...prev, d.value]
                        )
                      }
                      className={`px-2 py-1 rounded text-xs border transition-colors ${
                        daysOfWeek.includes(d.value)
                          ? "bg-primary text-primary-foreground"
                          : "bg-background hover:bg-muted"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {scheduleType === "interval" && (
              <div>
                <label className="text-sm font-medium block mb-1">Cada</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={intervalMin}
                    onChange={(e) => setIntervalMin(Number(e.target.value))}
                    className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  <span className="text-sm">minutos</span>
                </div>
              </div>
            )}

            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Guardando…" : "Programar"}
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Cargando…</p>
      ) : schedules.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay programaciones. Crea una para que el envío se ejecute automáticamente.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {schedules.map((s) => (
            <Card key={s.id} className={s.is_active ? "border-green-300" : ""}>
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={s.is_active ? "bg-green-500" : "bg-gray-400"}>
                      {s.is_active ? "Activa" : "Pausada"}
                    </Badge>
                    <span className="font-medium text-sm truncate">
                      {s.job_name || s.job_id.slice(0, 8)}
                    </span>
                    {s.job_deleted && <Badge className="bg-yellow-500">job archivado</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{describe(s)}</p>
                  <p className="text-xs">
                    <span className="text-muted-foreground">Próxima: </span>
                    <span className="font-medium">
                      {fmt(s.next_run, s.timezone_effective || s.timezone)}
                    </span>
                    <span className="text-muted-foreground"> · Última: </span>
                    {fmt(s.last_run, s.timezone_effective || s.timezone)}
                    {s.last_status && (
                      <span className="text-muted-foreground"> ({s.last_status})</span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap shrink-0">
                  <Link to={`/jobs/${s.job_id}`}>
                    <Button variant="ghost" size="sm">Ver job</Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy === s.id}
                    onClick={() => handleToggle(s)}
                  >
                    {s.is_active ? "Pausar" : "Activar"}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy === s.id}
                    onClick={() => handleRunNow(s)}
                  >
                    ▶ Ejecutar ahora
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600"
                    disabled={busy === s.id}
                    onClick={() => handleDelete(s)}
                  >
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showHistory && (
        <Card>
          <CardHeader>
            <CardTitle>Historial de ejecuciones</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-muted-foreground text-sm">Sin ejecuciones registradas todavía.</p>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-2 text-left font-medium">Ejecutado</th>
                      <th className="p-2 text-left font-medium">Job</th>
                      <th className="p-2 text-left font-medium">Tipo</th>
                      <th className="p-2 text-left font-medium">Hora prog.</th>
                      <th className="p-2 text-left font-medium">Estado</th>
                      <th className="p-2 text-left font-medium">Finalizado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.id} className="border-b">
                        <td className="p-2 text-xs">{fmt(h.ejecutado_en, h.timezone)}</td>
                        <td className="p-2">
                          {h.job_id ? (
                            <Link to={`/jobs/${h.job_id}`} className="text-primary hover:underline">
                              {h.job_name || h.job_id.slice(0, 8)}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="p-2 text-xs">
                          {h.schedule_type}
                          {h.timezone_label ? ` · ${h.timezone_label}` : ""}
                        </td>
                        <td className="p-2 text-xs">{h.hora_programada}</td>
                        <td className="p-2">
                          <Badge
                            className={
                              h.estado === "ejecutando"
                                ? "bg-blue-500"
                                : h.estado === "completed"
                                ? "bg-green-500"
                                : h.estado === "error"
                                ? "bg-red-500"
                                : "bg-gray-400"
                            }
                          >
                            {h.estado}
                          </Badge>
                        </td>
                        <td className="p-2 text-xs">{fmt(h.finalizado_en, h.timezone)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
