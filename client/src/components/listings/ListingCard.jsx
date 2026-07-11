import { motion } from 'framer-motion';
import { MapPin, Calendar, Bed, Armchair, IndianRupee } from 'lucide-react';
import { Link } from 'react-router-dom';
import ScoreBadge from './ScoreBadge';
import { formatDate } from '../../utils/formatters';
import { buildRoute } from '../../utils/constants';

/**
 * A single listing card.
 *
 * Props:
 *   listing    — the listing object from the API (or mock)
 *   score      — { score, explanation, method } | null
 *   index      — used for stagger delay
 *   onExpress  — callback for "Express Interest" button (tenant only)
 */

export default function ListingCard({ listing, score, index = 0, onExpress }) {
  const staggerDelay = index * 0.07;

  const roomTypeLabels = {
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: staggerDelay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.18 } }}
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-surface shadow-card transition-shadow duration-200 hover:shadow-lift"
    >
      {/* ── Photo area (uses first photo or a gradient placeholder) ──────── */}
      <div className="relative h-44 overflow-hidden bg-gradient-to-br from-primary/20 via-primary-light/10 to-secondary/10">
        {listing.photos && listing.photos.length > 0 ? (
          <img
            src={listing.photos[0]}
            alt={listing.location}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-primary/40">
            <Bed size={48} strokeWidth={1.2} />
          </div>
        )}

        {/* Score badge — top-right */}
        {score && (
          <div className="absolute right-3 top-3">
            <ScoreBadge
              score={score.score}
              explanation={score.explanation}
              size="md"
              showLabel={false}
            />
          </div>
        )}

        {/* Filled badge */}
        {listing.is_filled && (
          <div className="absolute left-3 top-3 rounded-full bg-danger px-3 py-1 text-xs font-semibold text-white">
            Filled
          </div>
        )}
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col p-5">
        {/* Location + price row */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 text-neutral-900">
            <MapPin size={15} className="shrink-0 text-primary" />
            <span className="font-semibold leading-tight">{listing.location}</span>
          </div>
          <div className="flex items-center gap-0.5 shrink-0 text-lg font-bold text-primary">
            <IndianRupee size={14} />
            <span>{Number(listing.rent).toLocaleString('en-IN')}</span>
            <span className="text-xs font-normal text-neutral-500">/mo</span>
          </div>
        </div>

        {/* Tags */}
        <div className="mb-4 flex flex-wrap gap-2">
          <span className="badge bg-primary/10 text-primary-dark">
            <Bed size={12} /> {roomTypeLabels[listing.room_type] || listing.room_type}
          </span>
          <span className="badge bg-neutral-100 text-neutral-700">
            <Armchair size={12} />{' '}
            {furnishLabels[listing.furnishing_status] || listing.furnishing_status}
          </span>
          <span className="badge bg-neutral-100 text-neutral-700">
            <Calendar size={12} /> {formatDate(listing.available_from)}
          </span>
        </div>

        {/* Score explanation inline (if present) */}
        {score?.explanation && (
          <p className="mb-4 line-clamp-2 text-xs leading-relaxed text-neutral-500">
            {score.explanation}
          </p>
        )}

        {/* Spacer pushes buttons to bottom */}
        <div className="mt-auto flex gap-2">
          <Link
            to={buildRoute.listingDetails(listing.id)}
            className="btn-ghost flex-1 !justify-center text-sm"
          >
            View details
          </Link>
          {onExpress && !listing.is_filled && (
            <button
              onClick={() => onExpress(listing.id)}
              className="btn-primary flex-1 !justify-center text-sm"
            >
              Express Interest
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
