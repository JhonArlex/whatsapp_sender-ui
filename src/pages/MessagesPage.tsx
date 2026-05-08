import { useEffect, useState } from "react";
import { messagesApi } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";

interface Message {
  id: string;
  job_id: string | null;
  remote_jid: string;
  push_name: string;
  instance_name: string;
  msg_type: string;
  content: string;
  status: string;
  error_detail: string | null;
  sent_at: string | null;
}

function statusBadge(status: string) {
  if (status === "sent") return <Badge className="bg-green-500">Enviado</Badge>;
  if (status === "failed") return <Badge className="bg-red-500">Fallido</Badge>;
  if (status === "pending") return <Badge className="bg-yellow-500">Pendiente</Badge>;
  return <Badge>{status}</Badge>;
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [resending, setResending] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    messagesApi
      .list({ status: statusFilter || undefined })
      .then((res) => setMessages(res.data.messages))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleResend = async (id: string) => {
    setResending(id);
    try {
      await messagesApi.resend(id);
      load();
    } catch {}
    setResending(null);
  };

  const filtered = search
    ? messages.filter(
        (m) =>
          m.push_name?.toLowerCase().includes(search.toLowerCase()) ||
          m.remote_jid?.includes(search)
      )
    : messages;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Historial de mensajes</h1>
        <p className="text-muted-foreground">Mensajes enviados a grupos</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Buscar por grupo o JID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-1">
          {["", "sent", "failed", "pending"].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
            >
              {s === "" ? "Todos" : s}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Cargando...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay mensajes
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left">Grupo</th>
                <th className="p-3 text-left">Instancia</th>
                <th className="p-3 text-left">Mensaje</th>
                <th className="p-3 text-left">Estado</th>
                <th className="p-3 text-left">Enviado</th>
                <th className="p-3 text-left"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-b hover:bg-muted/50">
                  <td className="p-3 font-medium">{m.push_name || m.remote_jid}</td>
                  <td className="p-3 text-muted-foreground">{m.instance_name}</td>
                  <td className="p-3 max-w-[200px] truncate text-muted-foreground">
                    {m.content?.slice(0, 80) || "—"}
                  </td>
                  <td className="p-3">{statusBadge(m.status)}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {m.sent_at ? new Date(m.sent_at).toLocaleString() : "—"}
                  </td>
                  <td className="p-3">
                    {m.status === "failed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResend(m.id)}
                        disabled={resending === m.id}
                      >
                        {resending === m.id ? "..." : "Reenviar"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
