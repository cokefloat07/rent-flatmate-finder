import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Home, Shield, Trash2, Loader2, CheckCircle, XCircle, Search } from 'lucide-react';
import toast from 'react-hot-toast';

import { updateUser, deleteUser } from '../../services/admin.service';
import Modal from '../common/Modal';

/**
 * Admin table for managing users.
 *
 * Props:
 *   users:     Array<{ id, email, name, role, is_active, created_at }>
 *   loading:   boolean
 *   onChange:  () => void   // called after a mutation so parent can refetch
 */
export default function UserTable({ users = [], loading = false, onChange }) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [pendingAction, setPendingAction] = useState(null); // { id, type }
  const [confirmDelete, setConfirmDelete] = useState(null); // user obj

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = users.filter((u) => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q || (u.email || '').toLowerCase().includes(q) || (u.name || '').toLowerCase().includes(q);
    return matchesRole && matchesSearch;
  });

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleToggleActive = async (user) => {
    setPendingAction({ id: user.id, type: 'toggle' });
    try {
      await updateUser(user.id, { is_active: !user.is_active });
      toast.success(`User ${user.is_active ? 'deactivated' : 'activated'} successfully`);
      onChange?.();
    } catch (err) {
      toast.error(err.userMessage || 'Failed to update user');
    } finally {
      setPendingAction(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setPendingAction({ id: confirmDelete.id, type: 'delete' });
    try {
      await deleteUser(confirmDelete.id);
      toast.success('User deleted');
      setConfirmDelete(null);
      onChange?.();
    } catch (err) {
      toast.error(err.userMessage || 'Failed to delete user');
    } finally {
      setPendingAction(null);
    }
  };

  // ── Role icon helper ──────────────────────────────────────────────────────
  const roleIcon = (role) => {
    if (role === 'admin') return <Shield size={14} className="text-secondary" />;
    if (role === 'owner') return <Home size={14} className="text-primary" />;
    return <User size={14} className="text-neutral-500" />;
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="bg-surface rounded-2xl shadow-md p-6">
      {/* Header + filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold text-neutral-900">Users ({filtered.length})</h2>

        <div className="flex flex-col sm:flex-row gap-2">
          {/* Search */}
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <input
              type="text"
              placeholder="Search email or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          {/* Role filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          >
            <option value="all">All roles</option>
            <option value="owner">Owner</option>
            <option value="tenant">Tenant</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-neutral-500">No users match your filters.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-neutral-500 border-b border-neutral-200">
                <th className="pb-3 pr-4">User</th>
                <th className="pb-3 pr-4">Role</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Joined</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((user) => {
                  const isPending = pendingAction?.id === user.id;
                  return (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/50"
                    >
                      {/* User */}
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                            {(user.name || user.email || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-neutral-900 truncate">
                              {user.name || '—'}
                            </p>
                            <p className="text-xs text-neutral-500 truncate">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium capitalize text-neutral-700">
                          {roleIcon(user.role)}
                          {user.role}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 pr-4">
                        {user.is_active !== false ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-success bg-success/10 px-2.5 py-1 rounded-full">
                            <CheckCircle size={12} /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-full">
                            <XCircle size={12} /> Inactive
                          </span>
                        )}
                      </td>

                      {/* Joined */}
                      <td className="py-3 pr-4 text-neutral-600">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleToggleActive(user)}
                            disabled={isPending || user.role === 'admin'}
                            className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-neutral-200 hover:border-primary hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title={
                              user.role === 'admin'
                                ? 'Cannot modify admin'
                                : user.is_active !== false
                                  ? 'Deactivate'
                                  : 'Activate'
                            }
                          >
                            {isPending && pendingAction.type === 'toggle' ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : user.is_active !== false ? (
                              'Deactivate'
                            ) : (
                              'Activate'
                            )}
                          </button>

                          <button
                            onClick={() => setConfirmDelete(user)}
                            disabled={isPending || user.role === 'admin'}
                            className="p-1.5 rounded-lg border border-neutral-200 text-neutral-500 hover:border-danger hover:text-danger disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title={user.role === 'admin' ? 'Cannot delete admin' : 'Delete user'}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation modal */}
      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete user?">
        <div className="space-y-4">
          <p className="text-sm text-neutral-700">
            Are you sure you want to permanently delete <strong>{confirmDelete?.email}</strong>?
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirmDelete(null)}
              className="px-4 py-2 rounded-lg border border-neutral-200 text-sm font-medium hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={pendingAction?.type === 'delete'}
              className="px-4 py-2 rounded-lg bg-danger text-white text-sm font-medium hover:bg-danger/90 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
            >
              {pendingAction?.type === 'delete' && <Loader2 size={14} className="animate-spin" />}
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
