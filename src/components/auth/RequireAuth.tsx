import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useDbStore } from "@/stores/dbStore";

export default function RequireAuth({ role }: { role?: "employee" | "admin" }) {
  const location = useLocation();
  const { token, role: currentRole } = useAuthStore();
  const loadSharedSnapshot = useDbStore(s => s.loadSharedSnapshot);
  const [snapshotReady, setSnapshotReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    async function syncSharedSnapshot() {
      if (!token) {
        if (!cancelled) {
          setSnapshotReady(false);
        }
        return;
      }

      if (role && currentRole !== role) {
        if (!cancelled) {
          setSnapshotReady(false);
        }
        return;
      }

      try {
        await loadSharedSnapshot();
        if (!cancelled) {
          setSnapshotReady(true);
        }
      } catch {
        if (!cancelled) {
          setSnapshotReady(false);
          retryTimer = setTimeout(() => {
            void syncSharedSnapshot();
          }, 1000);
        }
      }
    }

    setSnapshotReady(false);
    void syncSharedSnapshot();

    return () => {
      cancelled = true;
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
    };
  }, [currentRole, loadSharedSnapshot, role, token]);

  if (!token) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (role && currentRole !== role) return <Navigate to={currentRole === "admin" ? "/admin" : "/app"} replace />;
  if (!snapshotReady) return null;
  return <Outlet />;
}
