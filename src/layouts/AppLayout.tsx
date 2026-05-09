import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";

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
const APP_VERSION = "v1.4.0";
const APP_CHANGES = [
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

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <Link to="/dashboard" className="text-xl font-bold text-primary">
            Web Sender
          </Link>
          {user && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {user.email}
            </p>
          )}
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer con versión y cambios aplicados */}
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
          <Button variant="ghost" size="sm" className="w-full mt-2" onClick={handleLogout}>
            Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6 bg-background">
        <Outlet />
      </main>
    </div>
  );
}
