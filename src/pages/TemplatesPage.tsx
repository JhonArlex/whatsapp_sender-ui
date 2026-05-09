import { useEffect, useState } from "react";
import { templatesApi } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

interface Template {
  id: string;
  name: string;
  msg_type: string;
  content: string;
  created_at: string | null;
  updated_at: string | null;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = () => {
    templatesApi
      .list()
      .then((res) => setTemplates(res.data.templates))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !content.trim()) {
      setError("Nombre y contenido son requeridos");
      return;
    }
    try {
      if (editingId) {
        await templatesApi.update(editingId, { name: name.trim(), content: content.trim() });
      } else {
        await templatesApi.create({ name: name.trim(), content: content.trim() });
      }
      setName("");
      setContent("");
      setEditingId(null);
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Error al guardar");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}"?`)) return;
    try {
      await templatesApi.delete(id);
      load();
    } catch {}
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Plantillas de mensajes</h1>
          <p className="text-muted-foreground">Crea y gestiona plantillas para tus envíos</p>
        </div>
        <Button onClick={() => { setShowForm(!showForm); setEditingId(null); setName(""); setContent(""); }}>
          {showForm ? "Cancelar" : "Nueva plantilla"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Editar plantilla" : "Nueva plantilla"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div>
                <label className="text-sm font-medium">Nombre</label>
                <Input placeholder="Ej: Promo mayo" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <label className="text-sm font-medium">Contenido</label>
                <textarea
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                  placeholder="Escribe el mensaje..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">{editingId ? "Guardar" : "Crear"}</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); setName(""); setContent(""); }}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {templates.length === 0 && !showForm && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No hay plantillas. Crea tu primera plantilla.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((t) => (
          <Card key={t.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-4">{t.content}</p>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => {
                  setEditingId(t.id);
                  setName(t.name);
                  setContent(t.content);
                  setShowForm(true);
                }}>Editar</Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(t.id, t.name)}>Eliminar</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
