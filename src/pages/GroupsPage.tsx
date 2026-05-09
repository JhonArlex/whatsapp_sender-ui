import { useEffect, useState } from "react";
import { groupsApi } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

interface Group {
  id: string;
  instance_name: string;
  remote_jid: string;
  push_name: string;
  subject: string;
  synced_at: string | null;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = (s: string = "") => {
    setLoading(true);
    groupsApi
      .list({ search: s || undefined })
      .then((res) => setGroups(res.data.groups))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await groupsApi.sync();
      load(search);
    } catch {}
    setSyncing(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(search);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedGroups = groups.filter((g) => selected.has(g.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Grupos <span className="text-lg font-normal text-muted-foreground">({groups.length})</span></h1>
          <p className="text-muted-foreground">
            Grupos de WhatsApp sincronizados desde Evolution
            {selectedGroups.length > 0 && (
              <span className="ml-2 font-semibold text-primary">
                ({selectedGroups.length} seleccionados)
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedGroups.length > 0 && (
            <Button
              onClick={() => {
                const params = new URLSearchParams();
                params.set("groups", JSON.stringify(selectedGroups.map((g) => g.id)));
                window.location.href = `/jobs/new?${params}`;
              }}
            >
              Crear job con seleccionados
            </Button>
          )}
          <Button variant="outline" onClick={handleSync} disabled={syncing}>
            {syncing ? "Sincronizando..." : "Sincronizar"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          placeholder="Buscar grupos por nombre o ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
        {search && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setSearch("");
              load();
            }}
          >
            Limpiar
          </Button>
        )}
      </form>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Cargando grupos...</p>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay grupos sincronizados. Sincroniza para obtenerlos desde Evolution.
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="w-10 p-3 text-left">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelected(new Set(groups.map((g) => g.id)));
                      } else {
                        setSelected(new Set());
                      }
                    }}
                    checked={selected.size === groups.length && groups.length > 0}
                  />
                </th>
                <th className="p-3 text-left font-medium">Nombre</th>
                <th className="p-3 text-left font-medium">Instancia</th>
                <th className="p-3 text-left font-medium">Remote JID</th>
                <th className="p-3 text-left font-medium">Sincronizado</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr
                  key={g.id}
                  className={`border-b hover:bg-muted/50 cursor-pointer ${
                    selected.has(g.id) ? "bg-blue-50" : ""
                  }`}
                  onClick={() => toggleSelect(g.id)}
                >
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(g.id)}
                      onChange={() => toggleSelect(g.id)}
                    />
                  </td>
                  <td className="p-3 font-medium">{g.push_name || g.subject || "—"}</td>
                  <td className="p-3 text-muted-foreground">{g.instance_name}</td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">{g.remote_jid}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {g.synced_at ? new Date(g.synced_at).toLocaleString() : "—"}
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
