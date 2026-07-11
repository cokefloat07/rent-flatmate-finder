import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  FolderOpen,
  MapPin,
  Bed,
  IndianRupee,
  Calendar,
  Armchair,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Pencil,
  MessageCircle,
  Users,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

import Modal from '../components/common/Modal';
import ListingForm from '../components/listings/ListingForm';
import Skeleton from '../components/common/Skeleton';
import Button from '../components/common/Button';
import {
  fetchMyListings,
  deleteListing,
  setListingFilled,
} from '../services/listing.service';
import {
  fetchIncomingInterests,
  respondToInterest,
} from '../services/interest.service';
import { formatDate } from '../utils/formatters';
import { buildRoute } from '../utils/constants';

export default function OwnerDashboard() {
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────────────────
  const [listings, setListings] = useState([]);
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editListing, setEditListing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [pendingActionId, setPendingActionId] = useState(null);

  // ── Data loading ───────────────────────────────────────────────────────
  const loadListings = useCallback(async () => {
    try {
      const data = await fetchMyListings();
      setListings(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.userMessage || 'Failed to load listings.');
    }
  }, []);

  const loadInterests = useCallback(async () => {
    try {
      const data = await fetchIncomingInterests();
      setInterests(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.userMessage || 'Failed to load interests.');
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadListings(), loadInterests()]);
    setLoading(false);
  }, [loadListings, loadInterests]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!confirmDelete) return;

    setPendingActionId(confirmDelete.id);

    try {
      await deleteListing(confirmDelete.id);

      setListings((prev) =>
        prev.filter((listing) => listing.id !== confirmDelete.id)
      );

      toast.success('Listing deleted.');
      setConfirmDelete(null);
    } catch (err) {
      toast.error(err.userMessage || 'Failed to delete listing.');
    } finally {
      setPendingActionId(null);
    }
  };

  const handleToggleFilled = async (listing) => {
    const nextFilled = !listing.is_filled;
    setPendingActionId(listing.id);

    // Optimistic update for instant feedback
    setListings((prev) =>
      prev.map((item) =>
        item.id === listing.id ? { ...item, is_filled: nextFilled } : item
      )
    );

    try {
      await setListingFilled(listing.id, nextFilled);

      toast.success(
        nextFilled ? 'Marked as filled.' : 'Marked as available.'
      );

      // If we just marked filled, competing interests may have been
      // auto-declined by the backend — but that only happens on the
      // accept-interest flow. Manual mark-filled from the owner side
      // does not auto-decline pending interests, so no interest reload
      // is required here.
    } catch (err) {
      // Roll back optimistic update on failure
      setListings((prev) =>
        prev.map((item) =>
          item.id === listing.id
            ? { ...item, is_filled: listing.is_filled }
            : item
        )
      );

      toast.error(err.userMessage || 'Failed to update listing.');
    } finally {
      setPendingActionId(null);
    }
  };

  const handleRespondInterest = async (interestId, action) => {
    const isAccept = action === 'accept';
    const label = isAccept ? 'accept' : 'decline';

    setPendingActionId(interestId);

    try {
      await respondToInterest(interestId, action);

      toast.success(
        isAccept ? 'Interest accepted.' : 'Interest declined.'
      );

      // Reload both because accepting one may auto-decline others
      // and mark the listing as filled on the backend.
      await loadAll();
    } catch (err) {
      toast.error(err.userMessage || `Failed to ${label} interest.`);
    } finally {
      setPendingActionId(null);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────
  const pendingInterests = interests.filter(
    (interest) => interest.status === 'pending'
  );
  const processedInterests = interests.filter(
    (interest) => interest.status !== 'pending'
  );

  const getListingLocation = (listingId) => {
    return (
      listings.find((listing) => listing.id === listingId)?.location ||
      'Unknown'
    );
  };

  // ── Labels ─────────────────────────────────────────────────────────────
  const roomLabels = {
    single: 'Single',
    double: 'Double',
    shared: 'Shared',
    studio: 'Studio',
  };

  const furnishLabels = {
    furnished: 'Furnished',
    'semi-furnished': 'Semi-furnished',
    unfurnished: 'Unfurnished',
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="page-container"
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1>Owner Dashboard</h1>
          <p className="text-neutral-700">
            Manage your listings and respond to tenant interests.
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus size={18} /> Post New Listing
        </Button>
      </div>

      {/* ── Stats bar ──────────────────────────────────────────────── */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          icon={<Bed size={20} />}
          label="Total listings"
          value={listings.length}
          color="primary"
        />
        <StatCard
          icon={<Eye size={20} />}
          label="Available"
          value={listings.filter((listing) => !listing.is_filled).length}
          color="success"
        />
        <StatCard
          icon={<EyeOff size={20} />}
          label="Filled"
          value={listings.filter((listing) => listing.is_filled).length}
          color="danger"
        />
        <StatCard
          icon={<Clock size={20} />}
          label="Pending interests"
          value={pendingInterests.length}
          color="secondary"
        />
      </div>

      {/* ── Loading ────────────────────────────────────────────────── */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card">
              <Skeleton width="40%" height="1.25rem" />
              <div className="mt-3 space-y-2">
                <Skeleton width="100%" />
                <Skeleton width="70%" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <>
          {/* ═══════════════════════════════════════════════════════════ */}
          {/* SECTION 1 — MY LISTINGS                                   */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <section className="mb-10">
            <h2 className="mb-4 flex items-center gap-2 text-xl">
              <Bed size={20} className="text-primary" /> My Listings
            </h2>

            {listings.length === 0 ? (
              <div className="card flex flex-col items-center py-12 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-500">
                  <FolderOpen size={28} />
                </div>
                <h3 className="mb-1 text-lg">No listings yet</h3>
                <p className="mb-4 text-sm text-neutral-500">
                  Post your first room listing to start receiving interests.
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus size={16} /> Post a listing
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {listings.map((listing, index) => {
                  const isBusy = pendingActionId === listing.id;

                  return (
                    <motion.div
                      key={listing.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.25,
                        delay: index * 0.05,
                      }}
                      className="card"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        {/* Photo */}
                        <div className="h-32 w-full shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-primary/15 to-secondary/10 sm:h-28 sm:w-40">
                          {listing.photos?.length > 0 ? (
                            <img
                              src={listing.photos[0]}
                              alt={listing.location}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-primary/30">
                              <Bed size={32} />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <MapPin
                                  size={14}
                                  className="text-primary"
                                />
                                <span className="font-semibold text-neutral-900">
                                  {listing.location}
                                </span>
                              </div>
                              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-neutral-700">
                                <span className="flex items-center gap-1">
                                  <IndianRupee size={13} />
                                  {Number(listing.rent).toLocaleString(
                                    'en-IN'
                                  )}
                                  /mo
                                </span>
                                <span className="flex items-center gap-1">
                                  <Bed size={13} />{' '}
                                  {roomLabels[listing.room_type]}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Armchair size={13} />{' '}
                                  {
                                    furnishLabels[
                                      listing.furnishing_status
                                    ]
                                  }
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar size={13} />{' '}
                                  {formatDate(listing.available_from)}
                                </span>
                              </div>
                            </div>

                            {/* Status badge */}
                            <span
                              className={`badge shrink-0 ${
                                listing.is_filled
                                  ? 'bg-danger/15 text-danger'
                                  : 'bg-success/15 text-success'
                              }`}
                            >
                              {listing.is_filled ? 'Filled' : 'Available'}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleToggleFilled(listing)}
                              aria-label={
                                listing.is_filled
                                  ? `Mark ${listing.location} as available`
                                  : `Mark ${listing.location} as filled`
                              }
                              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                                listing.is_filled
                                  ? 'bg-success/10 text-success hover:bg-success/20'
                                  : 'bg-danger/10 text-danger hover:bg-danger/20'
                              }`}
                            >
                              {isBusy ? (
                                <Loader2
                                  size={13}
                                  className="animate-spin"
                                />
                              ) : listing.is_filled ? (
                                <>
                                  <Eye size={13} /> Mark available
                                </>
                              ) : (
                                <>
                                  <EyeOff size={13} /> Mark filled
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => setEditListing(listing)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-200 transition-colors"
                            >
                              <Pencil size={13} /> Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => setConfirmDelete(listing)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-danger/10 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/20 transition-colors"
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* SECTION 2 — PENDING INTERESTS                             */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <section className="mb-10">
            <h2 className="mb-4 flex items-center gap-2 text-xl">
              <Users size={20} className="text-secondary" /> Pending
              Interests
              {pendingInterests.length > 0 && (
                <span className="badge bg-secondary/20 text-secondary-dark">
                  {pendingInterests.length}
                </span>
              )}
            </h2>

            {pendingInterests.length === 0 ? (
              <div className="card flex flex-col items-center py-10 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
                  <Clock size={24} />
                </div>
                <h3 className="mb-1 text-base">No pending interests</h3>
                <p className="text-sm text-neutral-500">
                  When tenants express interest in your listings, they'll
                  appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingInterests.map((interest, index) => {
                  const isBusy = pendingActionId === interest.id;

                  return (
                    <motion.div
                      key={interest.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.2,
                        delay: index * 0.05,
                      }}
                      className="card !p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        {/* Tenant info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                              {(interest.tenant_name || 'T').charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-neutral-900">
                                {interest.tenant_name || 'Tenant'}
                              </p>
                              <p className="truncate text-xs text-neutral-500">
                                Interested in{' '}
                                <span className="font-medium text-neutral-700">
                                  {interest.listing_location ||
                                    getListingLocation(
                                      interest.listing_id
                                    )}
                                </span>
                              </p>
                            </div>
                          </div>

                          {/* Score + explanation */}
                          {interest.compatibility_score != null && (
                            <div className="mt-2 rounded-xl bg-neutral-100 px-3 py-2">
                              <div className="flex items-center gap-2 text-sm">
                                <span
                                  className={`font-bold ${
                                    interest.compatibility_score >= 80
                                      ? 'text-success'
                                      : interest.compatibility_score >=
                                          50
                                        ? 'text-neutral-900'
                                        : 'text-danger'
                                  }`}
                                >
                                  {interest.compatibility_score}/100
                                </span>
                                <span className="text-xs text-neutral-500">
                                  compatibility
                                </span>
                              </div>
                              {interest.score_explanation && (
                                <p className="mt-1 line-clamp-2 text-xs text-neutral-500">
                                  {interest.score_explanation}
                                </p>
                              )}
                            </div>
                          )}

                          <p className="mt-2 text-xs text-neutral-500">
                            Received {formatDate(interest.created_at)}
                          </p>
                        </div>

                        {/* Accept / Decline buttons */}
                        <div className="flex shrink-0 gap-2">
                          <Button
                            variant="ghost"
                            disabled={isBusy}
                            onClick={() =>
                              handleRespondInterest(
                                interest.id,
                                'decline'
                              )
                            }
                            className="!border-danger/30 !text-danger hover:!bg-danger/10"
                          >
                            {isBusy ? (
                              <Loader2
                                size={13}
                                className="animate-spin"
                              />
                            ) : (
                              <>
                                <XCircle size={15} /> Decline
                              </>
                            )}
                          </Button>
                          <Button
                            variant="primary"
                            disabled={isBusy}
                            onClick={() =>
                              handleRespondInterest(
                                interest.id,
                                'accept'
                              )
                            }
                          >
                            {isBusy ? (
                              <Loader2
                                size={13}
                                className="animate-spin"
                              />
                            ) : (
                              <>
                                <CheckCircle2 size={15} /> Accept
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* SECTION 3 — PROCESSED INTERESTS                           */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {processedInterests.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 flex items-center gap-2 text-xl">
                <CheckCircle2 size={20} className="text-success" /> History
              </h2>
              <div className="space-y-3">
                {processedInterests.map((interest) => (
                  <div key={interest.id} className="card !p-4 opacity-80">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-sm font-bold text-neutral-700">
                        {(interest.tenant_name || 'T').charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-neutral-900">
                          {interest.tenant_name} —{' '}
                          {interest.listing_location ||
                            getListingLocation(interest.listing_id)}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {interest.compatibility_score}/100 compatibility
                        </p>
                      </div>
                      <span
                        className={`badge shrink-0 ${
                          interest.status === 'accepted'
                            ? 'bg-success/15 text-success'
                            : 'bg-danger/15 text-danger'
                        }`}
                      >
                        {interest.status === 'accepted'
                          ? '✓ Accepted'
                          : '✗ Declined'}
                      </span>
                      {interest.status === 'accepted' && (
                        <button
                          type="button"
                          onClick={() =>
                            navigate(buildRoute.chat(interest.id))
                          }
                          className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                        >
                          <MessageCircle size={13} /> Chat
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* MODALS                                                          */}
      {/* ═════════════════════════════════════════════════════════════════ */}

      {/* Create listing */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Post New Listing"
        size="lg"
      >
        <ListingForm
          onSuccess={() => {
            loadAll();
            setShowCreateModal(false);
          }}
          onClose={() => setShowCreateModal(false)}
        />
      </Modal>

      {/* Edit listing */}
      <Modal
        open={!!editListing}
        onClose={() => setEditListing(null)}
        title="Edit Listing"
        size="lg"
      >
        {editListing && (
          <ListingForm
            listing={editListing}
            onSuccess={() => {
              loadAll();
              setEditListing(null);
            }}
            onClose={() => setEditListing(null)}
          />
        )}
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete listing?"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl bg-danger/5 border border-danger/20 p-3">
            <AlertTriangle
              size={18}
              className="text-danger mt-0.5 shrink-0"
            />
            <div className="text-sm text-danger">
              <p className="font-semibold">This cannot be undone.</p>
              <p className="text-danger/80 mt-0.5">
                Deleting this listing will also remove all cached
                compatibility scores. Any pending interests will remain
                but no longer link to a live listing.
              </p>
            </div>
          </div>

          <p className="text-sm text-neutral-700">
            Are you sure you want to delete the listing at{' '}
            <strong className="text-neutral-900">
              {confirmDelete?.location}
            </strong>
            ?
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => setConfirmDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleDelete}
              disabled={pendingActionId === confirmDelete?.id}
              className="!bg-danger hover:!bg-danger/90"
            >
              {pendingActionId === confirmDelete?.id && (
                <Loader2 size={14} className="animate-spin" />
              )}
              Delete listing
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// STAT CARD
// ═════════════════════════════════════════════════════════════════════════

function StatCard({ icon, label, value, color }) {
  const colorMap = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    danger: 'bg-danger/10 text-danger',
    secondary: 'bg-secondary/10 text-secondary-dark',
  };

  return (
    <div className="rounded-2xl bg-surface p-4 shadow-soft">
      <div className={`mb-2 inline-flex rounded-xl p-2 ${colorMap[color]}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-neutral-900">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}