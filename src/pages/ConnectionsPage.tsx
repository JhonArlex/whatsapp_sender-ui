import { useEffect, useState } from "react";
import { connectionsApi } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

interface Connection {
  id: string;
  name: string;
  base_url: string;
  has_api_key: boolean;
  is_active: boolean;
  last_verified_at: string | null;
  created_at: string | null;
}

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");

  const loadConnections = () => {
    connectionsApi
      .list()
      .then((res) => setConnections(res.data.connections))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadConnections();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await connectionsApi.create({ name, base_url: baseUrl, api_key: apiKey });
      setName("");
      setBaseUrl("");
      setApiKey("");
      setShowForm(false);
      loadConnections();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Error al crear conexión");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta conexión?")) return;
    try {
      await connectionsApi.delete(id);
      loadConnections();
    } catch {}
  };

  const handleVerify = async (id: string) => {
    try {
      const res = await connectionsApi.verify(id);
      if (res.data.ok) {
        alert("✅ Conexión verificada correctamente");
      } else {
        alert(`❌ ${res.data.error}`);
      }
      loadConnections();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al verificar");
    }
  };

  if (loading) return <div className="p-8 text-center">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Conexiones Evolution</h1>
          <p className="text-muted-foreground">Gestiona tus servidores Evolution API</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancelar" : "Nueva conexión"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nueva conexión</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium">Nombre</label>
                  <Input
                    placeholder="Ej: Producción"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">URL Evolution</label>
                  <Input
                    placeholder="https://whatsapp-api.tudominio.com"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">API Key Global</label>
                  <Input
                    type="password"
                    placeholder="••••••"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit">Guardar conexión</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {connections.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No hay conexiones. Agrega tu primer servidor Evolution.
          </p>
        )}
        {connections.map((conn) => (
          <Card key={conn.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{conn.name}</span>
                  <Badge className={conn.is_active ? "bg-green-500" : "bg-gray-400"}>
                    {conn.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{conn.base_url}</p>
                {conn.last_verified_at && (
                  <p className="text-xs text-muted-foreground">
                    Última verificación: {new Date(conn.last_verified_at).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleVerify(conn.id)}>
                  Verificar
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(conn.id)}>
                  Eliminar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
