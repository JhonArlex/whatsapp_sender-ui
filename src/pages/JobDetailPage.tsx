import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { jobsApi } from "../lib/api";
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

function statusColor(status: string): string {
  switch (status) {
    case "ok":
      return "bg-green-500";
    case "sending":
      return "bg-blue-500";
    case "error":
      return "bg-red-500";
    default:
      return "bg-gray-400";
  }
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

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
      // Keep alive
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
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/jobs" className="text-sm text-primary hover:underline">
              ← Jobs
            </Link>
          </div>
          <h1 className="text-2xl font-bold mt-1">{job.name || job.id.slice(0, 8)}</h1>
          <p className="text-sm text-muted-foreground font-mono">ID: {job.id}</p>
        </div>
        <div className="flex gap-2">
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
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge>{job.status}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total grupos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{job.total_groups}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-600">Éxitos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{job.success_count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-600">Fallos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{job.fail_count}</div>
          </CardContent>
        </Card>
      </div>

      {/* Group results */}
      <Card>
        <CardHeader>
          <CardTitle>Resultados por grupo</CardTitle>
        </CardHeader>
        <CardContent>
          {job.groups.length === 0 ? (
            <p className="text-muted-foreground">Sin grupos</p>
          ) : (
            <div className="rounded-md border max-h-96 overflow-y-auto">
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
                      <td className="p-2">
                        <Badge className={statusColor(g.status)}>{g.status}</Badge>
                      </td>
                      <td className="p-2 text-xs text-muted-foreground max-w-[200px] truncate">
                        {g.detail || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
