import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessagesSquare, Loader2 } from 'lucide-react';
import MessageBubble from './MessageBubble';

/**
 * Main chat panel — renders message list + input box.
 *
 * Props:
 *   messages       — array of Message objects (ordered oldest → newest)
 *   currentUserId  — string, used to determine "isOwn" for each bubble
 *   loading        — bool, show skeleton while history loads
 *   disabled       — bool, disable input (e.g. before joining room)
 *   onSend         — callback(content: string)
 *   emptyLabel     — string, shown when no messages exist
 */
export default function ChatWindow({
  messages = [],
  currentUserId,
  loading = false,
  disabled = false,
  onSend,
  emptyLabel = 'No messages yet — say hi!',
}) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // ── Auto-scroll to bottom when messages arrive ────────────────────────────
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages.length]);

  // ── Focus input on mount once enabled ─────────────────────────────────────
  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  // ── Send handler ──────────────────────────────────────────────────────────
  const handleSend = async (e) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending || disabled) return;

    setSending(true);
    try {
      await onSend(trimmed);
      setInput('');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    // Enter to send, Shift+Enter for newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  // ── Group consecutive messages from same sender for cleaner UI ────────────
  const shouldShowTime = (msg, prevMsg) => {
    if (!prevMsg) return true;
    if (prevMsg.sender_id !== msg.sender_id) return true;
    const gap = new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime();
    return gap > 60_000; // show time if >1min gap
  };

  return (
    <div className="flex h-full flex-col bg-neutral-100 rounded-2xl overflow-hidden border border-neutral-300">
      {/* ── Message list ───────────────────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                <div
                  className={`skeleton h-10 rounded-2xl`}
                  style={{ width: `${40 + Math.random() * 30}%` }}
                />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-neutral-500">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-200">
              <MessagesSquare size={30} strokeWidth={1.5} />
            </div>
            <p className="text-sm">{emptyLabel}</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <MessageBubble
                key={msg.id || `${msg.sender_id}-${msg.created_at}-${i}`}
                message={msg}
                isOwn={msg.sender_id === currentUserId}
                showTime={shouldShowTime(msg, messages[i - 1])}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* ── Input area ─────────────────────────────────────────────────── */}
      <form
        onSubmit={handleSend}
        className="flex items-end gap-2 border-t border-neutral-300 bg-surface p-3"
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          placeholder={disabled ? 'Connecting…' : 'Type a message… (Shift+Enter for newline)'}
          className="flex-1 resize-none rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 placeholder-neutral-500 transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-neutral-100 max-h-32"
          style={{ minHeight: '44px' }}
        />
        <motion.button
          type="submit"
          whileTap={{ scale: 0.94 }}
          disabled={disabled || sending || !input.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-soft transition-all duration-200 hover:bg-primary-dark hover:shadow-lift disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary"
          aria-label="Send message"
        >
          {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </motion.button>
      </form>
    </div>
  );
}
