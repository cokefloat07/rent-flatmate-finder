import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buildRoute } from '../../utils/constants';
import { formatDate } from '../../utils/formatters';

/**
 * Sidebar list of the user's active chats (accepted interests).
 *
 * Props:
 *   chats           — array of interest objects with status === 'accepted'
 *   activeId        — currently open interest ID
 *   currentUserRole — 'owner' | 'tenant' (determines which counterpart to show)
 */
export default function ChatList({ chats = [], activeId, currentUserRole }) {
  if (chats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-300 bg-surface p-6 text-center">
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
          <MessageCircle size={20} />
        </div>
        <p className="text-sm font-medium text-neutral-900">No active chats</p>
        <p className="mt-1 text-xs text-neutral-500">
          {currentUserRole === 'owner'
            ? 'Accept an interest to start chatting.'
            : 'Once an owner accepts your interest, the chat will appear here.'}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-300 bg-surface overflow-hidden">
      <div className="border-b border-neutral-300 px-4 py-3">
        <h3 className="text-sm font-semibold text-neutral-900">Active Chats ({chats.length})</h3>
      </div>

      <div className="divide-y divide-neutral-300 max-h-[500px] overflow-y-auto">
        {chats.map((chat, i) => {
          const isActive = chat.id === activeId;
          const label =
            currentUserRole === 'owner'
              ? chat.tenant_name || 'Tenant'
              : chat.listing_location || 'Owner';

          return (
            <motion.div
              key={chat.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.2 }}
            >
              <Link
                to={buildRoute.chat(chat.id)}
                className={`block px-4 py-3 transition-colors ${
                  isActive ? 'bg-primary/10' : 'hover:bg-neutral-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-semibold text-sm ${
                      isActive ? 'bg-primary text-white' : 'bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    {label.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm font-medium ${
                        isActive ? 'text-primary' : 'text-neutral-900'
                      }`}
                    >
                      {label}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      Since {formatDate(chat.responded_at || chat.created_at)}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
