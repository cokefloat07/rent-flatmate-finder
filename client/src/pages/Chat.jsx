import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Home, Wifi, WifiOff, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import ChatWindow from '../components/chat/ChatWindow';
import ChatList from '../components/chat/ChatList';
import useSocket from '../hooks/useSocket';
import useAuthStore from '../store/authStore';
import { fetchChatHistory, fetchInterest } from '../services/chat.service';
import { fetchIncomingInterests, fetchMyInterests } from '../services/interest.service';
import { ROUTES, ROLES } from '../utils/constants';

export default function Chat() {
  const { interestId } = useParams();
  const navigate = useNavigate();

  // ⚠️ Select primitives individually so the component doesn't re-render
  //    on unrelated auth store changes, and so deps stay stable.
  const userId = useAuthStore((s) => s.user?.id);
  const userRole = useAuthStore((s) => s.user?.role);

  const { connected, connecting, connectionError, subscribe, joinRoom, leaveRoom, sendMessage } =
    useSocket();

  // ── State ──────────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState([]);
  const [interest, setInterest] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);
  const [joined, setJoined] = useState(false);

  // Sidebar chats
  const [chatList, setChatList] = useState([]);

  // Derived primitive (stable across renders when unchanged)
  const interestStatus = interest?.status ?? null;

  // ── Load interest metadata + history ──────────────────────────────────────
  const loadInterestAndHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);

    try {
      // 1. Fetch interest (also serves as access gate — 403 if not accepted)
      const interestData = await fetchInterest(interestId);
      setInterest(interestData);

      if (interestData.status !== 'accepted') {
        setHistoryError('This chat is not available — the interest is not accepted.');
        setHistoryLoading(false);
        return;
      }

      // 2. Fetch message history
      const history = await fetchChatHistory(interestId, { limit: 100 });
      setMessages(Array.isArray(history) ? history : []);
    } catch (err) {
      const msg = err.userMessage || 'Failed to load chat.';
      setHistoryError(msg);
      toast.error(msg);
    } finally {
      setHistoryLoading(false);
    }
  }, [interestId]);

  // ── Load sidebar list of user's other accepted interests ──────────────────
  const loadChatList = useCallback(async () => {
    if (!userRole) return;

    try {
      const fetcher = userRole === ROLES.OWNER ? fetchIncomingInterests : fetchMyInterests;
      const data = await fetcher();
      const accepted = (Array.isArray(data) ? data : []).filter((i) => i.status === 'accepted');
      setChatList(accepted);
    } catch {
      // Non-fatal — sidebar just stays empty
      setChatList([]);
    }
  }, [userRole]);

  // ── Fetch effect — depends on primitives, not callback references ────────
  useEffect(() => {
    loadInterestAndHistory();
    loadChatList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interestId, userRole]);

  // ── Socket lifecycle: join room + subscribe to messages ──────────────────
  //
  // ⚠️ Deps are PRIMITIVES ONLY (connected, interestId, interestStatus).
  //    Do NOT add joinRoom/leaveRoom/subscribe/interest here — they change
  //    reference on every render and would cause an infinite join/leave loop.
  useEffect(() => {
    if (!connected) return;
    if (interestStatus !== 'accepted') return;

    // Join the room
    joinRoom(interestId);

    // Subscribe to server confirmations
    const unsubJoined = subscribe('joined', () => {
      setJoined(true);
    });

    // Subscribe to new messages
    const unsubMsg = subscribe('new_message', (msg) => {
      // Ignore messages from other rooms (defensive)
      if (msg.interest_id !== interestId) return;

      setMessages((prev) => {
        // Deduplicate (in case server echoes our own message back)
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    // Subscribe to error events
    const unsubErr = subscribe('error', (payload) => {
      toast.error(payload?.message || 'Chat error');
    });

    return () => {
      leaveRoom(interestId);
      setJoined(false);
      unsubJoined();
      unsubMsg();
      unsubErr();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, interestId, interestStatus]);

  // ── Send handler ──────────────────────────────────────────────────────────
  const handleSend = async (content) => {
    if (!connected) {
      toast.error('Not connected — please wait.');
      return;
    }
    const ok = sendMessage(interestId, content);
    if (!ok) {
      toast.error('Failed to send — connection lost.');
    }
    // Server will echo it back via new_message; no local optimistic add needed
  };

  // ── Derived UI state ──────────────────────────────────────────────────────
  const isInputDisabled = !connected || !joined || interestStatus !== 'accepted';

  const counterpartLabel =
    userRole === ROLES.OWNER
      ? interest?.tenant_name || 'Tenant'
      : interest?.listing_location || 'Owner';

  const connectionStatus = (() => {
    if (connectionError) {
      return {
        icon: <AlertCircle size={12} />,
        label: 'Connection error',
        className: 'bg-danger/10 text-danger border-danger/30',
      };
    }
    if (!connected && connecting) {
      return {
        icon: <Loader2 size={12} className="animate-spin" />,
        label: 'Connecting…',
        className: 'bg-warning/20 text-neutral-900 border-warning/40',
      };
    }
    if (connected && joined) {
      return {
        icon: <Wifi size={12} />,
        label: 'Live',
        className: 'bg-success/15 text-success border-success/30',
      };
    }
    if (connected && !joined) {
      return {
        icon: <Loader2 size={12} className="animate-spin" />,
        label: 'Joining…',
        className: 'bg-warning/20 text-neutral-900 border-warning/40',
      };
    }
    return {
      icon: <WifiOff size={12} />,
      label: 'Offline',
      className: 'bg-neutral-100 text-neutral-700 border-neutral-300',
    };
  })();

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="page-container"
    >
      {/* ── Back button ─────────────────────────────────────────────── */}
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-700 hover:text-primary transition-colors"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* ══════════════════════════════════════════════════════════════ */}
        {/* SIDEBAR — Chat list (hidden on mobile)                       */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <aside className="hidden lg:block">
          <ChatList chats={chatList} activeId={interestId} currentUserRole={userRole} />
        </aside>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* MAIN — Chat panel                                            */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col h-[calc(100vh-14rem)] min-h-[500px]">
          {/* Header */}
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white font-semibold">
                {userRole === ROLES.OWNER ? <User size={18} /> : <Home size={18} />}
              </div>
              <div className="min-w-0">
                <h2 className="!text-lg truncate">{counterpartLabel}</h2>
                {interest && (
                  <p className="text-xs text-neutral-500">
                    Chat opened{' '}
                    {new Date(interest.responded_at || interest.created_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            {/* Connection status pill */}
            <div
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${connectionStatus.className}`}
            >
              {connectionStatus.icon}
              {connectionStatus.label}
            </div>
          </div>

          {/* Error banner */}
          {historyError && (
            <div className="mb-3 flex items-center gap-3 rounded-xl border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
              <AlertCircle size={16} />
              <span className="flex-1">{historyError}</span>
              <Link
                to={userRole === ROLES.OWNER ? ROUTES.OWNER_DASHBOARD : ROUTES.TENANT_DASHBOARD}
                className="font-semibold underline"
              >
                Back to dashboard
              </Link>
            </div>
          )}

          {/* Chat window */}
          {!historyError && (
            <div className="flex-1 min-h-0">
              <ChatWindow
                messages={messages}
                currentUserId={userId}
                loading={historyLoading}
                disabled={isInputDisabled}
                onSend={handleSend}
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
