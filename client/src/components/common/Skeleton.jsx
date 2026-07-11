/**
 * Generic skeleton loader block.
 *
 * Props:
 *   width  — CSS width, e.g. "100%", "12rem"
 *   height — CSS height, e.g. "1rem", "2.5rem"
 */
export default function Skeleton({ width = '100%', height = '1rem', className = '' }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, minHeight: height }}
      aria-hidden="true"
    />
  );
}
