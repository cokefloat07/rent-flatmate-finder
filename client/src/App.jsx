import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';

import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import SocketManager from './components/common/SocketManager';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import OwnerDashboard from './pages/OwnerDashboard';
import TenantDashboard from './pages/TenantDashboard';
import ListingDetails from './pages/ListingDetails';
import Chat from './pages/Chat';
import AdminDashboard from './pages/AdminDashboard';
import NotFound from './pages/NotFound';
import SocketDebugPanel from './components/common/SocketDebugPanel';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleRoute from './routes/RoleRoute';

import { ROUTES, ROLES } from './utils/constants';

export default function App() {
  console.log('🔍 API URL:', import.meta.env.VITE_API_URL);
  console.log('🔍 All env:', import.meta.env);
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );

}
console.log('API URL:', import.meta.env.VITE_API_URL);
function AppShell() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col">
      <SocketManager />
      <Navbar />

      <main className="flex-1">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            {/* ── Public routes (no auth required) ─────────────────────── */}
            <Route path={ROUTES.HOME} element={<Home />} />
            <Route path={ROUTES.LOGIN} element={<Login />} />
            <Route path={ROUTES.REGISTER} element={<Register />} />
            <Route path={ROUTES.LISTING_DETAILS} element={<ListingDetails />} />

            {/* ── Authenticated-only routes ────────────────────────────── */}
            <Route element={<ProtectedRoute />}>
              {/* Owner-only */}
              <Route element={<RoleRoute allowed={[ROLES.OWNER]} />}>
                <Route path={ROUTES.OWNER_DASHBOARD} element={<OwnerDashboard />} />
              </Route>

              {/* Tenant-only */}
              <Route element={<RoleRoute allowed={[ROLES.TENANT]} />}>
                <Route path={ROUTES.TENANT_DASHBOARD} element={<TenantDashboard />} />
              </Route>

              {/* Chat — accessible by both owner and tenant */}
              <Route element={<RoleRoute allowed={[ROLES.OWNER, ROLES.TENANT]} />}>
                <Route path={ROUTES.CHAT} element={<Chat />} />
              </Route>

              {/* Admin-only */}
              <Route element={<RoleRoute allowed={[ROLES.ADMIN]} />}>
                <Route path={ROUTES.ADMIN_DASHBOARD} element={<AdminDashboard />} />
              </Route>
            </Route>

            {/* ── Catch-all 404 ────────────────────────────────────────── */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AnimatePresence>
      </main>

      <Footer />

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          className: '!bg-surface !text-neutral-900 !shadow-lift !rounded-2xl',
          success: {
            iconTheme: { primary: '#2D6A4F', secondary: '#F7F7F5' },
          },
          error: {
            iconTheme: { primary: '#E76F51', secondary: '#F7F7F5' },
          },
        }}
      />
      <SocketDebugPanel />
    </div>
  );
}
