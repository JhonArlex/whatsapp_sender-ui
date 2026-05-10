import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { groupsApi, jobsApi, templatesApi } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

const API_URL = (import.meta.env.VITE_BULK_API_URL || "");

interface Group {
  id: string;
  instance_name: string;
  remote_jid: string;
  push_name: string;
  subject: string;
  instance_token: string;
  evolution_base_url: string;
}

interface SelectedGroup {
  remote_jid: string;
  push_name: string;
  instance_name: string;
  instance_token: string;
  evolution_base_url: string;
}

interface ImagePayload {
  media_base64: string;
  media_mimetype: string;
  file_name: string;
}

/** Convierte un blob a base64 (sin prefijo data:...) */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function JobCreatePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [groups, setGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Map<string, Group>>(new Map());
  const [jobName, setJobName] = useState("");
  const [messageText, setMessageText] = useState("");
  const [error, setError] = useState("");
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);

  // ── Imágenes ───────────────────────────────────────────────────────
  const [selectedImages, setSelectedImages] = useState<ImagePayload[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);

  useEffect(() => {
    groupsApi.list().then((res) => setGroups(res.data.groups)).catch(() => {});
    templatesApi.list().then((res) => setTemplates(res.data.templates)).catch(() => {});
  }, []);

  const toggleGroup = (g: Group) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(g.id)) next.delete(g.id);
      else next.set(g.id, g);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelected((prev) => {
      const next = new Map(prev);
      for (const g of filteredGroups) {
        next.set(g.id, g);
      }
      return next;
    });
  };

  const deselectAll = () => {
    setSelected(new Map());
  };

  // ── Descargar imágenes de la plantilla ─────────────────────────────
  const loadTemplateImages = useCallback(async (tpl: any) => {
    if (!tpl?.media_urls?.length) {
      setSelectedImages([]);
      return;
    }

    setLoadingImages(true);
    const images: ImagePayload[] = [];

    for (const url of tpl.media_urls) {
      try {
        const fullUrl = url.startsWith("http") ? url : `${API_URL}${url}`;
        const response = await fetch(fullUrl, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("ws_access_token") || ""}`,
          },
        });
        if (!response.ok) {
          console.warn(`Error fetching image ${url}: HTTP ${response.status}`);
          continue;
        }
        const blob = await response.blob();
        const base64 = await blobToBase64(blob);
        images.push({
          media_base64: base64,
          media_mimetype: blob.type || "image/jpeg",
          file_name: url.split("/").pop() || "image.jpg",
        });
      } catch (err) {
        console.error(`Error downloading image: ${url}`, err);
      }
    }

    setSelectedImages(images);
    setLoadingImages(false);
  }, []);

  // ── Seleccionar plantilla ──────────────────────────────────────────
  const handleSelectTemplate = (t: any) => {
    setSelectedTemplate(t);
    setMessageText(t.content);
    loadTemplateImages(t);
  };

  // ── Crear job ──────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (selected.size === 0 || !messageText.trim()) return;
    setCreating(true);
    setError("");

    const selectedGroups: SelectedGroup[] = Array.from(selected.values()).map((g) => ({
      remote_jid: g.remote_jid,
      push_name: g.push_name || g.subject || "",
      instance_name: g.instance_name,
      instance_token: g.instance_token,
      evolution_base_url: g.evolution_base_url,
    }));

    // Construir mensajes: si hay imágenes, enviar como media con texto como caption
    // en la primera; si no, solo texto.
    let messages: any[];

    if (selectedImages.length > 0) {
      messages = selectedImages.map((img, i) => ({
        msg_type: "image",
        content: i === 0 ? messageText : "",
        media_base64: img.media_base64,
        media_mimetype: img.media_mimetype,
        file_name: img.file_name,
      }));
    } else {
      messages = [{ msg_type: "text", content: messageText }];
    }

    try {
      const res = await jobsApi.create({
        name: jobName || `Job ${new Date().toLocaleString()}`,
        groups: selectedGroups,
        messages,
      });
      navigate(`/jobs/${res.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Error al crear job");
    } finally {
      setCreating(false);
    }
  };

  const filteredGroups = groups.filter(
    (g) =>
      !search ||
      g.push_name?.toLowerCase().includes(search.toLowerCase()) ||
      g.subject?.toLowerCase().includes(search.toLowerCase())
  );

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Nuevo Job</h1>
        <p className="text-muted-foreground">Crea un envío masivo de mensajes</p>
      </div>

      {/* Steps indicator */}
      <div className="flex gap-2 text-sm">
        <span className={`font-semibold ${step >= 1 ? "text-primary" : "text-muted"}`}>
          1. Seleccionar grupos
        </span>
        <span className="text-muted-foreground">→</span>
        <span className={`font-semibold ${step >= 2 ? "text-primary" : "text-muted"}`}>
          2. Mensaje
        </span>
        <span className="text-muted-foreground">→</span>
        <span className={`font-semibold ${step >= 3 ? "text-primary" : "text-muted"}`}>
          3. Confirmar
        </span>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Selecciona los grupos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Buscar grupos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={selectAllFiltered}
                className="text-primary hover:underline cursor-pointer"
              >
                ✓ Seleccionar todos
              </button>
              <button
                type="button"
                onClick={deselectAll}
                className="text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
              >
                ✕ Deseleccionar todos
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto space-y-1 border rounded-md p-2">
              {filteredGroups.map((g) => (
                <div
                  key={g.id}
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted ${
                    selected.has(g.id) ? "bg-blue-50 border border-blue-200" : ""
                  }`}
                  onClick={() => toggleGroup(g)}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(g.id)}
                    onChange={() => toggleGroup(g)}
                    className="shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {g.push_name || g.subject || "Sin nombre"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {g.instance_name} · {g.remote_jid}
                    </p>
                  </div>
                </div>
              ))}
              {filteredGroups.length === 0 && (
                <p className="text-center text-muted-foreground py-4">Sin resultados</p>
              )}
            </div>
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {selected.size} grupos seleccionados
              </p>
              <Button
                disabled={selected.size === 0}
                onClick={() => setStep(2)}
              >
                Siguiente
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Configurar mensaje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Selector de plantillas */}
            <div className="space-y-2">
              <Label>Seleccionar plantilla <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <div className="flex flex-wrap gap-2">
                {templates.length === 0 && (
                  <p className="text-sm text-muted-foreground">No hay plantillas disponibles</p>
                )}
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectTemplate(t)}
                    className={`px-3 py-2 rounded-md text-sm border text-left transition-colors ${
                      selectedTemplate?.id === t.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted border-input"
                    }`}
                  >
                    <span className="font-medium">{t.name}</span>
                    {t.media_urls?.length > 0 && <span className="ml-1">🖼️</span>}
                    {t.link_url && <span className="ml-1">🔗</span>}
                    <p className="text-xs opacity-70 mt-0.5 max-w-[200px] truncate">{t.content}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Preview de la plantilla seleccionada */}
            {selectedTemplate && (selectedTemplate.media_urls?.length > 0 || selectedTemplate.link_url) && (
              <div className="rounded-md bg-muted p-3 space-y-1 text-sm">
                {selectedTemplate.media_urls?.length > 0 && (
                  <div className="flex gap-1 overflow-x-auto">
                    {selectedTemplate.media_urls.map((url: string, i: number) => (
                      <img
                        key={i}
                        src={url.startsWith("http") ? url : (url.startsWith("/api/") ? url : "/api/v1/message-templates/media/" + url.replace(/^\//, ""))}
                        alt=""
                        className="h-16 w-16 object-cover rounded-md shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ))}
                  </div>
                )}
                {selectedTemplate.link_url && (
                  <p className="text-xs text-blue-600 truncate">🔗 {selectedTemplate.link_url}</p>
                )}

                {/* Estado de carga de imágenes */}
                {loadingImages && (
                  <p className="text-xs text-muted-foreground animate-pulse">
                    ⏳ Cargando imágenes…
                  </p>
                )}
                {!loadingImages && selectedImages.length > 0 && (
                  <p className="text-xs text-green-600">
                    ✅ {selectedImages.length} imagen(es) lista(s) para enviar
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="jobName">Nombre del job (opcional)</Label>
              <Input
                id="jobName"
                placeholder="Ej: Promo mayo 2024"
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="messageText">Mensaje de texto</Label>
              <textarea
                id="messageText"
                className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                placeholder="Escribe el mensaje que se enviará a los grupos..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                required
              />
              {selectedImages.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  📷 El texto será el caption de la primera imagen
                </p>
              )}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Atrás
              </Button>
              <Button disabled={!messageText.trim()} onClick={() => setStep(3)}>
                Revisar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Confirmar envío</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="rounded-md bg-muted p-4 space-y-2 text-sm">
              <p>
                <strong>Nombre:</strong> {jobName || "(sin nombre)"}
              </p>
              <p>
                <strong>Grupos:</strong> {selected.size}
              </p>
              {selectedImages.length > 0 && (
                <p>
                  <strong>Imágenes:</strong> {selectedImages.length}
                </p>
              )}
              <p>
                <strong>Mensaje:</strong> {messageText.slice(0, 100)}
                {messageText.length > 100 ? "..." : ""}
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {Array.from(selected.values()).map((g) => (
                  <p key={g.id} className="text-xs text-muted-foreground">
                    · {g.push_name || g.subject} ({g.instance_name})
                  </p>
                ))}
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                Atrás
              </Button>
              <Button onClick={handleCreate} disabled={creating || loadingImages}>
                {loadingImages
                  ? "Cargando imágenes…"
                  : creating
                    ? "Creando…"
                    : "Iniciar envío"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
