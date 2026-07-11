import { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ROOM_TYPES } from '../../utils/constants';

/**
 * Filter bar for the tenant browse view.
 *
 * Props:
 *   onFilter — callback(filters) called when user applies filters
 *   initial  — default filter values
 */
export default function ListingFilters({ onFilter, initial = {} }) {
  const [location, setLocation] = useState(initial.location || '');
  const [budgetMax, setBudgetMax] = useState(initial.budgetMax || '');
  const [roomType, setRoomType] = useState(initial.roomType || '');
  const [expanded, setExpanded] = useState(false);

  const activeCount = [location, budgetMax, roomType].filter(Boolean).length;

  const handleApply = () => {
    onFilter({
      location: location.trim(),
      budget_max: budgetMax ? Number(budgetMax) : undefined,
      room_type: roomType || undefined,
    });
  };

  const handleReset = () => {
    setLocation('');
    setBudgetMax('');
    setRoomType('');
    onFilter({});
  };

  return (
    <div className="mb-6 rounded-2xl bg-surface p-4 shadow-soft md:p-5">
      {/* ── Main row: search + toggle ─────────────────────────────────── */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500"
          />
          <input
            type="text"
            placeholder="Search by location…"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
            className="input-base !pl-10"
          />
        </div>

        <button
          onClick={() => setExpanded((v) => !v)}
          className={`btn-ghost relative !px-3 ${expanded ? '!border-primary !text-primary' : ''}`}
          aria-label="Toggle filters"
        >
          <SlidersHorizontal size={18} />
          {activeCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </button>

        <button onClick={handleApply} className="btn-primary !px-4 text-sm">
          Search
        </button>
      </div>

      {/* ── Expandable filters ────────────────────────────────────────── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 grid gap-4 border-t border-neutral-300 pt-4 sm:grid-cols-2 md:grid-cols-3">
              {/* Budget max */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-900">
                  Max budget (₹/mo)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 15000"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                  className="input-base"
                  min="0"
                />
              </div>

              {/* Room type */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-900">
                  Room type
                </label>
                <select
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value)}
                  className="input-base"
                >
                  <option value="">Any</option>
                  {ROOM_TYPES.map((rt) => (
                    <option key={rt.value} value={rt.value}>
                      {rt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reset */}
              <div className="flex items-end">
                {activeCount > 0 && (
                  <button
                    onClick={handleReset}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-700 hover:text-danger"
                  >
                    <X size={14} /> Clear filters
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
