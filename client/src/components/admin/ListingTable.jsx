import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Trash2,
  Search,
  User,
  DollarSign,
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

import { deleteListingAsAdmin } from '../../services/admin.service';
import Modal from '../common/Modal';
import { formatCurrency } from '../../utils/formatters';

/**
 * Admin listing management table.
 *
 * Props:
 *   listings: Array<{ id, location, rent, room_type, furnishing, is_filled, owner_name, owner_email, created_at }>
 *   loading:  boolean
 *   onChange: () => void  // Triggered to reload data in parent
 */
export default function ListingTable({ listings = [], loading = false, onChange }) {
  const [search, setSearch] = useState('');
  const [roomTypeFilter, setRoomTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState(null); // listing object to delete
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = listings.filter((l) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (l.location || '').toLowerCase().includes(q) ||
      (l.owner_name || '').toLowerCase().includes(q) ||
      (l.owner_email || '').toLowerCase().includes(q);

    const matchesType = roomTypeFilter === 'all' || l.room_type === roomTypeFilter;

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'filled' && l.is_filled) ||
      (statusFilter === 'available' && !l.is_filled);

    return matchesSearch && matchesType && matchesStatus;
  });

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirmDelete) return;
    setIsDeleting(true);
    try {
      await deleteListingAsAdmin(confirmDelete.id);
      toast.success('Listing permanently removed');
      setConfirmDelete(null);
      onChange?.();
    } catch (err) {
      toast.error(err.userMessage || 'Failed to delete listing');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatRoomType = (type) => {
    return (type || '').replace('_', ' ').toUpperCase();
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="bg-surface rounded-2xl shadow-md p-6">
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">
            Room Listings ({filtered.length})
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Oversee, inspect, or remove posted listings across the platform.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] md:flex-initial">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <input
              type="text"
              placeholder="Search location or owner…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          {/* Room Type Filter */}
          <select
            value={roomTypeFilter}
            onChange={(e) => setRoomTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          >
            <option value="all">All Room Types</option>
            <option value="single">Single Room</option>
            <option value="shared">Shared Room</option>
            <option value="studio">Studio</option>
            <option value="entire_flat">Entire Flat</option>
          </select>

          {/* Availability Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          >
            <option value="all">All Statuses</option>
            <option value="available">Available Only</option>
            <option value="filled">Filled / Closed</option>
          </select>
        </div>
      </div>

      {/* Grid Loader or Table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-neutral-500">
          <Home size={36} className="mx-auto text-neutral-300 mb-2" />
          No listings found matching your search and filter criteria.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-neutral-500 border-b border-neutral-200">
                <th className="pb-3 pr-4">Location</th>
                <th className="pb-3 pr-4">Rent</th>
                <th className="pb-3 pr-4">Room Specs</th>
                <th className="pb-3 pr-4">Posted By</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((listing) => (
                  <motion.tr
                    key={listing.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/50"
                  >
                    {/* Location */}
                    <td className="py-4 pr-4">
                      <div
                        className="font-medium text-neutral-900 truncate max-w-[180px] md:max-w-[240px]"
                        title={listing.location}
                      >
                        {listing.location}
                      </div>
                      <div className="text-xs text-neutral-500 mt-0.5">ID: {listing.id}</div>
                    </td>

                    {/* Rent */}
                    <td className="py-4 pr-4 font-medium text-neutral-900">
                      <span className="inline-flex items-center text-primary">
                        <DollarSign size={14} className="-mr-0.5" />
                        {formatCurrency ? formatCurrency(listing.rent) : `${listing.rent}/mo`}
                      </span>
                    </td>

                    {/* Room Specs */}
                    <td className="py-4 pr-4">
                      <div className="text-neutral-800 text-xs font-semibold">
                        {formatRoomType(listing.room_type)}
                      </div>
                      <div className="text-xs text-neutral-500 mt-0.5 capitalize">
                        {listing.furnishing || 'unfurnished'}
                      </div>
                    </td>

                    {/* Posted By */}
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2">
                        <User size={13} className="text-neutral-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-neutral-900 font-medium truncate max-w-[120px]">
                            {listing.owner_name || 'Owner'}
                          </p>
                          <p className="text-xs text-neutral-500 truncate max-w-[140px]">
                            {listing.owner_email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 pr-4">
                      {listing.is_filled ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-full">
                          <XCircle size={12} /> Filled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-success bg-success/15 px-2.5 py-1 rounded-full">
                          <CheckCircle size={12} /> Available
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        {/* Inspect details */}
                        <Link
                          to={`/listings/${listing.id}`}
                          className="p-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:border-primary hover:text-primary transition-colors"
                          title="View Listing details"
                        >
                          <Eye size={14} />
                        </Link>

                        {/* Force delete */}
                        <button
                          onClick={() => setConfirmDelete(listing)}
                          className="p-1.5 rounded-lg border border-neutral-200 text-neutral-500 hover:border-danger hover:text-danger transition-colors"
                          title="Delete Listing"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation modal */}
      <Modal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Remove Listing?"
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-danger/5 border border-danger/10 p-3 text-sm text-danger flex items-start gap-2">
            <div>
              <p className="font-semibold">Warning: Permanent Operation</p>
              <p className="text-xs text-danger/80 mt-0.5">
                This will delete the listing and break any current matching interests. Active chats
                connected to this listing will be disabled.
              </p>
            </div>
          </div>

          <p className="text-sm text-neutral-700">
            Are you sure you want to permanently remove this listing at:
            <br />
            <strong className="block text-neutral-950 mt-1 truncate bg-neutral-100 px-3 py-2 rounded-lg">
              {confirmDelete?.location}
            </strong>
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setConfirmDelete(null)}
              className="px-4 py-2 rounded-lg border border-neutral-200 text-sm font-medium hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 rounded-lg bg-danger text-white text-sm font-medium hover:bg-danger/95 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
            >
              {isDeleting && <Loader2 size={14} className="animate-spin" />}
              Delete Listing
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
