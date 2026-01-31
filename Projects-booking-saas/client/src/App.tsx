import { Route, Switch, useLocation } from "wouter";
import { useEffect } from "react";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Dashboard from "./pages/admin/Dashboard";
import Calendar from "./pages/admin/Calendar";
import Services from "./pages/admin/Services";
import Masters from "./pages/admin/Masters";
import Notifications from "./pages/admin/Notifications";
import NotificationLogs from "./pages/admin/NotificationLogs";
import NotificationTemplates from "./pages/admin/NotificationTemplates";
import WhatsAppSettings from "./pages/admin/WhatsAppSettings";
import Clients from "./pages/admin/Clients";
import Reports from "./pages/admin/Reports";
import ContentPosts from "./pages/admin/content/Posts";
import ContentMedia from "./pages/admin/content/Media";
import ContentPostEditor from "./pages/admin/content/PostEditor";
import BookingDemo from "./pages/public/BookingDemo";
import { useAuth } from "./_core/hooks/useAuth";

function RootRedirect() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      setLocation("/dashboard");
    } else {
      setLocation("/login");
    }
  }, [user, setLocation]);

  return null;
}

function ProtectedRoute({ component: Component }: { component: () => React.ReactElement }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-slate-400">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <Component />;
}

function App() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  // ВСЕ хуки должны быть вызваны ДО любого условного return
  useEffect(() => {
    if (!isLoading) {
      if (!user && location !== "/login" && location !== "/") {
        setLocation("/login");
      } else if (user && location === "/login") {
        setLocation("/dashboard");
      }
    }
  }, [user, location, setLocation, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-slate-400">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={RootRedirect} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/calendar">
        <ProtectedRoute component={Calendar} />
      </Route>
      <Route path="/services">
        <ProtectedRoute component={Services} />
      </Route>
      <Route path="/masters">
        <ProtectedRoute component={Masters} />
      </Route>
      <Route path="/notifications">
        <ProtectedRoute component={Notifications} />
      </Route>
      <Route path="/notification-logs">
        <ProtectedRoute component={NotificationLogs} />
      </Route>
      <Route path="/notification-templates">
        <ProtectedRoute component={NotificationTemplates} />
      </Route>
      <Route path="/whatsapp-settings">
        <ProtectedRoute component={WhatsAppSettings} />
      </Route>
      <Route path="/clients">
        <ProtectedRoute component={Clients} />
      </Route>
      <Route path="/reports">
        <ProtectedRoute component={Reports} />
      </Route>
      <Route path="/content/posts">
        <ProtectedRoute component={ContentPosts} />
      </Route>
      <Route path="/content/media">
        <ProtectedRoute component={ContentMedia} />
      </Route>
      <Route path="/content/new">
        <ProtectedRoute component={ContentPostEditor} />
      </Route>
      <Route path="/content/:id">
        <ProtectedRoute component={ContentPostEditor} />
      </Route>
      <Route path="/booking-demo">
        <ProtectedRoute component={BookingDemo} />
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;
