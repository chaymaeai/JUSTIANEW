import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { UserRole } from "@/types/auth";

interface ProtectedRouteProps {
  /** If set, only these roles may access child routes. Others are redirected to their home dashboard. */
  allowedRoles?: UserRole[];
}

function homePathForRole(role: UserRole): string {
  if (role === "admin") return "/admin/dashboard";
  if (role === "provider") return "/fournisseur/dashboard";
  return "/espace-client/dashboard";
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700">
        Chargement...
      </div>
    );
  }

  if (!isAuthenticated) {
    // Determine which login page to redirect to based on current path
    let loginUrl = "/client-space/login";
    if (location.pathname.startsWith("/admin")) {
      loginUrl = "/client-space/login?espace=admin";
    } else if (location.pathname.startsWith("/fournisseur")) {
      loginUrl = "/client-space/login?espace=expert";
    }
    return <Navigate to={loginUrl} state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={homePathForRole(user.role)} replace />;
  }

  return <Outlet />;
}
