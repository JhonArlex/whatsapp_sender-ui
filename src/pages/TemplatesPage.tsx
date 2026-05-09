import { useEffect, useState, useRef } from "react";
import { templatesApi } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

const API_URL = import.meta.env.VITE_BULK_API_URL || "http://localhost:8010";
const MEDIA_BASE = API_URL + "/api/v1/message-templates/media";

interface Template {
  id: string;
  name: string;
  content: string;
  media_urls: string[];
  link_url: string;
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
  const [linkUrl, setLinkUrl] = useState("");

  // Multiple images
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  // ── Modal helpers ──────────────────────────────────────────────

  const openCreate = () => {
    setEditingId(null);
    setName("");
    setContent("");
    setLinkUrl("");
    setUploadedUrls([]);
    setPreviews([]);
    setError("");
    setModal("create");
  };

  const openEdit = (t: Template) => {
    setEditingId(t.id);
    setName(t.name);
    setContent(t.content);
    setLinkUrl(t.link_url || "");
    setUploadedUrls(t.media_urls || []);
    setPreviews((t.media_urls || []).map((u) => `${API_URL}${u}`));
    setError("");
    setModal("edit");
  };

  const closeModal = () => {
    setModal(null);
    setEditingId(null);
    // Limpiar object URLs
    previews.forEach((p) => {
      if (p.startsWith("blob:")) URL.revokeObjectURL(p);
    });
  };

  // ── Multi-file upload ──────────────────────────────────────────

  const handleFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Show local previews immediately
    const newPreviews: string[] = [];
    for (const f of Array.from(files)) {
      newPreviews.push(URL.createObjectURL(f));
    }
    setPreviews((prev) => [...prev, ...newPreviews]);

    // Upload each file
    setUploading(true);
    try {
      const res = await templatesApi.uploadMedia(Array.from(files));
      const newUrls = res.data.files.map((f: any) => f.url);
      setUploadedUrls((prev) => [...prev, ...newUrls]);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Error al subir imágenes");
      // Remove failed previews
      setPreviews((prev) => prev.slice(0, prev.length - Array.from(files).length));
    } finally {
      setUploading(false);
      // Reset file input so same files can be re-selected
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setUploadedUrls((prev) => prev.filter((_, i) => i !== index));
    const prevToRemove = previews[index];
    if (prevToRemove?.startsWith("blob:")) URL.revokeObjectURL(prevToRemove);
    setPreviews((prev) => prev.filter((_, i) => i !== index));
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
      media_urls: uploadedUrls,
      link_url: linkUrl.trim(),
    };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Plantillas de mensajes</h1>
          <p className="text-muted-foreground">Crea plantillas con texto, imágenes y enlaces</p>
        </div>
        <Button onClick={openCreate}>Nueva plantilla</Button>
      </div>

      {templates.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-lg mb-2">No hay plantillas</p>
            <p>Crea tu primera plantilla de mensaje</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((t) => (
          <Card key={t.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                {t.name}
                {(t.media_urls?.length > 0 || t.link_url) && (
                  <span className="text-xs text-muted-foreground">
                    {t.media_urls?.length > 0 && `🖼️${t.media_urls.length} `}
                    {t.link_url && "🔗"}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {t.media_urls && t.media_urls.length > 0 && (
                <div className="flex gap-1 overflow-x-auto">
                  {t.media_urls.map((url, i) => (
                    <img
                      key={i}
                      src={`${API_URL}${url}`}
                      alt=""
                      className="h-20 w-20 object-cover rounded-md shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ))}
                </div>
              )}
              {t.link_url && (
                <p className="text-xs text-blue-600 truncate">🔗 {t.link_url}</p>
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

                {/* Content */}
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Mensaje <span className="text-muted-foreground font-normal">(requerido)</span>
                  </label>
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

                {/* Link (optional) */}
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Enlace <span className="text-muted-foreground font-normal">(opcional)</span>
                  </label>
                  <Input
                    placeholder="https://ejemplo.com/oferta"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                  />
                </div>

                {/* Images (multiple, optional) */}
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Imágenes <span className="text-muted-foreground font-normal">(opcional, máx 10)</span>
                  </label>
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFilesSelect}
                    className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                  {uploading && <p className="text-xs text-muted-foreground mt-1">Subiendo...</p>}

                  {/* Preview grid */}
                  {previews.length > 0 && (
                    <div className="mt-2 grid grid-cols-4 gap-2">
                      {previews.map((p, i) => (
                        <div key={i} className="relative group">
                          <img src={p} alt="" className="w-full h-20 object-cover rounded-md" />
                          <button
                            type="button"
                            onClick={() => removeImage(i)}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
