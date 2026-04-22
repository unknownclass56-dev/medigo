import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Pill, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem { 
  to: string; 
  label: string; 
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface Props {
  brand: string;
  nav: NavItem[];
  children: ReactNode;
}

export const DashboardShell = ({ brand, nav, children }: Props) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 shrink-0 border-r bg-sidebar lg:flex lg:flex-col">
        <div className="flex h-16 items-center border-b px-5">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="MediHealth" className="h-8 w-auto object-contain" />
            <span className="text-lg font-black tracking-tight">MediHealth</span>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) => {
            const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition relative",
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent/60"
                )}
              >
                <div className="relative">
                  <item.icon className="h-4 w-4" />
                  {item.badge != null && item.badge > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                      {item.badge}
                    </span>
                  )}
                </div>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3">
          <div className="mb-2 px-2 text-xs text-muted-foreground truncate">{user?.email}</div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex w-full flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-background px-4 lg:hidden">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="MediHealth" className="h-6 w-auto object-contain" />
            <span className="font-bold">MediHealth</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="grid grid-cols-4 border-t bg-background lg:hidden">
          {nav.slice(0, 4).map((item) => {
            const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 text-xs relative",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <div className="relative">
                  <item.icon className="h-5 w-5" />
                  {item.badge != null && item.badge > 0 && (
                    <span className="absolute -right-2 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                      {item.badge}
                    </span>
                  )}
                </div>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
