import { useEffect, useState, useRef } from "react";
import { templatesApi } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

const API_URL = import.meta.env.VITE_BULK_API_URL || "http://localhost:8010";

interface Template {
  id: string;
  name: string;
  msg_type: string;
  content: string;
  media_url: string;
  media_type: string;
  created_at: string | null;
  updated_at: string | null;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [msgType, setMsgType] = useState("text");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaPreview, setMediaPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

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

  // ── Modal helpers ──────────────────────────────────────────────

  const openCreate = () => {
    setEditingId(null);
    setName("");
    setContent("");
    setMsgType("text");
    setMediaUrl("");
    setMediaPreview("");
    setError("");
    setModal("create");
  };

  const openEdit = (t: Template) => {
    setEditingId(t.id);
    setName(t.name);
    setContent(t.content);
    setMsgType(t.msg_type || "text");
    setMediaUrl(t.media_url || "");
    setMediaPreview(t.media_url ? `${API_URL}${t.media_url}` : "");
    setError("");
    setModal("edit");
  };

  const closeModal = () => {
    setModal(null);
    setEditingId(null);
  };

  // ── File upload ────────────────────────────────────────────────

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    setMediaPreview(URL.createObjectURL(file));
    setMsgType("image");

    setUploading(true);
    try {
      const res = await templatesApi.uploadMedia(file);
      setMediaUrl(res.data.url);
      setMsgType("image");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Error al subir imagen");
      setMediaPreview("");
    } finally {
      setUploading(false);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !content.trim()) {
      setError("Nombre y contenido son requeridos");
      return;
    }

    const payload: any = {
      name: name.trim(),
      content: content.trim(),
      msg_type: msgType,
    };
    if (mediaUrl) {
      payload.media_url = mediaUrl;
      payload.media_type = msgType === "image" ? "image" : "";
    }

    try {
      if (editingId) {
        await templatesApi.update(editingId, payload);
      } else {
        await templatesApi.create(payload);
      }
      closeModal();
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Error al guardar");
    }
  };

  // ── Delete ─────────────────────────────────────────────────────

  const handleDelete = async (id: string, tname: string) => {
    if (!confirm(`¿Eliminar la plantilla "${tname}"?`)) return;
    try {
      await templatesApi.delete(id);
      load();
    } catch {}
  };

  // ── Render ─────────────────────────────────────────────────────

  if (loading) return <div className="p-8 text-center text-muted-foreground">Cargando...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Plantillas de mensajes</h1>
          <p className="text-muted-foreground">Crea plantillas con texto e imágenes para usar en los envíos</p>
        </div>
        <Button onClick={openCreate}>Nueva plantilla</Button>
      </div>

      {/* Empty state */}
      {templates.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-lg mb-2">No hay plantillas</p>
            <p>Crea tu primera plantilla de mensaje</p>
          </CardContent>
        </Card>
      )}

      {/* Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((t) => (
          <Card key={t.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                {t.name}
                <span className="text-xs text-muted-foreground font-normal">
                  {t.msg_type === "image" ? "🖼️" : t.msg_type === "link" ? "🔗" : "💬"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* Media preview */}
              {t.media_url && (
                <div className="rounded-md overflow-hidden bg-muted">
                  <img
                    src={`${API_URL}${t.media_url}`}
                    alt=""
                    className="w-full h-32 object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}
              <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-3">
                {t.content}
              </p>
              {t.updated_at && (
                <p className="text-xs text-muted-foreground">
                  Modificado: {new Date(t.updated_at).toLocaleString()}
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => openEdit(t)}>Editar</Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(t.id, t.name)}>Eliminar</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── MODAL ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                <h2 className="text-xl font-bold">
                  {editingId ? "Editar plantilla" : "Nueva plantilla"}
                </h2>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</p>
                )}

                {/* Name */}
                <div>
                  <label className="text-sm font-medium block mb-1">Nombre</label>
                  <Input
                    placeholder="Ej: Promo mayo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                {/* Message type selector */}
                <div>
                  <label className="text-sm font-medium block mb-1">Tipo de mensaje</label>
                  <div className="flex gap-2">
                    {[
                      { value: "text", label: "💬 Solo texto" },
                      { value: "image", label: "🖼️ Texto + imagen" },
                      { value: "link", label: "🔗 Texto + enlace" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setMsgType(opt.value)}
                        className={`px-3 py-2 rounded-md text-sm border transition-colors ${
                          msgType === opt.value
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background hover:bg-muted"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Image upload (visible when type is image) */}
                {msgType === "image" && (
                  <div>
                    <label className="text-sm font-medium block mb-1">Imagen</label>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleFileSelect}
                      className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    />
                    {uploading && <p className="text-xs text-muted-foreground mt-1">Subiendo...</p>}
                    {mediaPreview && (
                      <div className="mt-2 rounded-md overflow-hidden bg-muted">
                        <img src={mediaPreview} alt="Preview" className="w-full h-40 object-cover" />
                      </div>
                    )}
                  </div>
                )}

                {/* Link URL (visible when type is link) */}
                {msgType === "link" && (
                  <div>
                    <label className="text-sm font-medium block mb-1">URL del enlace</label>
                    <Input
                      placeholder="https://ejemplo.com/oferta"
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                    />
                  </div>
                )}

                {/* Content */}
                <div>
                  <label className="text-sm font-medium block mb-1">Contenido del mensaje</label>
                  <textarea
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                    placeholder="Escribe el mensaje..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Placeholders: {"{nombre}"}, {"{grupo}"}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 pb-6 flex gap-2 justify-end border-t pt-4">
                <Button type="button" variant="outline" onClick={closeModal}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={uploading}>
                  {uploading ? "Subiendo..." : editingId ? "Guardar cambios" : "Crear plantilla"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
