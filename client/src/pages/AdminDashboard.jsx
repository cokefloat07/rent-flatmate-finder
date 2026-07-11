import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, Home, Activity, ShieldCheck, TrendingUp, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import UserTable from '../components/admin/UserTable';
import ListingTable from '../components/admin/ListingTable';
import ActivityLog from '../components/admin/ActivityLog';
import { fetchAllUsers, fetchAllListings, fetchActivityLog } from '../services/admin.service';

const TABS = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'listings', label: 'Listings', icon: Home },
  { id: 'activity', label: 'Activity Log', icon: Activity },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users');

  // ── Data state ────────────────────────────────────────────────────────────
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [events, setEvents] = useState([]);

  // ── Loading state ─────────────────────────────────────────────────────────
  const [usersLoading, setUsersLoading] = useState(true);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);

  // ── Loaders ───────────────────────────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const data = await fetchAllUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.userMessage || 'Failed to load users');
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const loadListings = useCallback(async () => {
    setListingsLoading(true);
    try {
      const data = await fetchAllListings();
      setListings(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.userMessage || 'Failed to load listings');
      setListings([]);
    } finally {
      setListingsLoading(false);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const data = await fetchActivityLog({ limit: 100 });
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      // Non-critical — activity log is nice-to-have, not blocking
      console.warn('Activity log unavailable:', err.userMessage);
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    loadUsers();
    loadListings();
    loadEvents();
  }, [loadUsers, loadListings, loadEvents]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter((u) => u.is_active !== false).length,
    totalOwners: users.filter((u) => u.role === 'owner').length,
    totalTenants: users.filter((u) => u.role === 'tenant').length,
    totalListings: listings.length,
    availableListings: listings.filter((l) => !l.is_filled).length,
    filledListings: listings.filter((l) => l.is_filled).length,
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="page-container space-y-8"
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 flex items-center gap-2">
            <ShieldCheck className="text-primary" size={28} />
            Admin Dashboard
          </h1>
          <p className="mt-1 text-neutral-600">
            Manage users, moderate listings, and monitor platform activity.
          </p>
        </div>
      </div>

      {/* ── Stats Cards ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Users"
          value={stats.totalUsers}
          subtitle={`${stats.activeUsers} active`}
          color="primary"
          loading={usersLoading}
        />
        <StatCard
          icon={Home}
          label="Listings"
          value={stats.totalListings}
          subtitle={`${stats.availableListings} available`}
          color="secondary"
          loading={listingsLoading}
        />
        <StatCard
          icon={MessageCircle}
          label="Owners / Tenants"
          value={`${stats.totalOwners} / ${stats.totalTenants}`}
          subtitle="Split by role"
          color="success"
          loading={usersLoading}
        />
        <StatCard
          icon={TrendingUp}
          label="Recent Events"
          value={events.length}
          subtitle="Last 100"
          color="warning"
          loading={eventsLoading}
        />
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="border-b border-neutral-200">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  relative inline-flex items-center gap-2 px-4 py-3 text-sm font-medium
                  border-b-2 transition-colors whitespace-nowrap
                  ${
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-neutral-600 hover:text-neutral-900 hover:border-neutral-300'
                  }
                `}
              >
                <Icon size={16} />
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="admin-tab-underline"
                    className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-primary"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────────── */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'users' && (
          <UserTable users={users} loading={usersLoading} onChange={loadUsers} />
        )}
        {activeTab === 'listings' && (
          <ListingTable listings={listings} loading={listingsLoading} onChange={loadListings} />
        )}
        {activeTab === 'activity' && (
          <ActivityLog events={events} loading={eventsLoading} onRefresh={loadEvents} />
        )}
      </motion.div>
    </motion.div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STAT CARD (internal)
// ═════════════════════════════════════════════════════════════════════════════

function StatCard({ icon: Icon, label, value, subtitle, color = 'primary', loading }) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    secondary: 'bg-secondary/10 text-secondary',
    success: 'bg-success/15 text-success',
    warning: 'bg-warning/20 text-neutral-900',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-surface rounded-2xl shadow-md p-5 hover:shadow-xl transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
          {loading ? (
            <div className="h-8 w-20 mt-2 rounded bg-neutral-100 animate-pulse" />
          ) : (
            <p className="mt-2 text-2xl font-bold text-neutral-900 truncate">{value}</p>
          )}
          {subtitle && <p className="mt-1 text-xs text-neutral-500 truncate">{subtitle}</p>}
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorClasses[color]}`}
        >
          <Icon size={18} />
        </div>
      </div>
    </motion.div>
  );
}
