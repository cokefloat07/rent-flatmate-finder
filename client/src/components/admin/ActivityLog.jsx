import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  UserPlus,
  Home,
  Heart,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Trash2,
  LogIn,
  Filter,
  RefreshCw,
} from 'lucide-react';

/**
 * Chronological activity feed for admin monitoring.
 *
 * Props:
 *   events:  Array<{
 *     id, type, actor_email, actor_name, description, created_at, meta?
 *   }>
 *   loading: boolean
 *   onRefresh?: () => void
 *
 * Expected event `type` values (adjust to whatever the backend emits):
 *   user_registered, user_login, listing_created, listing_deleted,
 *   interest_expressed, interest_accepted, interest_declined, message_sent
 */
export default function ActivityLog({ events = [], loading = false, onRefresh }) {
  const [typeFilter, setTypeFilter] = useState('all');

  // ── Event type metadata ───────────────────────────────────────────────────
  const eventMeta = {
    user_registered: {
      icon: UserPlus,
      color: 'text-primary',
      bg: 'bg-primary/10',
      label: 'New User',
    },
    user_login: {
      icon: LogIn,
      color: 'text-neutral-600',
      bg: 'bg-neutral-100',
      label: 'Login',
    },
    listing_created: {
      icon: Home,
      color: 'text-primary',
      bg: 'bg-primary/10',
      label: 'Listing Posted',
    },
    listing_deleted: {
      icon: Trash2,
      color: 'text-danger',
      bg: 'bg-danger/10',
      label: 'Listing Removed',
    },
    interest_expressed: {
      icon: Heart,
      color: 'text-secondary',
      bg: 'bg-secondary/10',
      label: 'Interest Sent',
    },
    interest_accepted: {
      icon: CheckCircle2,
      color: 'text-success',
      bg: 'bg-success/15',
      label: 'Interest Accepted',
    },
    interest_declined: {
      icon: XCircle,
      color: 'text-danger',
      bg: 'bg-danger/10',
      label: 'Interest Declined',
    },
    message_sent: {
      icon: MessageSquare,
      color: 'text-primary-light',
      bg: 'bg-primary/5',
      label: 'Message',
    },
  };

  const defaultMeta = {
    icon: Activity,
    color: 'text-neutral-500',
    bg: 'bg-neutral-100',
    label: 'Event',
  };

  const getMeta = (type) => eventMeta[type] || defaultMeta;

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (typeFilter === 'all') return events;
    return events.filter((e) => e.type === typeFilter);
  }, [events, typeFilter]);

  // ── Group by date ─────────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach((event) => {
      const date = event.created_at ? new Date(event.created_at).toDateString() : 'Unknown';
      if (!groups[date]) groups[date] = [];
      groups[date].push(event);
    });
    return groups;
  }, [filtered]);

  // ── Time formatter ────────────────────────────────────────────────────────
  const formatTime = (iso) => {
    if (!iso) return '—';
    const date = new Date(iso);
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateLabel = (dateStr) => {
    if (dateStr === 'Unknown') return 'Unknown Date';
    const date = new Date(dateStr);
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (dateStr === today) return 'Today';
    if (dateStr === yesterday) return 'Yesterday';
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="bg-surface rounded-2xl shadow-md p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
            <Activity size={18} className="text-primary" />
            Activity Feed
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            {filtered.length} {filtered.length === 1 ? 'event' : 'events'} shown
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Type filter */}
          <div className="relative">
            <Filter
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="pl-9 pr-8 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary appearance-none bg-white"
            >
              <option value="all">All Events</option>
              <option value="user_registered">New Users</option>
              <option value="user_login">Logins</option>
              <option value="listing_created">Listings Posted</option>
              <option value="listing_deleted">Listings Removed</option>
              <option value="interest_expressed">Interests Sent</option>
              <option value="interest_accepted">Interests Accepted</option>
              <option value="interest_declined">Interests Declined</option>
              <option value="message_sent">Messages</option>
            </select>
          </div>

          {/* Refresh button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 rounded-lg border border-neutral-200 text-neutral-600 hover:border-primary hover:text-primary disabled:opacity-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading && events.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-neutral-100 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 rounded bg-neutral-100 animate-pulse" />
                <div className="h-3 w-2/3 rounded bg-neutral-100 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-neutral-500">
          <Activity size={36} className="mx-auto text-neutral-300 mb-2" />
          <p className="text-sm font-medium">No activity yet</p>
          <p className="text-xs text-neutral-400 mt-1">
            Events will appear here as users interact with the platform.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateStr, dayEvents]) => (
            <div key={dateStr}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  {formatDateLabel(dateStr)}
                </div>
                <div className="flex-1 h-px bg-neutral-200" />
                <div className="text-xs text-neutral-400">
                  {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
                </div>
              </div>

              {/* Events for this day */}
              <div className="space-y-2">
                <AnimatePresence>
                  {dayEvents.map((event, idx) => {
                    const meta = getMeta(event.type);
                    const Icon = meta.icon;

                    return (
                      <motion.div
                        key={event.id || `${event.type}-${idx}`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-neutral-50/70 transition-colors"
                      >
                        {/* Icon */}
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.bg} ${meta.color}`}
                        >
                          <Icon size={14} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="text-sm text-neutral-900">
                              <span className="font-medium">
                                {event.actor_name || event.actor_email || 'System'}
                              </span>{' '}
                              <span className="text-neutral-600">
                                {event.description || meta.label.toLowerCase()}
                              </span>
                            </p>
                            <span className="text-xs text-neutral-400 shrink-0">
                              {formatTime(event.created_at)}
                            </span>
                          </div>

                          {/* Optional meta info */}
                          {event.meta && (
                            <div className="mt-1 text-xs text-neutral-500 truncate">
                              {typeof event.meta === 'string'
                                ? event.meta
                                : Object.entries(event.meta)
                                    .map(([k, v]) => `${k}: ${v}`)
                                    .join(' · ')}
                            </div>
                          )}

                          {/* Event type badge */}
                          <div className="mt-1.5">
                            <span
                              className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${meta.bg} ${meta.color}`}
                            >
                              {meta.label}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
