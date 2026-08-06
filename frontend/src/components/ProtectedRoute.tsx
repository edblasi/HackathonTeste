import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { apiGet } from "../lib/api";
import type { UsuarioSistema } from "../hooks/FetchData";

type Role = UsuarioSistema["papel"];

function routeForRole(role: Role): string {
  if (role === "GESTOR") return "/manager";
  if (role === "FISCAL_CRE") return "/cre";
  return "/";
}

export function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: Role[] }) {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<UsuarioSistema | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user || !roles?.length) {
      setProfile(null);
      setProfileLoading(false);
      setProfileError(false);
      return;
    }
    setProfileLoading(true);
    setProfileError(false);
    apiGet<UsuarioSistema>("/api/me")
      .then((result) => active && setProfile(result))
      .catch(() => active && setProfileError(true))
      .finally(() => active && setProfileLoading(false));
    return () => { active = false; };
  }, [user?.id, roles?.join(",")]);

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-sm shadow-primary/20">
          <Shield size={22} className="text-white" strokeWidth={2} />
        </div>
        <div className="w-7 h-7 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (profileError) return <Navigate to="/login" replace />;
  if (roles?.length && profile && !roles.includes(profile.papel)) return <Navigate to={routeForRole(profile.papel)} replace />;

  return <>{children}</>;
}
