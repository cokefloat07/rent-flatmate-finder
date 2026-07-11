import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { getScoreColor } from '../../utils/formatters';

/**
 * Animated compatibility score badge.
 *
 * Colors:
 *   ≥ 80 → green (success)
 *   50–79 → amber (warning)
 *   < 50 → red (danger)
 *
 * The number counts up from 0 → score over ~600ms.
 * Accepts `score` (0–100) and optional `explanation` string.
 */

export default function ScoreBadge({ score, explanation, size = 'md', showLabel = true }) {
  const [displayScore, setDisplayScore] = useState(0);
  const rafRef = useRef(null);

  const color = getScoreColor(score);

  const colorClasses = {
    success: 'bg-success/15 text-success ring-success/30',
    warning: 'bg-warning/25 text-neutral-900 ring-warning/30',
    danger: 'bg-danger/15 text-danger ring-danger/30',
  };

  const sizeClasses = {
    sm: 'h-10 min-w-[2.75rem] text-xs px-2',
    md: 'h-12 min-w-[3.25rem] text-sm px-2.5',
    lg: 'h-14 min-w-[3.75rem] text-base px-3',
  };

  const labelMap = {
    success: 'Great match',
    warning: 'Fair match',
    danger: 'Low match',
  };

  // ── Count-up animation ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!score || score <= 0) {
      setDisplayScore(0);
      return;
    }

    const duration = 600; // ms
    const startTime = performance.now();

    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * score));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [score]);

  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="relative group"
    >
      {/* Badge itself */}
      <div
        className={`inline-flex items-center gap-1.5 rounded-full font-bold ring-1 ring-inset
          ${colorClasses[color]} ${sizeClasses[size]}`}
      >
        <span className="tabular-nums">{displayScore}</span>
      </div>

      {/* Label below */}
      {showLabel && (
        <p
          className={`mt-1 text-xs font-medium ${
            color === 'success'
              ? 'text-success'
              : color === 'warning'
                ? 'text-neutral-700'
                : 'text-danger'
          }`}
        >
          {labelMap[color]}
        </p>
      )}

      {/* Tooltip with explanation */}
      {explanation && (
        <div
          className="absolute bottom-full left-1/2 z-30 mb-2 w-64 -translate-x-1/2 rounded-xl border border-neutral-300 bg-surface p-3 text-xs text-neutral-700 shadow-lift
          opacity-0 pointer-events-none
          group-hover:opacity-100 group-hover:pointer-events-auto
          transition-opacity duration-200"
        >
          <p className="font-medium text-neutral-900 mb-1">AI Compatibility</p>
          <p className="leading-relaxed">{explanation}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-surface" />
        </div>
      )}
    </motion.div>
  );
}
