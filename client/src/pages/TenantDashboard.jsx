import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MessageCircle,
  CheckCircle,
  FolderOpen,
  Sparkles,
  Clock,
  XCircle,
  AlertCircle,
  Info,
} from 'lucide-react';

import ListingCard from '../components/listings/ListingCard';
import ListingFilters from '../components/listings/ListingFilters';
import TenantProfileForm from '../components/profile/TenantProfileForm';
import Skeleton from '../components/common/Skeleton';
import useAuthStore from '../store/authStore';
import { fetchListings } from '../services/listing.service';
import { fetchMyInterests } from '../services/interest.service';
import { fetchMyProfile } from '../services/profile.service';
import { formatDate } from '../utils/formatters';

export default function TenantDashboard() {
  const user = useAuthStore((s) => s.user);

  // ── Listings ──────────────────────────────────────────────────────────────
  const [listings, setListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [filters, setFilters] = useState({
    location: '',
    budget_min: '',
    budget_max: '',
    room_type: '',
  });

  // ── Profile ───────────────────────────────────────────────────────────────
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // ── Interests / Chats ─────────────────────────────────────────────────────
  const [interests, setInterests] = useState([]);
  const [interestsLoading, setInterestsLoading] = useState(true);

  // ── Load listings ─────────────────────────────────────────────────────────
  const loadListings = useCallback(async () => {
    setListingsLoading(true);
    try {
      const data = await fetchListings(filters);
      setListings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load listings:', err);
      setListings([]);
    } finally {
      setListingsLoading(false);
    }
  }, [filters]);

  // ── Load profile ──────────────────────────────────────────────────────────
  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const data = await fetchMyProfile();
      setProfile(data);
    } catch {
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // ── Load interests ────────────────────────────────────────────────────────
  const loadInterests = useCallback(async () => {
    setInterestsLoading(true);
    try {
      const data = await fetchMyInterests();
      setInterests(Array.isArray(data) ? data : []);
    } catch {
      setInterests([]);
    } finally {
      setInterestsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  useEffect(() => {
    loadProfile();
    loadInterests();
  }, [loadProfile, loadInterests]);

  // Auto-refresh interests every 30 seconds to catch owner actions
  useEffect(() => {
    const interval = setInterval(() => {
      loadInterests();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadInterests]);

  const handleFilterChange = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  // ── Derived — filter by status ────────────────────────────────────────────
  const acceptedInterests = interests.filter((i) => i.status === 'accepted');
  const pendingInterests = interests.filter((i) => i.status === 'pending');
  const declinedInterests = interests.filter((i) => i.status === 'declined');
  const revokedInterests = interests.filter((i) => i.status === 'revoked');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="page-container space-y-8"
    >
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-neutral-900 flex items-center gap-2">
          <Sparkles className="text-secondary" size={28} />
          Browse Listings
        </h1>
        <p className="mt-1 text-neutral-600">
          Listings ranked by AI compatibility with your profile.
        </p>
      </div>

      {/* Profile Section */}
      <section className="bg-surface rounded-2xl shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
            <MessageCircle size={18} className="text-primary" />
            Your Tenant Profile
          </h2>
          {profile && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-success bg-success/10 px-2.5 py-1 rounded-full">
              <CheckCircle size={12} /> Active
            </span>
          )}
        </div>
        {profileLoading ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : (
          <TenantProfileForm
            onSaved={() => {
              loadProfile();
              loadListings();
            }}
          />
        )}
      </section>

      {/* My Chats — Active accepted interests */}
      {acceptedInterests.length > 0 && (
        <section className="bg-surface rounded-2xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2 mb-4">
            <MessageCircle size={18} className="text-primary" />
            My Chats ({acceptedInterests.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {acceptedInterests.map((interest) => (
              <Link
                key={interest.id}
                to={`/chat/${interest.id}`}
                className="group flex items-center gap-3 rounded-xl border border-neutral-200 p-4 hover:border-primary hover:shadow-md transition-all"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                  <MessageCircle size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-neutral-900 truncate">
                    {interest.listing_location || 'Listing'}
                  </p>
                  <p className="text-xs text-neutral-500 truncate">
                    Since {formatDate(interest.responded_at || interest.created_at)}
                  </p>
                </div>
                <span className="text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Open →
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Revoked Interests — Show reason + past chat notice */}
      {revokedInterests.length > 0 && (
        <section className="bg-surface rounded-2xl shadow-md p-6 border-2 border-warning/30">
          <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2 mb-4">
            <AlertCircle size={18} className="text-warning" />
            Access Revoked ({revokedInterests.length})
          </h2>
          <div className="space-y-3">
            {revokedInterests.map((interest) => (
              <div
                key={interest.id}
                className="rounded-xl border border-warning/40 bg-warning/5 p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-900">
                      {interest.listing_location || 'Listing'}
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Access revoked on {formatDate(interest.revoked_at)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-neutral-900 bg-warning/20 px-2.5 py-1 rounded-full">
                    Revoked
                  </span>
                </div>

                {interest.revoke_reason && (
                  <div className="mt-2 rounded-lg bg-white/70 border border-warning/20 p-3">
                    <div className="flex items-start gap-2">
                      <Info size={14} className="text-warning shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-neutral-900 mb-1">
                          Owner's message:
                        </p>
                        <p className="text-sm text-neutral-700 italic">
                          "{interest.revoke_reason}"
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-xs text-neutral-500">
                    You can view past chat history or re-apply if the listing is still available.
                  </p>
                  <Link
                    to={`/chat/${interest.id}`}
                    className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <MessageCircle size={12} /> View chat history
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pending / Declined */}
      {(pendingInterests.length > 0 || declinedInterests.length > 0) && (
        <section className="bg-surface rounded-2xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">My Interests</h2>
          <div className="space-y-2">
            {pendingInterests.map((interest) => (
              <div
                key={interest.id}
                className="flex items-center justify-between rounded-lg border border-warning/30 bg-warning/5 px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-warning" />
                  <p className="text-sm font-medium text-neutral-900">
                    {interest.listing_location || 'Listing'}
                  </p>
                </div>
                <span className="text-xs font-medium text-warning bg-warning/15 px-2.5 py-1 rounded-full">
                  Pending
                </span>
              </div>
            ))}
            {declinedInterests.map((interest) => (
              <div
                key={interest.id}
                className="flex items-center justify-between rounded-lg border border-danger/20 bg-danger/5 px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <XCircle size={14} className="text-danger" />
                  <p className="text-sm font-medium text-neutral-900">
                    {interest.listing_location || 'Listing'}
                  </p>
                </div>
                <span className="text-xs font-medium text-danger bg-danger/10 px-2.5 py-1 rounded-full">
                  Declined
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Filters */}
      <ListingFilters onFilter={handleFilterChange} initial={filters} />

      {/* Listings Grid */}
      <section>
        {listingsLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-72 w-full rounded-2xl" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FolderOpen size={48} className="text-neutral-300 mb-3" />
            <p className="text-neutral-500 text-lg font-medium">No listings found</p>
            <p className="text-neutral-400 text-sm mt-1">
              Try adjusting your filters or check back later.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing, idx) => {
              const scoreData = listing.compatibility_score != null
                ? {
                    score: listing.compatibility_score,
                    explanation: listing.score_explanation,
                    method: listing.score_method,
                  }
                : null;

              return (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  score={scoreData}
                  index={idx}
                />
              );
            })}
          </div>
        )}
      </section>
    </motion.div>
  );
}