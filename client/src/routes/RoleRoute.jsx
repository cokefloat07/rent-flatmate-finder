import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { ROUTES, ROLES } from '../utils/constants';

/**
 * Must be placed INSIDE a <ProtectedRoute>.
 * Checks that the authenticated user has at least one of the required roles.
 *
 * Usage:
 *   <Route element={<ProtectedRoute />}>
 *     <Route element={<RoleRoute allowed={[ROLES.OWNER]} />}>
 *       <Route path="/owner" element={<OwnerDashboard />} />
 *     </Route>
 *     <Route element={<RoleRoute allowed={[ROLES.TENANT]} />}>
 *       <Route path="/tenant" element={<TenantDashboard />} />
 *     </Route>
 *   </Route>
 *
 * If the user has the wrong role, they're sent to their own dashboard.
 * If the user is somehow not authenticated (shouldn't happen if parent is
 * ProtectedRoute), they're sent to /login as a safety net.
 *
 * IMPORTANT: also waits for hydration so we don't misclassify a rehydrating
 * user as "wrong role".
 *
 * @param {string[]} allowed - list of roles allowed to access this subtree
 */
export default function RoleRoute({ allowed = [] }) {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const location = useLocation();

  // ── Wait for rehydration before deciding ──────────────────────────────────
  if (!hydrated) {
    return null; // Parent ProtectedRoute already renders a skeleton; avoid double-render
  }

  // Safety: if no auth at all, fall back to login
  // (should already be caught by parent ProtectedRoute)
  if (!user || !token) {
    return (
      <Navigate
        to={ROUTES.LOGIN}
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // Role check
  if (!allowed.includes(user.role)) {
    // Build a friendly redirect to their own dashboard
    const redirectMap = {
      [ROLES.OWNER]: ROUTES.OWNER_DASHBOARD,
      [ROLES.TENANT]: ROUTES.TENANT_DASHBOARD,
      [ROLES.ADMIN]: ROUTES.ADMIN_DASHBOARD,
    };

    const redirectTo = redirectMap[user.role] || ROUTES.HOME;

    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}