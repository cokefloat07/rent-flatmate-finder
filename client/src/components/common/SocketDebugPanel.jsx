import { motion } from 'framer-motion';
import { Wifi, WifiOff, Loader2, AlertCircle } from 'lucide-react';
import useSocketStore from '../../store/socketStore';
import useAuthStore from '../../store/authStore';

/**
 * Small floating status pill — visible only during development.
 * Shows current socket state for easy debugging.
 * Remove from App.jsx before shipping.
 */
export default function SocketDebugPanel() {
  const token = useAuthStore((s) => s.token);
  const connected = useSocketStore((s) => s.connected);
  const connecting = useSocketStore((s) => s.connecting);
  const connectionError = useSocketStore((s) => s.connectionError);

  // Only show if user is logged in
  if (!token) return null;

  let icon, label, colorClass;

  if (connecting) {
    icon = <Loader2 size={12} className="animate-spin" />;
    label = 'Connecting…';
    colorClass = 'bg-warning/20 text-neutral-900 border-warning/40';
  } else if (connected) {
    icon = <Wifi size={12} />;
    label = 'Socket connected';
    colorClass = 'bg-success/15 text-success border-success/30';
  } else if (connectionError) {
    icon = <AlertCircle size={12} />;
    label = `Error: ${connectionError}`;
    colorClass = 'bg-danger/15 text-danger border-danger/30';
  } else {
    icon = <WifiOff size={12} />;
    label = 'Socket idle';
    colorClass = 'bg-neutral-100 text-neutral-700 border-neutral-300';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`fixed bottom-4 left-4 z-50 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-soft ${colorClass}`}
    >
      {icon} {label}
    </motion.div>
  );
}
