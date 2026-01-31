import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../_core/hooks/useAuth";
import { trpc } from "../lib/trpc";
import { ChatDock } from "./ChatDock";

const navItems = [
  { path: "/dashboard", label: "Дашборд", icon: "📊" },
  { path: "/calendar", label: "Календарь", icon: "📅" },
  { path: "/services", label: "Услуги", icon: "💼" },
  { path: "/masters", label: "Мастера", icon: "👤" },
  { path: "/clients", label: "Клиенты", icon: "👥" },
  { path: "/reports", label: "Отчёты", icon: "📈" },
  { path: "/notifications", label: "Уведомления", icon: "🔔" },
  { path: "/content/posts", label: "Контент", icon: "📝" },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      await utils.invalidate();
      utils.auth.me.setData(undefined, null);
      setLocation("/login");
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  return (
    <div className="flex h-screen min-h-screen bg-gradient-to-br from-[#050608] via-[#050609] to-[#090B12] text-slate-100">
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-slate-950/80 backdrop-blur border-r border-borderMuted transition-all duration-300 flex flex-col`}
      >
        <div className="p-4 border-b border-borderMuted">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <h1 className="text-xl font-display font-bold text-slate-100">Booking SaaS</h1>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-900/80 rounded-lg text-slate-400 hover:text-slate-100 transition-colors"
            >
              {sidebarOpen ? "←" : "→"}
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition ${
                location === item.path
                  ? "bg-gradient-to-r from-accent/20 to-accent/5 text-accent border-l-2 border-accent"
                  : "text-slate-400 hover:bg-slate-900/80 hover:text-slate-100"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              {sidebarOpen && <span className="font-medium">{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-borderMuted">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-900 border border-borderMuted flex items-center justify-center text-accent font-semibold flex-shrink-0">
              {user?.email ? getInitials(user.email) : "U"}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-100 truncate">
                  {user?.email || "Гость"}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {isAuthenticated ? "Владелец" : "Не авторизован"}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-surface/80 backdrop-blur border-b border-borderMuted px-6 py-4 shadow-lg shadow-black/40 flex items-center justify-between">
          <h2 className="text-xl font-display font-semibold text-slate-100">
            {navItems.find((item) => item.path === location)?.label || "Панель управления"}
          </h2>

          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-900/80 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-slate-900 border border-borderMuted flex items-center justify-center text-accent font-semibold text-sm">
                {user?.email ? getInitials(user.email) : "U"}
              </div>
              <span className="text-sm text-slate-200 hidden md:block">
                {user?.email || "Гость"}
              </span>
              <svg
                className={`w-4 h-4 text-slate-400 transition-transform ${
                  userMenuOpen ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setUserMenuOpen(false)}
                ></div>
                <div className="absolute right-0 mt-2 w-48 bg-surface shadow-xl shadow-black/50 border border-borderMuted rounded-2xl z-20">
                  <div className="p-3 border-b border-borderMuted">
                    <p className="text-sm font-medium text-slate-200 truncate">
                      {user?.email || "Гость"}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {isAuthenticated ? "Владелец" : "Не авторизован"}
                    </p>
                  </div>
                  <div className="p-1">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-900/80 rounded transition-colors"
                    >
                      Профиль
                    </button>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleLogout();
                      }}
                      disabled={logoutMutation.isPending}
                      className="w-full text-left px-3 py-2 text-sm text-red-300 hover:bg-slate-900/80 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {logoutMutation.isPending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-red-300 border-t-transparent rounded-full animate-spin"></div>
                          Выходим...
                        </>
                      ) : (
                        "Выйти"
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-6">{children}</main>
      </div>

      <ChatDock />
    </div>
  );
}
