import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { jobsApi } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
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
  deleted_at: string | null;
  is_deleted: boolean;
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

function statusIcon(status: string): string {
  switch (status) {
    case "pending": return "⏳";
    case "running": return "🔄";
    case "completed": return "✅";
    case "completed_with_errors": return "⚠️";
    case "cancelled": return "🚫";
    case "error": return "❌";
    default: return "❓";
  }
}

const TERMINAL = ["completed", "completed_with_errors", "cancelled", "error"];

function fmt(dt: string | null) {
  return dt ? new Date(dt).toLocaleString() : "—";
}

export default function JobsPage() {
  const [tab, setTab] = useState<"active" | "history">("active");
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDays, setBulkDays] = useState(0);
  const [notice, setNotice] = useState("");
  const limit = 20;

  const load = (opts?: { tab?: "active" | "history"; status?: string; page?: number }) => {
    const nextTab = opts?.tab ?? tab;
    const nextStatus = opts?.status ?? statusFilter;
    const nextPage = opts?.page ?? page;
    setLoading(true);
    jobsApi
      .list({
        view: nextTab === "history" ? "history" : "active",
        status: nextStatus || undefined,
        page: nextPage,
        limit,
      })
      .then((res) => {
        setJobs(res.data.jobs);
        setTotal(res.data.total);
      })
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load({ tab, status: statusFilter, page });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, statusFilter, page]);

  const handleFilter = (status: string) => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleDelete = async (job: JobRow) => {
    if (!window.confirm(`¿Enviar "${job.name || job.id.slice(0, 8)}" al historial?\n\nNo se borra nada: el job y su detalle quedan disponibles en la pestaña Historial y puedes restaurarlo.`)) {
      return;
    }
    setBusyId(job.id);
    try {
      await jobsApi.remove(job.id, "eliminado desde la lista");
      setNotice("Job enviado al historial");
      load();
    } catch (err: any) {
      window.alert(err.response?.data?.detail || "No se pudo eliminar el job");
    } finally {
      setBusyId(null);
    }
  };

  const handleRestore = async (job: JobRow) => {
    setBusyId(job.id);
    try {
      await jobsApi.restore(job.id);
      setNotice("Job restaurado");
      load();
    } catch (err: any) {
      window.alert(err.response?.data?.detail || "No se pudo restaurar el job");
    } finally {
      setBusyId(null);
    }
  };

  const handleBulkArchive = async () => {
    const label = bulkDays > 0 ? `con más de ${bulkDays} día(s)` : "todos";
    if (!window.confirm(`Se enviarán al historial los jobs ya ejecutados ${label}.\n\nEs un borrado lógico: podrás verlos y restaurarlos desde la pestaña Historial.`)) {
      return;
    }
    try {
      const res = await jobsApi.archiveFinished({ older_than_days: bulkDays });
      setNotice(res.data.message || "Jobs archivados");
      setBulkOpen(false);
      setTab("active");
      setPage(1);
      load({ tab: "active", page: 1 });
    } catch (err: any) {
      window.alert(err.response?.data?.detail || "No se pudo archivar");
    }
  };

  const canDelete = (j: JobRow) => !j.is_deleted && TERMINAL.includes(j.status);
  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-3xl font-bold">Jobs</h1>
          <p className="text-muted-foreground">Envíos masivos creados</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/schedules">
            <Button variant="outline">⏰ Programaciones</Button>
          </Link>
          <Button variant="outline" onClick={() => setBulkOpen((v) => !v)}>
            🗂️ Limpiar ejecutados
          </Button>
          <Link to="/jobs/new">
            <Button>Nuevo job</Button>
          </Link>
        </div>
      </div>

      {/* Tabs Activos / Historial */}
      <div className="flex gap-2 border-b">
        {(
          [
            { key: "active", label: "Jobs" },
            { key: "history", label: "Historial" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setPage(1);
              setStatusFilter("");
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {notice && (
        <div className="rounded-md bg-green-50 text-green-700 border border-green-200 px-3 py-2 text-sm flex items-center justify-between gap-2">
          <span>{notice}</span>
          <button className="text-xs underline" onClick={() => setNotice("")}>
            cerrar
          </button>
        </div>
      )}

      {bulkOpen && (
        <Card className="border-blue-300">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium">Archivar jobs ya ejecutados (borrado lógico)</p>
            <p className="text-xs text-muted-foreground">
              Los jobs pasan a la pestaña Historial. No se elimina nada de la base de datos y
              puedes restaurarlos cuando quieras.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm">
                Antigüedad:
                <select
                  value={bulkDays}
                  onChange={(e) => setBulkDays(Number(e.target.value))}
                  className="ml-2 rounded-md border border-input bg-background px-2 py-1 text-sm"
                >
                  <option value={0}>Todos</option>
                  <option value={1}>Más de 1 día</option>
                  <option value={7}>Más de 7 días</option>
                  <option value={30}>Más de 30 días</option>
                </select>
              </label>
              <Button size="sm" onClick={handleBulkArchive}>
                Archivar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setBulkOpen(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {["", ...TERMINAL, "pending", "running"].map((s) => (
          <Button
            key={s || "all"}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilter(s)}
          >
            {s === "" ? "Todos" : s.replace(/_/g, " ")}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Cargando...</p>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {tab === "history"
              ? "El historial está vacío. Los jobs que elimines aparecerán aquí."
              : "No hay jobs. Crea tu primer envío masivo."}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── Desktop: tabla ── */}
          <div className="hidden md:block rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left font-medium">Nombre</th>
                  <th className="p-3 text-left font-medium">Estado</th>
                  <th className="p-3 text-left font-medium">Progreso</th>
                  <th className="p-3 text-left font-medium">Éxitos</th>
                  <th className="p-3 text-left font-medium">Fallos</th>
                  <th className="p-3 text-left font-medium">
                    {tab === "history" ? "Archivado" : "Creado"}
                  </th>
                  <th className="p-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-medium">
                      <Link to={`/jobs/${j.id}`} className="hover:underline">
                        {j.name || j.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="p-3">{statusBadge(j.status)}</td>
                    <td className="p-3">
                      {j.total_groups > 0 ? `${j.processed_groups}/${j.total_groups}` : "—"}
                    </td>
                    <td className="p-3 text-green-600">{j.success_count}</td>
                    <td className="p-3 text-red-600">{j.fail_count}</td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {fmt(tab === "history" ? j.deleted_at : j.created_at)}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <Link to={`/jobs/${j.id}`}>
                        <Button variant="ghost" size="sm">Ver</Button>
                      </Link>
                      {tab === "history" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busyId === j.id}
                          onClick={() => handleRestore(j)}
                        >
                          Restaurar
                        </Button>
                      ) : canDelete(j) ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          disabled={busyId === j.id}
                          onClick={() => handleDelete(j)}
                        >
                          🗑️ Eliminar
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile: cards ── */}
          <div className="md:hidden space-y-3">
            {jobs.map((j) => (
              <Card key={j.id}>
                <CardContent className="p-4 space-y-2">
                  <Link to={`/jobs/${j.id}`} className="block">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm truncate">
                        {j.name || j.id.slice(0, 8)}
                      </span>
                      <span className="text-lg shrink-0">{statusIcon(j.status)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs mt-1">
                      {statusBadge(j.status)}
                      {j.total_groups > 0 && (
                        <span className="text-muted-foreground">
                          {j.processed_groups}/{j.total_groups} grupos
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4 text-xs mt-1">
                      <span className="text-green-600">✅ {j.success_count}</span>
                      <span className="text-red-600">❌ {j.fail_count}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {tab === "history"
                        ? `Archivado: ${fmt(j.deleted_at)}`
                        : fmt(j.created_at)}
                    </p>
                  </Link>
                  <div className="flex gap-2 pt-1">
                    {tab === "history" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={busyId === j.id}
                        onClick={() => handleRestore(j)}
                      >
                        Restaurar
                      </Button>
                    ) : canDelete(j) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-red-600"
                        disabled={busyId === j.id}
                        onClick={() => handleDelete(j)}
                      >
                        🗑️ Eliminar
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Paginación */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 text-sm">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Anterior
              </Button>
              <span className="text-muted-foreground">
                Página {page} de {pages} · {total} jobs
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente →
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
