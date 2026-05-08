import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { jobsApi } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

interface JobRow {
  id: string;
  name: string;
  status: string;
  total_groups: number;
  processed_groups: number;
  success_count: number;
  fail_count: number;
  created_at: string | null;
  finished_at: string | null;
}

function statusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge className="bg-gray-400">Pendiente</Badge>;
    case "running":
      return <Badge className="bg-blue-500">Ejecutando</Badge>;
    case "completed":
      return <Badge className="bg-green-500">Completado</Badge>;
    case "completed_with_errors":
      return <Badge className="bg-yellow-500">Completado con errores</Badge>;
    case "cancelled":
      return <Badge className="bg-gray-500">Cancelado</Badge>;
    case "error":
      return <Badge className="bg-red-500">Error</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const load = (status: string = "") => {
    setLoading(true);
    jobsApi
      .list({ status: status || undefined })
      .then((res) => setJobs(res.data.jobs))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleFilter = (status: string) => {
    setStatusFilter(status);
    load(status);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Jobs</h1>
          <p className="text-muted-foreground">Envíos masivos creados</p>
        </div>
        <Link to="/jobs/new">
          <Button>Nuevo job</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {["", "pending", "running", "completed", "completed_with_errors", "cancelled", "error"].map(
          (s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilter(s)}
            >
              {s === "" ? "Todos" : s}
            </Button>
          )
        )}
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Cargando...</p>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay jobs. Crea tu primer envío masivo.
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left font-medium">Nombre</th>
                <th className="p-3 text-left font-medium">Estado</th>
                <th className="p-3 text-left font-medium">Progreso</th>
                <th className="p-3 text-left font-medium">Éxitos</th>
                <th className="p-3 text-left font-medium">Fallos</th>
                <th className="p-3 text-left font-medium">Creado</th>
                <th className="p-3 text-left font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="border-b hover:bg-muted/50">
                  <td className="p-3 font-medium">{j.name || j.id.slice(0, 8)}</td>
                  <td className="p-3">{statusBadge(j.status)}</td>
                  <td className="p-3">
                    {j.total_groups > 0
                      ? `${j.processed_groups}/${j.total_groups}`
                      : "—"}
                  </td>
                  <td className="p-3 text-green-600">{j.success_count}</td>
                  <td className="p-3 text-red-600">{j.fail_count}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {j.created_at ? new Date(j.created_at).toLocaleString() : "—"}
                  </td>
                  <td className="p-3">
                    <Link to={`/jobs/${j.id}`}>
                      <Button variant="ghost" size="sm">
                        Ver
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
