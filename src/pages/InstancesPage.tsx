import { useEffect, useState } from "react";
import { instancesApi } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

interface Instance {
  id: string;
  connection_name: string;
  base_url: string;
  instance_name: string;
  status: string;
  owner_jid: string;
  profile_name: string;
  has_token: boolean;
  synced_at: string | null;
}

function statusColor(status: string) {
  switch (status) {
    case "open":
      return "bg-green-500";
    case "close":
    case "closed":
      return "bg-red-500";
    case "connecting":
      return "bg-yellow-500";
    default:
      return "bg-gray-400";
  }
}

export default function InstancesPage() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = () => {
    instancesApi
      .list()
      .then((res) => setInstances(res.data.instances))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await instancesApi.sync();
      load();
    } catch {}
    setSyncing(false);
  };

  if (loading) return <div className="p-8 text-center">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Instancias</h1>
          <p className="text-muted-foreground">Instancias de WhatsApp conectadas vía Evolution</p>
        </div>
        <Button onClick={handleSync} disabled={syncing}>
          {syncing ? "Sincronizando..." : "Sincronizar"}
        </Button>
      </div>

      {instances.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay instancias. Sincroniza para obtenerlas desde Evolution.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {instances.map((inst) => (
          <Card key={inst.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{inst.instance_name}</CardTitle>
                <Badge className={statusColor(inst.status)}>
                  {inst.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Conexión:</span> {inst.connection_name}
              </p>
              <p>
                <span className="text-muted-foreground">Perfil:</span> {inst.profile_name || "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Owner:</span> {inst.owner_jid || "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Token:</span>{" "}
                {inst.has_token ? "✅" : "❌"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
