import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { jobsApi, schedulesApi } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

interface JobDetail {
  id: string;
  name: string;
  status: string;
  total_groups: number;
  processed_groups: number;
  success_count: number;
  fail_count: number;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string | null;
  groups: Array<{
    id: string;
    remote_jid: string;
    push_name: string;
    instance_name: string;
    status: string;
    detail: string | null;
    sent_at: string | null;
  }>;
  messages: Array<{
    msg_type: string;
    content: string;
    file_name: string;
  }>;
}

function statusBadge(status: string): React.ReactNode {
  switch (status) {
    case "ok":
      return <Badge className="bg-green-500">OK</Badge>;
    case "sending":
      return <Badge className="bg-blue-500">Enviando</Badge>;
    case "error":
      return <Badge className="bg-red-500">Error</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

function statusColor(status: string): string {
  switch (status) {
    case "ok": return "bg-green-50 border-green-200";
    case "sending": return "bg-blue-50 border-blue-200";
    case "error": return "bg-red-50 border-red-200";
    default: return "";
  }
}

function statusDot(status: string): string {
  switch (status) {
    case "ok": return "🟢";
    case "sending": return "🔄";
    case "error": return "🔴";
    default: return "⚪";
  }
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleType, setScheduleType] = useState("once");
  const [runDate, setRunDate] = useState("");
  const [runTime, setRunTime] = useState("");
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>([]);
  const [intervalMin, setIntervalMin] = useState(60);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleResult, setScheduleResult] = useState("");
  const [schedules, setSchedules] = useState<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const loadSchedules = async () => {
    if (!id) return;
    try {
      const res = await schedulesApi.list();
      setSchedules(res.data.schedules.filter((s: any) => s.job_id === id));
    } catch {}
  };

  const fetchJob = () => {
    if (!id) return;
    jobsApi
      .get(id)
      .then((res) => setJob(res.data))
      .catch((err) => setError(err.response?.data?.detail || "Error al cargar job"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchJob();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (showSchedule && id) {
      (async () => { await loadSchedules(); })();
    }
  }, [showSchedule, id]);

  // WebSocket para progreso en vivo
  useEffect(() => {
    if (!id || job?.status !== "running") return;

    const apiUrl = import.meta.env.VITE_BULK_API_URL || "http://localhost:8010";
    const wsUrl = apiUrl.replace(/^http/, "ws") + `/ws/jobs/${id}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "progress" || msg.type === "group_update" || msg.type === "completed") {
          fetchJob();
        }
      } catch {}
    };

    ws.onopen = () => {
      const ping = setInterval(() => ws.send("ping"), 30000);
      ws.addEventListener("close", () => clearInterval(ping));
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, job?.status]);

  const handleCancel = async () => {
    if (!id) return;
    try {
      await jobsApi.cancel(id);
      fetchJob();
    } catch {}
  };

  const handleRetry = async () => {
    if (!id) return;
    try {
      const res = await jobsApi.retryFailed(id);
      if (res.data.ok && res.data.job) {
        window.location.href = `/jobs/${res.data.job.id}`;
      }
    } catch {}
  };

  if (loading) return <div className="p-8 text-center">Cargando...</div>;
  if (error)
    return (
      <div className="p-8">
        <p className="text-red-600">{error}</p>
        <Link to="/jobs">
          <Button variant="outline" className="mt-4">
            Volver a jobs
          </Button>
        </Link>
      </div>
    );
  if (!job) return null;

  const pct =
    job.total_groups > 0 ? Math.round((job.processed_groups / job.total_groups) * 100) : 0;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link to="/jobs" className="text-sm text-primary hover:underline">
              ← Jobs
            </Link>
          </div>
          <h1 className="text-xl md:text-2xl font-bold mt-1 break-words">
            {job.name || job.id.slice(0, 8)}
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground font-mono break-all">
            ID: {job.id}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap shrink-0">
          {job.status === "running" && (
            <Button variant="destructive" onClick={handleCancel}>
              Cancelar
            </Button>
          )}
          {(job.status === "completed_with_errors" || job.status === "error") && (
            <Button variant="outline" onClick={handleRetry}>
              Reintentar fallidos
            </Button>
          )}
          <Button variant="secondary" onClick={() => setShowSchedule(!showSchedule)}>
            {showSchedule ? "Cerrar" : "⏰ Programar"}
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      {job.status === "running" && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>
              Procesando: {job.processed_groups}/{job.total_groups}
            </span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-1 md:pb-2 px-3 md:px-6 pt-3 md:pt-6">
            <CardTitle className="text-xs md:text-sm">Estado</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <Badge>{job.status}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 md:pb-2 px-3 md:px-6 pt-3 md:pt-6">
            <CardTitle className="text-xs md:text-sm">Total grupos</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <div className="text-xl md:text-2xl font-bold">{job.total_groups}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 md:pb-2 px-3 md:px-6 pt-3 md:pt-6">
            <CardTitle className="text-xs md:text-sm text-green-600">Éxitos</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <div className="text-xl md:text-2xl font-bold text-green-600">{job.success_count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 md:pb-2 px-3 md:px-6 pt-3 md:pt-6">
            <CardTitle className="text-xs md:text-sm text-red-600">Fallos</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <div className="text-xl md:text-2xl font-bold text-red-600">{job.fail_count}</div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Section */}
      {showSchedule && (
        <Card className="border-blue-300">
          <CardHeader>
            <CardTitle>⏰ Programar este Job</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Tipo de programación</label>
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

            {scheduleType === "once" && (
              <div>
                <label className="text-sm font-medium block mb-1">Fecha y hora</label>
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
                <label className="text-sm font-medium block mb-1">Hora</label>
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
                <label className="text-sm font-medium block mb-1">Días de la semana</label>
                <div className="flex flex-wrap gap-1">
                  {[
                    { value: "lun", label: "Lun" },
                    { value: "mar", label: "Mar" },
                    { value: "mie", label: "Mié" },
                    { value: "jue", label: "Jue" },
                    { value: "vie", label: "Vie" },
                    { value: "sab", label: "Sáb" },
                    { value: "dom", label: "Dom" },
                  ].map((d) => (
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
                <label className="text-sm font-medium block mb-1">
                  Cada <input type="number" value={intervalMin} onChange={(e) => setIntervalMin(Number(e.target.value))} className="w-20 inline-block rounded border px-2 py-1 text-sm" /> minutos
                </label>
              </div>
            )}

            {scheduleResult && (
              <p className={`text-sm rounded p-2 ${
                scheduleResult.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
              }`}>{scheduleResult}</p>
            )}

            <Button
              onClick={async () => {
                setScheduleSaving(true);
                setScheduleResult("");
                try {
                  const data: any = { job_id: job.id, schedule_type: scheduleType };
                  if (scheduleType === "once") data.run_date = new Date(runDate).toISOString();
                  if (scheduleType === "daily" || scheduleType === "weekly") data.run_time = runTime;
                  if (scheduleType === "weekly") data.days_of_week = daysOfWeek;
                  if (scheduleType === "interval") data.interval_minutes = intervalMin;
                  await schedulesApi.create(data);
                  setScheduleResult("✅ Job programado correctamente");
                  setShowSchedule(false);
                } catch (err: any) {
                  setScheduleResult(err.response?.data?.detail || "Error al programar");
                } finally {
                  setScheduleSaving(false);
                }
              }}
              disabled={scheduleSaving}
            >
              {scheduleSaving ? "Guardando..." : "Programar Job"}
            </Button>

            {/* Show existing schedules */}
            {schedules.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium mb-2">Programaciones activas:</p>
                {schedules.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between text-sm bg-muted rounded p-2 mb-1 gap-2">
                    <span className="text-xs md:text-sm">
                      {s.schedule_type === "once" && s.run_date ? new Date(s.run_date).toLocaleString() : ""}
                      {s.schedule_type === "daily" && s.run_time ? `Diario a las ${s.run_time}` : ""}
                      {s.schedule_type === "weekly" && s.run_time ? `Semanal ${(s.days_of_week || []).join(", ")} a las ${s.run_time}` : ""}
                      {s.schedule_type === "interval" ? `Cada ${s.interval_minutes} min` : ""}
                    </span>
                    <button
                      onClick={async () => {
                        await schedulesApi.delete(s.id);
                        setSchedules((prev: any[]) => prev.filter((x: any) => x.id !== s.id));
                      }}
                      className="text-red-500 hover:underline text-xs shrink-0"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Group results */}
      <Card>
        <CardHeader>
          <CardTitle>Resultados por grupo</CardTitle>
        </CardHeader>
        <CardContent>
          {job.groups.length === 0 ? (
            <p className="text-muted-foreground">Sin grupos</p>
          ) : (
            <>
              {/* ── Desktop: tabla ── */}
              <div className="hidden md:block rounded-md border max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-2 text-left">Grupo</th>
                      <th className="p-2 text-left">Instancia</th>
                      <th className="p-2 text-left">Estado</th>
                      <th className="p-2 text-left">Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {job.groups.map((g) => (
                      <tr key={g.id} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{g.push_name || g.remote_jid}</td>
                        <td className="p-2 text-muted-foreground">{g.instance_name}</td>
                        <td className="p-2">{statusBadge(g.status)}</td>
                        <td className="p-2 text-xs text-muted-foreground max-w-[200px] truncate">
                          {g.detail || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Mobile: cards ── */}
              <div className="md:hidden space-y-2">
                {job.groups.map((g) => (
                  <div
                    key={g.id}
                    className={`rounded-lg border p-3 ${statusColor(g.status)}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {g.push_name || g.remote_jid}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          📱 {g.instance_name}
                        </p>
                      </div>
                      <span className="text-lg shrink-0">{statusDot(g.status)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      {statusBadge(g.status)}
                      {g.detail && (
                        <span className="text-[11px] text-muted-foreground truncate">
                          {g.detail}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
