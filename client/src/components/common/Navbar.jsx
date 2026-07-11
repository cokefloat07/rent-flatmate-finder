import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, LogIn, UserPlus, Menu, X, LogOut, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

import useAuthStore from '../../store/authStore';
import { ROUTES, ROLES } from '../../utils/constants';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);

  const isAuthed = !!user && !!token;
  const isAdmin = user?.role === ROLES.ADMIN;

  const dashboardPath = isAdmin
    ? ROUTES.ADMIN_DASHBOARD
    : user?.role === ROLES.OWNER
      ? ROUTES.OWNER_DASHBOARD
      : ROUTES.TENANT_DASHBOARD;

  const handleLogout = () => {
    // Defensive: make sure logout is actually a function
    if (typeof logout !== 'function') {
      console.error('[Navbar] logout is not a function:', logout);
      toast.error('Sign-out failed — please refresh.');
      return;
    }

    logout();
    setMobileOpen(false);
    toast.success('Signed out.');
    // Use replace so the browser back button doesn't jump into a protected page
    navigate(ROUTES.HOME, { replace: true });
  };

  const navLinkClass = ({ isActive }) =>
    `rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-150 ${
      isActive
        ? 'bg-primary/10 text-primary'
        : 'text-neutral-700 hover:bg-neutral-100 hover:text-primary'
    }`;

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="sticky top-0 z-40 border-b border-neutral-300 bg-surface/90 backdrop-blur-md"
    >
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        {/* Logo */}
        <Link to={ROUTES.HOME} className="flex items-center gap-2 text-primary">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-soft">
            <Home size={18} strokeWidth={2.5} />
          </div>
          <span className="font-display text-lg font-bold text-neutral-900">
            Rent<span className="text-primary">&</span>Find
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 md:flex">
          <NavLink to={ROUTES.HOME} className={navLinkClass} end>
            Home
          </NavLink>

          {isAuthed ? (
            <>
              <NavLink to={dashboardPath} className={navLinkClass}>
                <span className="inline-flex items-center gap-1.5">
                  <LayoutDashboard size={16} /> Dashboard
                </span>
              </NavLink>

              {/* Admin link — only visible to admins */}
              {isAdmin && (
                <NavLink to={ROUTES.ADMIN_DASHBOARD} className={navLinkClass}>
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck size={16} /> Admin
                  </span>
                </NavLink>
              )}

              <div className="ml-2 flex items-center gap-2 rounded-xl bg-neutral-100 px-3 py-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                  {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-neutral-900">
                  {user?.name || user?.email}
                </span>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="ml-1 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 hover:text-danger cursor-pointer"
              >
                <LogOut size={16} /> Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to={ROUTES.LOGIN} className={navLinkClass}>
                <span className="inline-flex items-center gap-1.5">
                  <LogIn size={16} /> Login
                </span>
              </NavLink>
              <Link to={ROUTES.REGISTER} className="btn-primary ml-2 !px-4 !py-2 text-sm">
                <UserPlus size={16} /> Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="rounded-xl p-2 text-neutral-700 hover:bg-neutral-100 md:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-neutral-300 bg-surface md:hidden"
          >
            <div className="flex flex-col gap-1 px-4 py-3">
              <NavLink
                to={ROUTES.HOME}
                className={navLinkClass}
                onClick={() => setMobileOpen(false)}
                end
              >
                Home
              </NavLink>

              {isAuthed ? (
                <>
                  <NavLink
                    to={dashboardPath}
                    className={navLinkClass}
                    onClick={() => setMobileOpen(false)}
                  >
                    Dashboard
                  </NavLink>

                  {/* Admin link — mobile */}
                  {isAdmin && (
                    <NavLink
                      to={ROUTES.ADMIN_DASHBOARD}
                      className={navLinkClass}
                      onClick={() => setMobileOpen(false)}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <ShieldCheck size={16} /> Admin Panel
                      </span>
                    </NavLink>
                  )}

                  <div className="mt-2 rounded-xl bg-neutral-100 px-3 py-2 text-sm">
                    <span className="text-neutral-700">Signed in as </span>
                    <span className="font-semibold text-neutral-900">
                      {user?.name || user?.email}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-danger py-2.5 text-sm font-semibold text-white cursor-pointer"
                  >
                    <LogOut size={16} /> Logout
                  </button>
                </>
              ) : (
                <>
                  <NavLink
                    to={ROUTES.LOGIN}
                    className={navLinkClass}
                    onClick={() => setMobileOpen(false)}
                  >
                    Login
                  </NavLink>
                  <Link
                    to={ROUTES.REGISTER}
                    className="btn-primary mt-1 !justify-center"
                    onClick={() => setMobileOpen(false)}
                  >
                    <UserPlus size={16} /> Get Started
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
