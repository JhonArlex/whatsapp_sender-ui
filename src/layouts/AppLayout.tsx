import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { useState } from "react";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: "📊" },
  { path: "/connections", label: "Conexiones", icon: "🔗" },
  { path: "/instances", label: "Instancias", icon: "📱" },
  { path: "/groups", label: "Grupos", icon: "👥" },
  { path: "/templates", label: "Plantillas", icon: "📝" },
  { path: "/jobs", label: "Jobs", icon: "📨" },
  { path: "/messages", label: "Mensajes", icon: "💬" },
];

// Versión del deploy — actualizar al hacer deploy
const APP_VERSION = "v1.8.0";
const APP_CHANGES = [
  "📱 Diseño responsive mobile (bottom nav + drawer lateral)",
  "📋 Tablas convertidas a cards en mobile",
  "📷 Jobs incluyen imágenes desde plantillas (base64)",
  "➕ Editar conexiones Evolution",
  "🔍 Errores detallados al verificar conexión",
  "🐛 Fix: Origin header en verificación Evolution",
  "➕ CRUD de plantillas de mensajes",
  "🔄 Jobs usan plantillas predefinidas",
  "🐛 Fix: endpoint /instance/fetchInstances (era fetchAll)",
  "🐛 Fix: re-encriptar API Key (CRYPTO_KEY inconsistente)",
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className="flex h-screen">
      {/* ── Overlay del drawer (mobile) ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar principal (desktop) / Drawer (mobile) ── */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 border-r bg-card flex flex-col transition-transform duration-300 md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <Link
              to="/dashboard"
              className="text-xl font-bold text-primary"
              onClick={() => setSidebarOpen(false)}
            >
              Web Sender
            </Link>
            {user && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {user.email}
              </p>
            )}
          </div>
          {/* Cerrar drawer en mobile */}
          <button
            className="md:hidden text-muted-foreground hover:text-foreground text-xl"
            onClick={() => setSidebarOpen(false)}
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive(item.path)
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-muted text-foreground"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Footer con versión y logout */}
        <div className="p-3 border-t mt-auto">
          <div className="text-xs text-muted-foreground space-y-1">
            <details>
              <summary className="cursor-pointer hover:text-foreground font-medium">
                {APP_VERSION}
              </summary>
              <ul className="mt-1 space-y-0.5 list-disc list-inside text-[11px] opacity-80">
                {APP_CHANGES.map((change, i) => (
                  <li key={i}>{change}</li>
                ))}
              </ul>
            </details>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2"
            onClick={handleLogout}
          >
            Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* ── Contenido principal ── */}
      <main className="flex-1 overflow-y-auto bg-background pb-16 md:pb-0">
        {/* Barra superior móvil con hamburguesa */}
        <div className="sticky top-0 z-30 md:hidden flex items-center gap-3 px-4 py-3 border-b bg-background/95 backdrop-blur">
          <button
            className="text-xl text-foreground"
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </button>
          <span className="font-semibold text-sm">
            {navItems.find((i) => isActive(i.path))?.label || "Web Sender"}
          </span>
        </div>

        <div className="p-4 md:p-6">
          <Outlet />
        </div>
      </main>

      {/* ── Bottom Navigation (mobile only) ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-card border-t flex items-center justify-around px-1 py-1 safe-area-bottom">
        {navItems.slice(0, 5).map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-md text-xs transition-colors min-w-0 ${
              isActive(item.path)
                ? "text-primary font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="truncate max-w-[60px] text-[10px] leading-tight">
              {item.label}
            </span>
          </Link>
        ))}
        {/* Botón "Más" que abre el drawer */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="text-lg leading-none">•••</span>
          <span className="text-[10px] leading-tight">Más</span>
        </button>
      </nav>
    </div>
  );
}
