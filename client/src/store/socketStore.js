import { create } from 'zustand';
import { io } from 'socket.io-client';

/**
 * Global socket.io-client instance manager.
 *
 * Contract with backend (docs/API_DOCS.md):
 *   - Socket.IO server at VITE_SOCKET_URL (root, not /api)
 *   - Default path: /socket.io
 *   - JWT passed in handshake auth: { token: "..." }
 *   - Server events emitted from backend:
 *       "joined"       → { room }
 *       "new_message"  → { id, interest_id, sender_id, content, created_at }
 *       "error"        → { message }
 *
 *   - Client events emitted TO backend:
 *       "join_room"    → { interest_id }
 *       "leave_room"   → { interest_id }
 *       "send_message" → { interest_id, content }
 *
 * Lifecycle:
 *   1. On login → call connect(token). Socket persists across page navigation.
 *   2. Every chat page uses useSocket() hook to subscribe to events.
 *   3. On logout → call disconnect(). Socket cleaned up entirely.
 */

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000';

const useSocketStore = create((set, get) => ({
  // ── State ────────────────────────────────────────────────────────────────
  socket: null, // socket.io Socket instance | null
  connected: false, // true once handshake succeeds
  connecting: false, // true during handshake
  connectionError: null,

  // ── Actions ──────────────────────────────────────────────────────────────

  /**
   * Establish a socket connection using the given JWT.
   * Safe to call multiple times — reuses existing connected socket.
   *
   * @param {string} token - JWT from authStore
   */
  connect: (token) => {
    if (!token) {
      console.warn('[socketStore] connect() called without token — skipping.');
      return;
    }

    const existing = get().socket;
    if (existing && existing.connected) {
      // Already connected — do nothing
      return;
    }

    // Clean up any stale socket first
    if (existing) {
      existing.removeAllListeners();
      existing.disconnect();
    }

    set({ connecting: true, connectionError: null }, false);

const socket = io(SOCKET_URL, {
  auth: { token },
  transports: ['polling', 'websocket'],  
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20_000,
  withCredentials: true,     
  upgrade: true,             
});

    // ── Connection lifecycle listeners ────────────────────────────────────
    socket.on('connect', () => {
      set({ connected: true, connecting: false, connectionError: null });
    });

    socket.on('disconnect', (reason) => {
      set({ connected: false });
      // Log helpful info; user-facing feedback lives in the chat page
      if (reason === 'io server disconnect') {
        // Server kicked us — auth expired or manual disconnect
        console.warn('[socketStore] Server disconnected socket:', reason);
      }
    });

    socket.on('connect_error', (err) => {
      // Fired on both first-connect failure and reconnect failures
      set({
        connected: false,
        connecting: false,
        connectionError: err.message || 'Failed to connect',
      });
      console.error('[socketStore] Connection error:', err.message);
    });

    // Backend emits generic errors on join/message failure — surface them
    socket.on('error', (payload) => {
      console.warn('[socketStore] Server error event:', payload);
    });

    set({ socket }, false);
  },

  /**
   * Fully tear down the socket.
   * Called on logout, or on component unmount if desired.
   */
  disconnect: () => {
    const socket = get().socket;
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
    }
    set({
      socket: null,
      connected: false,
      connecting: false,
      connectionError: null,
    });
  },

  /**
   * Emit a "join_room" event for an accepted interest.
   * Returns true if the emit was sent, false if socket wasn't ready.
   */
  joinRoom: (interestId) => {
    const socket = get().socket;
    if (!socket || !socket.connected) {
      console.warn('[socketStore] joinRoom called but socket not connected');
      return false;
    }
    socket.emit('join_room', { interest_id: interestId });
    return true;
  },

  /**
   * Emit "leave_room" — good hygiene when navigating away from a chat.
   */
  leaveRoom: (interestId) => {
    const socket = get().socket;
    if (!socket || !socket.connected) return false;
    socket.emit('leave_room', { interest_id: interestId });
    return true;
  },

  /**
   * Send a chat message to a room.
   */
  sendMessage: (interestId, content) => {
    const socket = get().socket;
    if (!socket || !socket.connected) {
      console.warn('[socketStore] sendMessage called but socket not connected');
      return false;
    }
    socket.emit('send_message', {
      interest_id: interestId,
      content: content.trim(),
    });
    return true;
  },
}));

export default useSocketStore;
