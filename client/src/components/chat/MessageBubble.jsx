import { motion } from 'framer-motion';
import { Check, CheckCheck } from 'lucide-react';

/**
 * A single chat message bubble.
 *
 * Props:
 *   message   — { id, sender_id, content, created_at, read_at? }
 *   isOwn     — true if the current user sent it
 *   showTime  — whether to display the timestamp (used to group consecutive msgs)
 */
export default function MessageBubble({ message, isOwn, showTime = true }) {
  const time = new Date(message.created_at).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`group relative max-w-[75%] md:max-w-[60%] rounded-2xl px-4 py-2.5 shadow-soft ${
          isOwn
            ? 'bg-primary text-white rounded-br-sm'
            : 'bg-surface text-neutral-900 rounded-bl-sm border border-neutral-300'
        }`}
      >
        {/* Message text */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>

        {/* Timestamp + read receipt */}
        {showTime && (
          <div
            className={`mt-1 flex items-center gap-1 text-[10px] ${
              isOwn ? 'text-white/70 justify-end' : 'text-neutral-500'
            }`}
          >
            <span>{time}</span>
            {isOwn && <>{message.read_at ? <CheckCheck size={12} /> : <Check size={12} />}</>}
          </div>
        )}
      </div>
    </motion.div>
  );
}
