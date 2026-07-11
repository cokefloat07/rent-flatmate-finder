import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  IndianRupee,
  Calendar,
  Bed,
  Armchair,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  Home,
  User,
  Info,
  Clock,
  XCircle,
  MessageCircle,
  RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '../components/common/Button';
import Skeleton from '../components/common/Skeleton';
import ScoreBadge from '../components/listings/ScoreBadge';
import { fetchListingById } from '../services/listing.service';
import { expressInterest, fetchMyInterestForListing } from '../services/interest.service';
import { fetchMyProfile } from '../services/profile.service';
import { formatDate, formatCurrency, getScoreColor } from '../utils/formatters';
import { ROUTES, ROLES, buildRoute } from '../utils/constants';
import useAuthStore from '../store/authStore';

export default function ListingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  // ── State ──────────────────────────────────────────────────────────────────
  const [listing, setListing] = useState(null);
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [myInterest, setMyInterest] = useState(null); // null | { status, ... }
  const [expressingInterest, setExpressingInterest] = useState(false);

  const [currentPhoto, setCurrentPhoto] = useState(0);

  // ── Load listing + interest status ─────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const listingData = await fetchListingById(id);
      setListing(listingData);

      if (listingData.compatibility_score != null) {
        setScore({
          score: listingData.compatibility_score,
          explanation: listingData.score_explanation || '',
          method: listingData.score_method || 'rule-based',
        });
      }

      if (user?.role === ROLES.TENANT) {
        // Check profile
        try {
          await fetchMyProfile();
          setHasProfile(true);
        } catch {
          setHasProfile(false);
        }

        // Check existing interest
        try {
          const interest = await fetchMyInterestForListing(id);
          setMyInterest(interest);
        } catch {
          setMyInterest(null);
        }
      }
    } catch (err) {
      setError(err.userMessage || 'Failed to load listing.');
    } finally {
      setLoading(false);
    }
  }, [id, user?.role]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Photo carousel ────────────────────────────────────────────────────────
  const photos = listing?.photos || [];
  const hasPhotos = photos.length > 0;
  const nextPhoto = () => setCurrentPhoto((i) => (i + 1) % photos.length);
  const prevPhoto = () => setCurrentPhoto((i) => (i - 1 + photos.length) % photos.length);

  useEffect(() => {
    if (!hasPhotos) return;
    const handler = (e) => {
      if (e.key === 'ArrowRight') nextPhoto();
      if (e.key === 'ArrowLeft') prevPhoto();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [hasPhotos, photos.length]);

  // ── Express Interest handler ───────────────────────────────────────────────
  const handleExpressInterest = async () => {
    if (!token) {
      toast.error('Please log in to express interest.');
      navigate(ROUTES.LOGIN, { state: { from: `/listings/${id}` } });
      return;
    }

    if (user?.role !== ROLES.TENANT) {
      toast.error('Only tenants can express interest.');
      return;
    }

    if (!hasProfile) {
      toast.error('Create a tenant profile first.');
      navigate(ROUTES.TENANT_DASHBOARD);
      return;
    }

    setExpressingInterest(true);

    try {
      const result = await expressInterest(id);
      const isReApply = myInterest?.status === 'declined' || myInterest?.status === 'revoked';
      toast.success(
        isReApply
          ? 'Interest re-sent — the owner will be notified.'
          : 'Interest sent — the owner will be notified.'
      );
      setMyInterest(result);
    } catch (err) {
      toast.error(err.userMessage || 'Failed to send interest.');
    } finally {
      setExpressingInterest(false);
    }
  };

  const roomLabels = {
    single: 'Single Room',
    double: 'Double Room',
    shared: 'Shared Room',
    studio: 'Studio Apartment',
  };
  const furnishLabels = {
    furnished: 'Fully Furnished',
    'semi-furnished': 'Semi-Furnished',
    unfurnished: 'Unfurnished',
  };

  // ══════════════════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <div className="page-container">
        <div className="mb-4">
          <Skeleton width="8rem" height="2rem" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="skeleton h-80 w-full rounded-2xl" />
            <div className="card space-y-3">
              <Skeleton width="60%" height="1.5rem" />
              <Skeleton width="100%" />
              <Skeleton width="80%" />
            </div>
          </div>
          <div className="card space-y-3">
            <Skeleton width="80%" height="1.5rem" />
            <Skeleton width="100%" height="3rem" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="page-container"
      >
        <div className="card mx-auto max-w-md flex flex-col items-center py-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/10 text-danger">
            <AlertCircle size={32} />
          </div>
          <h3 className="mb-2 text-lg">Listing not found</h3>
          <p className="mb-6 text-sm text-neutral-500">
            {error || "This listing may have been removed or doesn't exist."}
          </p>
          <Link to={ROUTES.HOME} className="btn-primary">
            <Home size={16} /> Back to home
          </Link>
        </div>
      </motion.div>
    );
  }

  const scoreColor = score ? getScoreColor(score.score) : null;
  const interestStatus = myInterest?.status || null;

  // Can express interest if: no interest yet, OR previously declined/revoked (re-apply)
  const canExpressInterest =
    !listing.is_filled &&
    user?.role === ROLES.TENANT &&
    (!interestStatus || interestStatus === 'declined' || interestStatus === 'revoked');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="page-container"
    >
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-700 hover:text-primary transition-colors"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-6">
          {/* Photo Carousel */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/15 to-secondary/10 shadow-card">
            <div className="relative h-80 md:h-96">
              {hasPhotos ? (
                <>
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={currentPhoto}
                      src={photos[currentPhoto]}
                      alt={`${listing.location} — photo ${currentPhoto + 1}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="h-full w-full object-cover"
                    />
                  </AnimatePresence>

                  {photos.length > 1 && (
                    <>
                      <button
                        onClick={prevPhoto}
                        className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-lift hover:bg-white transition-colors"
                        aria-label="Previous photo"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button
                        onClick={nextPhoto}
                        className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-lift hover:bg-white transition-colors"
                        aria-label="Next photo"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </>
                  )}

                  {photos.length > 1 && (
                    <div className="absolute bottom-3 right-3 rounded-full bg-neutral-900/70 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                      {currentPhoto + 1} / {photos.length}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-primary/40">
                  <Bed size={80} strokeWidth={1} />
                </div>
              )}

              {listing.is_filled && (
                <div className="absolute left-4 top-4 rounded-full bg-danger px-4 py-1.5 text-sm font-semibold text-white shadow-lift">
                  Filled
                </div>
              )}
            </div>

            {photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto p-3 no-scrollbar">
                {photos.map((photo, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPhoto(i)}
                    className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                      i === currentPhoto
                        ? 'border-primary'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={photo}
                      alt={`Thumbnail ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details Card */}
          <div className="card">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <MapPin size={18} className="text-primary" />
                  <h1 className="!text-2xl md:!text-3xl">{listing.location}</h1>
                </div>
                <p className="text-sm text-neutral-500">Posted {formatDate(listing.created_at)}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-1 text-2xl font-bold text-primary">
                  <IndianRupee size={20} />
                  {Number(listing.rent).toLocaleString('en-IN')}
                </div>
                <p className="text-xs text-neutral-500">per month</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 border-t border-neutral-300 pt-4">
              <FeatureItem
                icon={<Bed size={18} />}
                label="Room type"
                value={roomLabels[listing.room_type] || listing.room_type}
              />
              <FeatureItem
                icon={<Armchair size={18} />}
                label="Furnishing"
                value={furnishLabels[listing.furnishing_status] || listing.furnishing_status}
              />
              <FeatureItem
                icon={<Calendar size={18} />}
                label="Available from"
                value={formatDate(listing.available_from)}
              />
            </div>
          </div>

          {/* AI Compatibility Section */}
          {score && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`overflow-hidden rounded-2xl border-2 shadow-card ${
                scoreColor === 'success'
                  ? 'border-success/30 bg-success/5'
                  : scoreColor === 'warning'
                    ? 'border-warning/40 bg-warning/5'
                    : 'border-danger/30 bg-danger/5'
              }`}
            >
              <div className="p-6">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Sparkles
                      size={20}
                      className={
                        scoreColor === 'success'
                          ? 'text-success'
                          : scoreColor === 'warning'
                            ? 'text-neutral-700'
                            : 'text-danger'
                      }
                    />
                    <h3 className="text-lg">AI Compatibility Analysis</h3>
                  </div>
                  <ScoreBadge score={score.score} size="lg" showLabel={false} />
                </div>

                <p className="text-sm leading-relaxed text-neutral-900">{score.explanation}</p>

                <div className="mt-4 flex items-center gap-2 text-xs text-neutral-500">
                  <Info size={12} />
                  <span>
                    Computed via{' '}
                    <span className="font-medium">
                      {score.method?.startsWith('llm') ? 'AI language model' : 'rule-based scoring'}
                    </span>
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:sticky lg:top-24 lg:h-fit">
          <div className="card">
            <h3 className="mb-4 text-lg">Interested?</h3>

            <div className="mb-5 flex items-center gap-3 rounded-xl bg-neutral-100 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white font-semibold">
                <User size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900">Listed by owner</p>
                <p className="text-xs text-neutral-500">You'll chat directly once accepted.</p>
              </div>
            </div>

            {/* Status-based UI */}
            {renderInterestSection({
              listing,
              user,
              interestStatus,
              myInterest,
              hasProfile,
              canExpressInterest,
              expressingInterest,
              handleExpressInterest,
              navigate,
            })}

            {/* Quick stats */}
            <div className="mt-6 border-t border-neutral-300 pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Monthly rent</span>
                <span className="font-semibold text-neutral-900">
                  {formatCurrency(listing.rent)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Available from</span>
                <span className="font-medium text-neutral-900">
                  {formatDate(listing.available_from)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Status</span>
                <span
                  className={`font-medium ${listing.is_filled ? 'text-danger' : 'text-success'}`}
                >
                  {listing.is_filled ? 'Filled' : 'Available'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Interest status renderer ─────────────────────────────────────────────────
function renderInterestSection({
  listing,
  user,
  interestStatus,
  myInterest,
  hasProfile,
  canExpressInterest,
  expressingInterest,
  handleExpressInterest,
  navigate,
}) {
  // Listing filled
  if (listing.is_filled && interestStatus !== 'accepted') {
    return (
      <div className="rounded-xl bg-danger/10 p-4 text-center">
        <p className="text-sm font-medium text-danger">This listing has been filled.</p>
      </div>
    );
  }

  // Owner viewing
  if (user?.role === ROLES.OWNER) {
    return (
      <div className="rounded-xl bg-neutral-100 p-4 text-center">
        <p className="text-sm text-neutral-700">
          You're logged in as an owner. Only tenants can express interest.
        </p>
      </div>
    );
  }

  if (user?.role === ROLES.ADMIN) {
    return (
      <div className="rounded-xl bg-neutral-100 p-4 text-center">
        <p className="text-sm text-neutral-700">Admin view — interest actions disabled.</p>
      </div>
    );
  }

  // Interest status-based UI
  if (interestStatus === 'pending') {
    return (
      <div className="rounded-xl bg-warning/10 border border-warning/30 p-4 text-center">
        <Clock size={24} className="mx-auto mb-1 text-warning" />
        <p className="text-sm font-semibold text-neutral-900">Interest Pending</p>
        <p className="mt-1 text-xs text-neutral-600">
          Waiting for the owner to respond.
        </p>
      </div>
    );
  }

  if (interestStatus === 'accepted') {
    return (
      <div className="space-y-3">
        <div className="rounded-xl bg-success/10 border border-success/30 p-4 text-center">
          <CheckCircle2 size={24} className="mx-auto mb-1 text-success" />
          <p className="text-sm font-semibold text-success">Interest Accepted!</p>
          <p className="mt-1 text-xs text-neutral-600">
            You can now chat with the owner.
          </p>
        </div>
        <Button
          variant="primary"
          fullWidth
          onClick={() => navigate(buildRoute.chat(myInterest.id))}
        >
          <MessageCircle size={16} />
          Open Chat
        </Button>
      </div>
    );
  }

  if (interestStatus === 'declined') {
    return (
      <div className="space-y-3">
        <div className="rounded-xl bg-danger/10 border border-danger/30 p-4 text-center">
          <XCircle size={24} className="mx-auto mb-1 text-danger" />
          <p className="text-sm font-semibold text-danger">Interest Declined</p>
          <p className="mt-1 text-xs text-neutral-600">
            The owner declined your previous interest.
          </p>
        </div>
        {!listing.is_filled && (
          <Button
            variant="primary"
            fullWidth
            loading={expressingInterest}
            onClick={handleExpressInterest}
          >
            <RotateCcw size={16} />
            Try Again
          </Button>
        )}
      </div>
    );
  }

  if (interestStatus === 'revoked') {
    return (
      <div className="space-y-3">
        <div className="rounded-xl bg-warning/10 border border-warning/30 p-4">
          <div className="flex items-center gap-2 justify-center mb-1">
            <AlertCircle size={20} className="text-warning" />
            <p className="text-sm font-semibold text-neutral-900">Access Revoked</p>
          </div>
          <p className="text-xs text-neutral-600 text-center">
            The owner has revoked your access.
          </p>
          {myInterest?.revoke_reason && (
            <div className="mt-2 rounded-lg bg-white/60 p-2">
              <p className="text-xs text-neutral-700 italic">
                "{myInterest.revoke_reason}"
              </p>
            </div>
          )}
        </div>
        {!listing.is_filled && (
          <Button
            variant="primary"
            fullWidth
            loading={expressingInterest}
            onClick={handleExpressInterest}
          >
            <RotateCcw size={16} />
            Re-apply
          </Button>
        )}
      </div>
    );
  }

  // No interest yet — show Express Interest button
  return (
    <>
      <Button
        variant="primary"
        fullWidth
        loading={expressingInterest}
        onClick={handleExpressInterest}
        disabled={!canExpressInterest}
      >
        <Send size={16} />
        Express Interest
      </Button>

      {!user && (
        <p className="mt-3 text-center text-xs text-neutral-500">
          You'll be asked to sign in first.
        </p>
      )}
      {user?.role === ROLES.TENANT && !hasProfile && (
        <p className="mt-3 text-center text-xs text-secondary-dark">
          Create a profile to send interest.
        </p>
      )}
    </>
  );
}

function FeatureItem({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-xs text-neutral-500">{label}</p>
        <p className="text-sm font-semibold text-neutral-900">{value}</p>
      </div>
    </div>
  );
}