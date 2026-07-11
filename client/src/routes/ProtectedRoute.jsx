import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { ROUTES } from '../utils/constants';

/**
 * Wraps any route that requires a logged-in user.
 *
 * If no token/user in authStore → redirect to /login
 * and remember where they came from so Login can redirect back after auth.
 *
 * IMPORTANT: waits for the persist middleware to finish rehydrating from
 * sessionStorage before making the redirect decision. Without this guard,
 * a page refresh would briefly show `user === null` (pre-hydration) and
 * kick the user back to /login even though they're logged in.
 *
 * Usage in App.jsx:
 *   <Route element={<ProtectedRoute />}>
 *     <Route path="/owner" element={<OwnerDashboard />} />
 *     <Route path="/tenant" element={<TenantDashboard />} />
 *   </Route>
 *
 * The <Outlet /> inside renders whichever child route matched.
 */
export default function ProtectedRoute() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const location = useLocation();

  // ── Wait for rehydration before deciding ──────────────────────────────────
  // Prevents the "flash of logged-out state" on page refresh.
  if (!hydrated) {
    return (
      <div className="page-container py-20">
        <div className="mx-auto max-w-md rounded-2xl bg-surface p-6 shadow-md">
          <div className="space-y-3">
            <div className="h-6 w-1/3 animate-pulse rounded bg-neutral-100" />
            <div className="h-4 w-full animate-pulse rounded bg-neutral-100" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-100" />
          </div>
        </div>
      </div>
    );
  }

  const isAuthed = !!user && !!token;

  if (!isAuthed) {
    return (
      <Navigate
        to={ROUTES.LOGIN}
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <Outlet />;
}