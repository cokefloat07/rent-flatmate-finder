import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  User,
  Home,
  Wifi,
  WifiOff,
  AlertCircle,
  Loader2,
  Ban,
} from 'lucide-react';
import toast from 'react-hot-toast';

import ChatWindow from '../components/chat/ChatWindow';
import ChatList from '../components/chat/ChatList';
import useSocket from '../hooks/useSocket';
import useAuthStore from '../store/authStore';
import { fetchChatHistory, fetchInterest } from '../services/chat.service';
import { fetchIncomingInterests, fetchMyInterests } from '../services/interest.service';
import { ROUTES, ROLES } from '../utils/constants';
import { formatDate } from '../utils/formatters';

export default function Chat() {
  const { interestId } = useParams();
  const navigate = useNavigate();

  const userId = useAuthStore((s) => s.user?.id);
  const userRole = useAuthStore((s) => s.user?.role);

  const { connected, connecting, connectionError, subscribe, joinRoom, leaveRoom, sendMessage } =
    useSocket();

  const [messages, setMessages] = useState([]);
  const [interest, setInterest] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);
  const [joined, setJoined] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);

  const [chatList, setChatList] = useState([]);

  const interestStatus = interest?.status ?? null;

  const loadInterestAndHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);

    try {
      const interestData = await fetchInterest(interestId);
      setInterest(interestData);

      // Allow both accepted (full access) and revoked (read-only)
      if (interestData.status !== 'accepted' && interestData.status !== 'revoked') {
        setHistoryError(
          `This chat is not available (status: ${interestData.status}).`
        );
        setHistoryLoading(false);
        return;
      }

      // If revoked, set read-only immediately
      if (interestData.status === 'revoked') {
        setIsReadOnly(true);
      }

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

  const loadChatList = useCallback(async () => {
    if (!userRole) return;

    try {
      const fetcher = userRole === ROLES.OWNER ? fetchIncomingInterests : fetchMyInterests;
      const data = await fetcher();
      // Include both accepted AND revoked chats in sidebar
      const chats = (Array.isArray(data) ? data : []).filter(
        (i) => i.status === 'accepted' || i.status === 'revoked'
      );
      setChatList(chats);
    } catch {
      setChatList([]);
    }
  }, [userRole]);

  useEffect(() => {
    loadInterestAndHistory();
    loadChatList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interestId, userRole]);

  useEffect(() => {
    if (!connected) return;
    if (interestStatus !== 'accepted' && interestStatus !== 'revoked') return;

    joinRoom(interestId);

    const unsubJoined = subscribe('joined', (payload) => {
      setJoined(true);
      // Server tells us if this is a read-only session
      if (payload?.read_only) {
        setIsReadOnly(true);
      }
    });

    const unsubMsg = subscribe('new_message', (msg) => {
      if (msg.interest_id !== interestId) return;

      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    const unsubErr = subscribe('error', (payload) => {
      const msg = payload?.message || 'Chat error';
      // Suppress "revoke" errors — that's expected read-only behavior
      if (msg.toLowerCase().includes('revoked') || msg.toLowerCase().includes('view history')) {
        return;
      }
      toast.error(msg);
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

  const handleSend = async (content) => {
    if (isReadOnly) {
      toast.error('This chat is read-only. Access has been revoked.');
      return;
    }
    if (!connected) {
      toast.error('Not connected — please wait.');
      return;
    }
    const ok = sendMessage(interestId, content);
    if (!ok) {
      toast.error('Failed to send — connection lost.');
    }
  };

  const isInputDisabled =
    isReadOnly ||
    !connected ||
    !joined ||
    interestStatus !== 'accepted';

  const counterpartLabel =
    userRole === ROLES.OWNER
      ? interest?.tenant_name || 'Tenant'
      : interest?.listing_location || 'Owner';

  const connectionStatus = (() => {
    if (isReadOnly) {
      return {
        icon: <Ban size={12} />,
        label: 'Read-only',
        className: 'bg-warning/20 text-neutral-900 border-warning/40',
      };
    }
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="page-container"
    >
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-700 hover:text-primary transition-colors"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* SIDEBAR */}
        <aside className="hidden lg:block">
          <ChatList chats={chatList} activeId={interestId} currentUserRole={userRole} />
        </aside>

        {/* MAIN */}
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

            <div
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${connectionStatus.className}`}
            >
              {connectionStatus.icon}
              {connectionStatus.label}
            </div>
          </div>

          {/* Revoked banner */}
          {interestStatus === 'revoked' && !historyError && (
            <div className="mb-3 rounded-xl border border-warning/40 bg-warning/10 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/20">
                  <Ban size={16} className="text-warning" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-neutral-900">
                    {userRole === ROLES.OWNER
                      ? 'You revoked this tenant\'s access'
                      : 'Owner has revoked your access'}
                  </p>
                  {interest?.revoke_reason && (
                    <div className="mt-2 rounded-lg bg-white/70 border border-warning/20 p-3">
                      <p className="text-xs font-medium text-neutral-900 mb-1">
                        Reason:
                      </p>
                      <p className="text-sm text-neutral-700 italic">
                        "{interest.revoke_reason}"
                      </p>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-neutral-600">
                    {interest?.revoked_at && `Revoked on ${formatDate(interest.revoked_at)}. `}
                    You can view past messages but cannot send new ones.
                  </p>
                </div>
              </div>
            </div>
          )}

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
                placeholder={
                  isReadOnly
                    ? 'This chat is read-only'
                    : undefined
                }
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}