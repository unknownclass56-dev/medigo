import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AppRole, useAuth, primaryRoleRoute } from "@/lib/auth";
import { Loader2 } from "lucide-react";

interface Props {
  children: ReactNode;
  allow?: AppRole[];
}

export const ProtectedRoute = ({ children, allow }: Props) => {
  const { user, roles, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  if (allow && !allow.some((r) => roles.includes(r))) {
    return <Navigate to={primaryRoleRoute(roles)} replace />;
  }

  return <>{children}</>;
};
