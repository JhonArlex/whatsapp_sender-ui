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

interface VerifyModal {
  open: boolean;
  title: string;
  message: string;
  type: "success" | "error" | "info";
}

interface EditingConnection {
  id: string;
  name: string;
  base_url: string;
  api_key: string;
}

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");

  const [editing, setEditing] = useState<EditingConnection | null>(null);

  const [verifyModal, setVerifyModal] = useState<VerifyModal>({
    open: false,
    title: "",
    message: "",
    type: "info",
  });

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

  const startEditing = (conn: Connection) => {
    setEditing({
      id: conn.id,
      name: conn.name,
      base_url: conn.base_url,
      api_key: "",
    });
    setShowForm(false);
  };

  const cancelEditing = () => {
    setEditing(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;

    try {
      const data: { name?: string; base_url?: string; api_key?: string } = {};
      if (editing.name.trim()) data.name = editing.name.trim();
      if (editing.base_url.trim()) data.base_url = editing.base_url.trim();
      if (editing.api_key.trim()) data.api_key = editing.api_key.trim();

      await connectionsApi.update(editing.id, data);
      setEditing(null);
      loadConnections();
    } catch (err: any) {
      setVerifyModal({
        open: true,
        title: "Error al actualizar",
        message: err.response?.data?.detail || "Error al guardar los cambios",
        type: "error",
      });
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
      const data = res.data;
      if (data.ok) {
        setVerifyModal({
          open: true,
          title: "✅ Verificación exitosa",
          message: data.message || "Conexión verificada correctamente",
          type: "success",
        });
      } else {
        setVerifyModal({
          open: true,
          title: "❌ Error de conexión",
          message: data.error || "No se pudo verificar la conexión",
          type: "error",
        });
      }
      loadConnections();
    } catch (err: any) {
      const detail = err.response?.data?.detail || "Error al conectar con el servidor";
      setVerifyModal({
        open: true,
        title: "❌ No se pudo conectar",
        message: detail,
        type: "error",
      });
    }
  };

  const closeVerifyModal = () => {
    setVerifyModal({ ...verifyModal, open: false });
  };

  if (loading)
    return <div className="p-8 text-center text-muted-foreground">Cargando...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Conexiones Evolution</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Gestiona tus servidores Evolution API
          </p>
        </div>
        <Button onClick={() => {
          setShowForm(!showForm);
          setEditing(null);
        }}>
          {showForm ? "Cancelar" : "Nueva conexión"}
        </Button>
      </div>

      {/* Formulario de NUEVA conexión */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nueva conexión</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                  {error}
                </p>
              )}
              <div className="space-y-4 md:grid md:gap-4 md:grid-cols-3 md:space-y-0">
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
              <Button type="submit" className="w-full sm:w-auto">Guardar conexión</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Formulario de EDICIÓN */}
      {editing && (
        <Card className="border-blue-300">
          <CardHeader>
            <CardTitle>Editar conexión</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-4 md:grid md:gap-4 md:grid-cols-3 md:space-y-0">
                <div>
                  <label className="text-sm font-medium">Nombre</label>
                  <Input
                    placeholder="Nombre"
                    value={editing.name}
                    onChange={(e) =>
                      setEditing({ ...editing, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">URL Evolution</label>
                  <Input
                    placeholder="https://..."
                    value={editing.base_url}
                    onChange={(e) =>
                      setEditing({ ...editing, base_url: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    API Key{" "}
                    <span className="text-xs text-muted-foreground">
                      (dejar vacío = no cambiar)
                    </span>
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••"
                    value={editing.api_key}
                    onChange={(e) =>
                      setEditing({ ...editing, api_key: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button type="submit">Guardar cambios</Button>
                <Button type="button" variant="outline" onClick={cancelEditing}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista de conexiones */}
      <div className="space-y-3">
        {connections.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No hay conexiones. Agrega tu primer servidor Evolution.
          </p>
        )}

        {connections.map((conn) => (
          <Card key={conn.id}>
            <CardContent className="p-3 md:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm md:text-base">{conn.name}</span>
                    <Badge
                      className={conn.is_active ? "bg-green-500" : "bg-gray-400"}
                    >
                      {conn.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground break-all">{conn.base_url}</p>
                  {conn.last_verified_at && (
                    <p className="text-[11px] md:text-xs text-muted-foreground">
                      Última verificación:{" "}
                      {new Date(conn.last_verified_at).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap shrink-0">
                  <Button variant="outline" size="sm" onClick={() => startEditing(conn)}>
                    Editar
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => handleVerify(conn.id)}>
                    Verificar
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(conn.id)}>
                    Eliminar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal de verificación */}
      {verifyModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-auto max-h-[80vh] overflow-y-auto">
            <div className="p-4 md:p-6">
              <h3
                className={`text-base md:text-lg font-bold mb-3 ${
                  verifyModal.type === "error"
                    ? "text-red-700"
                    : verifyModal.type === "success"
                    ? "text-green-700"
                    : "text-blue-700"
                }`}
              >
                {verifyModal.title}
              </h3>

              <div className="text-xs md:text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                {verifyModal.message}
              </div>

              <div className="mt-6 flex justify-end">
                <Button onClick={closeVerifyModal}>Cerrar</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
