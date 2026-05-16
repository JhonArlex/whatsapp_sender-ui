import { useEffect, useState } from "react";
import { statsApi } from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

interface Overview {
  total_jobs: number;
  running_jobs: number;
  total_sent: number;
  total_failed: number;
  total_groups_cached: number;
  connections_count: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    statsApi
      .overview()
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Cargando...</div>;

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
        <p className="text-sm md:text-base text-muted-foreground">Resumen de tu sistema de envíos</p>
      </div>

      <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-1 md:pb-2 px-3 md:px-6 pt-3 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium">Conexiones Evolution</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <div className="text-xl md:text-2xl font-bold">{data?.connections_count ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 md:pb-2 px-3 md:px-6 pt-3 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium">Grupos en caché</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <div className="text-xl md:text-2xl font-bold">{data?.total_groups_cached ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="col-span-2 md:col-span-1">
          <CardHeader className="pb-1 md:pb-2 px-3 md:px-6 pt-3 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium">Jobs totales</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <div className="text-xl md:text-2xl font-bold">{data?.total_jobs ?? 0}</div>
            {data && data.running_jobs > 0 && (
              <Badge className="mt-1 bg-yellow-500 text-xs">
                {data.running_jobs} en ejecución
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 md:pb-2 px-3 md:px-6 pt-3 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium">Mensajes enviados</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <div className="text-xl md:text-2xl font-bold text-green-600">{data?.total_sent ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 md:pb-2 px-3 md:px-6 pt-3 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium">Mensajes fallidos</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <div className="text-xl md:text-2xl font-bold text-red-600">{data?.total_failed ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 md:pb-2 px-3 md:px-6 pt-3 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium">Tasa de éxito</CardTitle>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
            <div className="text-xl md:text-2xl font-bold">
              {data && (data.total_sent + data.total_failed) > 0
                ? `${Math.round((data.total_sent / (data.total_sent + data.total_failed)) * 100)}%`
                : "—"}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
