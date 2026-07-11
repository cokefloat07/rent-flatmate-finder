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
} from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '../components/common/Button';
import Skeleton from '../components/common/Skeleton';
import ScoreBadge from '../components/listings/ScoreBadge';
import { fetchListingById } from '../services/listing.service';
import { expressInterest } from '../services/interest.service';
import { fetchMyProfile } from '../services/profile.service';
import { formatDate, formatCurrency, getScoreColor } from '../utils/formatters';
import { ROUTES, ROLES } from '../utils/constants';
import useAuthStore from '../store/authStore';

// ── Mock data ────────────────────────────────────────────────────────────────
const MOCK_LISTING = {
  id: 'mockDetail1',
  owner_id: 'owner-123',
  location: 'Indiranagar, Bengaluru',
  rent: 12000,
  available_from: '2025-08-01',
  room_type: 'single',
  furnishing_status: 'furnished',
  photos: [
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80',
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80',
  ],
  is_filled: false,
  created_at: '2025-07-01T10:00:00Z',
};

const MOCK_SCORE = {
  score: 87,
  explanation:
    'Great match! The location aligns with your preferred area of Indiranagar. The rent of ₹12,000/month falls comfortably within your budget range. The furnished single room type matches your typical preferences.',
  method: 'llm',
};

const USE_MOCK = false;

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
  const [interestSent, setInterestSent] = useState(false);
  const [expressingInterest, setExpressingInterest] = useState(false);

  // Photo carousel
  const [currentPhoto, setCurrentPhoto] = useState(0);

  // ── Load listing + optional profile check ──────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 500));
      setListing(MOCK_LISTING);
      setScore(MOCK_SCORE);
      setHasProfile(true);
      setLoading(false);
      return;
    }

    try {
      const listingData = await fetchListingById(id);
      setListing(listingData);

      // Extract inline score if backend included it (tenants only)
      if (listingData.compatibility_score != null) {
        setScore({
          score: listingData.compatibility_score,
          explanation: listingData.score_explanation || '',
          method: listingData.score_method || 'rule-based',
        });
      }

      // Check profile existence for tenants
      if (user?.role === ROLES.TENANT) {
        try {
          await fetchMyProfile();
          setHasProfile(true);
        } catch {
          setHasProfile(false);
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

  // ── Photo carousel handlers ────────────────────────────────────────────────
  const photos = listing?.photos || [];
  const hasPhotos = photos.length > 0;

  const nextPhoto = () => setCurrentPhoto((i) => (i + 1) % photos.length);
  const prevPhoto = () => setCurrentPhoto((i) => (i - 1 + photos.length) % photos.length);

  // Keyboard nav for carousel
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

    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 400));
      toast.success('Interest sent! (mock)');
      setInterestSent(true);
      setExpressingInterest(false);
      return;
    }

    try {
      await expressInterest(id);
      toast.success('Interest sent — the owner will be notified.');
      setInterestSent(true);
    } catch (err) {
      toast.error(err.userMessage || 'Failed to send interest.');
    } finally {
      setExpressingInterest(false);
    }
  };

  // ── Labels ─────────────────────────────────────────────────────────────────
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
  // LOADING STATE
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
              <Skeleton width="90%" />
            </div>
          </div>
          <div className="card space-y-3">
            <Skeleton width="80%" height="1.5rem" />
            <Skeleton width="100%" height="3rem" />
            <Skeleton width="100%" />
            <Skeleton width="70%" />
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ERROR STATE
  // ══════════════════════════════════════════════════════════════════════════
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

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN CONTENT
  // ══════════════════════════════════════════════════════════════════════════
  const scoreColor = score ? getScoreColor(score.score) : null;
  const canExpressInterest =
    !interestSent && !listing.is_filled && (!user || user.role === ROLES.TENANT);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="page-container"
    >
      {/* ── Back button ─────────────────────────────────────────────────── */}
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-700 hover:text-primary transition-colors"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ══════════════════════════════════════════════════════════════ */}
        {/* LEFT COLUMN — Photo + Details                                */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-2 space-y-6">
          {/* ── Photo Carousel ────────────────────────────────────────── */}
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

                  {/* Navigation arrows */}
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

                  {/* Photo count indicator */}
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

              {/* Filled overlay */}
              {listing.is_filled && (
                <div className="absolute left-4 top-4 rounded-full bg-danger px-4 py-1.5 text-sm font-semibold text-white shadow-lift">
                  Filled
                </div>
              )}
            </div>

            {/* Thumbnail row */}
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

          {/* ── Details Card ──────────────────────────────────────────── */}
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

            {/* Feature grid */}
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

          {/* ── AI Compatibility Section ──────────────────────────────── */}
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
                      {score.method === 'llm' ? 'AI language model' : 'rule-based scoring'}
                    </span>
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Info panel when no score (guest / non-tenant) ─────────── */}
          {!score && !user && (
            <div className="card bg-primary/5 border border-primary/20">
              <div className="flex items-start gap-3">
                <Sparkles size={20} className="shrink-0 text-primary mt-0.5" />
                <div>
                  <h4 className="font-semibold text-neutral-900 mb-1">
                    Want a personalised compatibility score?
                  </h4>
                  <p className="text-sm text-neutral-700 mb-3">
                    Sign up as a tenant and create a profile to see how well this listing matches
                    your preferences.
                  </p>
                  <Link to={ROUTES.REGISTER} className="btn-primary !text-sm">
                    Get started
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* RIGHT COLUMN — Action Panel (sticky on desktop)              */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <div className="lg:sticky lg:top-24 lg:h-fit">
          <div className="card">
            <h3 className="mb-4 text-lg">Interested?</h3>

            {/* Owner placeholder */}
            <div className="mb-5 flex items-center gap-3 rounded-xl bg-neutral-100 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white font-semibold">
                <User size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900">Listed by owner</p>
                <p className="text-xs text-neutral-500">You'll chat directly once accepted.</p>
              </div>
            </div>

            {/* Status banners */}
            {listing.is_filled ? (
              <div className="rounded-xl bg-danger/10 p-4 text-center">
                <p className="text-sm font-medium text-danger">This listing has been filled.</p>
              </div>
            ) : interestSent ? (
              <div className="rounded-xl bg-success/10 p-4 text-center">
                <CheckCircle2 size={24} className="mx-auto mb-1 text-success" />
                <p className="text-sm font-semibold text-success">Interest sent!</p>
                <p className="mt-1 text-xs text-neutral-500">
                  You'll be notified when the owner responds.
                </p>
              </div>
            ) : user?.role === ROLES.OWNER ? (
              <div className="rounded-xl bg-neutral-100 p-4 text-center">
                <p className="text-sm text-neutral-700">
                  You're logged in as an owner. Only tenants can express interest.
                </p>
              </div>
            ) : user?.role === ROLES.ADMIN ? (
              <div className="rounded-xl bg-neutral-100 p-4 text-center">
                <p className="text-sm text-neutral-700">Admin view — interest actions disabled.</p>
              </div>
            ) : (
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

                {/* Contextual hints below button */}
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
            )}

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

// ── Small helper ─────────────────────────────────────────────────────────────
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
