import { motion } from 'framer-motion';

/**
 * Reusable empty state for lists/grids.
 * Props: icon (Lucide component), title, message, action (optional JSX)
 */
export default function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-16 text-center px-6"
    >
      {Icon && (
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
          <Icon size={26} />
        </div>
      )}
      <p className="text-neutral-700 text-lg font-semibold">{title}</p>
      {message && <p className="text-neutral-500 text-sm mt-1 max-w-md">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  );
}
