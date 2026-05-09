import { useEffect, useState } from "react";
import { templatesApi } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

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
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
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

  const resetForm = () => {
    setName("");
    setContent("");
    setError("");
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (t: Template) => {
    setName(t.name);
    setContent(t.content);
    setEditingId(t.id);
    setError("");
    setShowForm(true);
  };

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
      resetForm();
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Error al guardar");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar la plantilla "${name}"?`)) return;
    try {
      await templatesApi.delete(id);
      load();
    } catch {}
  };

  const handleUse = (t: Template) => {
    // Copiar al portapapeles o navegar al job con la plantilla pre-seleccionada
    navigator.clipboard.writeText(t.content).then(() => {
      alert(`✅ Contenido de "${t.name}" copiado al portapapeles`);
    }).catch(() => {});
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Plantillas de mensajes</h1>
          <p className="text-muted-foreground">
            Crea y gestiona plantillas para usar en tus envíos masivos
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(!showForm); }}>
          {showForm ? "Cancelar" : "Nueva plantilla"}
        </Button>
      </div>

      {/* Formulario */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Editar plantilla" : "Nueva plantilla"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</p>}
              <div className="space-y-2">
                <Label htmlFor="templateName">Nombre de la plantilla</Label>
                <Input
                  id="templateName"
                  placeholder="Ej: Promoción mayo, Saludo mañana, Recordatorio..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="templateContent">Contenido del mensaje</Label>
                <textarea
                  id="templateContent"
                  className="flex min-h-[150px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                  placeholder="Escribe el mensaje que se enviará..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Placeholders disponibles: {"{nombre}"}, {"{grupo}"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="submit">
                  {editingId ? "Guardar cambios" : "Crear plantilla"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista */}
      {templates.length === 0 && !showForm && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-lg mb-2">No hay plantillas</p>
            <p>Crea tu primera plantilla de mensaje para usarla en los envíos</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((t) => (
          <Card key={t.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t.name}</CardTitle>
                <Badge>{t.msg_type}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-4">
                {t.content}
              </p>
              {t.updated_at && (
                <p className="text-xs text-muted-foreground">
                  Última modificación: {new Date(t.updated_at).toLocaleString()}
                </p>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => startEdit(t)}>
                  Editar
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleUse(t)}>
                  Copiar
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(t.id, t.name)}>
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
