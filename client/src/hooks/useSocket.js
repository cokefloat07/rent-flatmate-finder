import { useEffect, useRef } from 'react';
import useSocketStore from '../store/socketStore';
import useAuthStore from '../store/authStore';

/**
 * Primary hook for using the shared socket connection in a component.
 *
 * Responsibilities:
 *   1. Ensures the socket is connected whenever the user is authenticated.
 *   2. Auto-disconnects on logout (token cleared).
 *   3. Provides a stable subscribe() helper for event listeners that
 *      automatically cleans up on unmount.
 *
 * Usage in a chat page:
 *
 *   const { socket, connected, subscribe, joinRoom, sendMessage } = useSocket();
 *
 *   useEffect(() => {
 *     if (!connected) return;
 *     joinRoom(interestId);
 *
 *     const unsub = subscribe('new_message', (msg) => {
 *       setMessages((prev) => [...prev, msg]);
 *     });
 *
 *     return () => {
 *       leaveRoom(interestId);
 *       unsub();
 *     };
 *   }, [connected, interestId]);
 */
export default function useSocket() {
  const token = useAuthStore((s) => s.token);

  const socket = useSocketStore((s) => s.socket);
  const connected = useSocketStore((s) => s.connected);
  const connecting = useSocketStore((s) => s.connecting);
  const connectionError = useSocketStore((s) => s.connectionError);

  const connect = useSocketStore((s) => s.connect);
  const disconnect = useSocketStore((s) => s.disconnect);
  const joinRoom = useSocketStore((s) => s.joinRoom);
  const leaveRoom = useSocketStore((s) => s.leaveRoom);
  const sendMessage = useSocketStore((s) => s.sendMessage);

  // Track subscriptions this component owns so we can clean them up
  const subscriptionsRef = useRef([]);

  // ── Auto-connect / auto-disconnect based on auth state ────────────────────
  useEffect(() => {
    if (token && !socket) {
      connect(token);
    } else if (!token && socket) {
      // User logged out — tear it down
      disconnect();
    }
    // Do NOT disconnect on unmount — socket is app-wide.
  }, [token, socket, connect, disconnect]);

  // ── Cleanup all component-owned subscriptions on unmount ─────────────────
  useEffect(() => {
    return () => {
      subscriptionsRef.current.forEach((unsub) => unsub());
      subscriptionsRef.current = [];
    };
  }, []);

  /**
   * Subscribe to a socket event. Returns an unsubscribe function that
   * removes just this listener (not all listeners on the event).
   *
   * The listener is also auto-cleaned when the component unmounts.
   */
  const subscribe = (event, handler) => {
    if (!socket) {
      console.warn(`[useSocket] subscribe("${event}") called but socket not ready`);
      return () => {};
    }

    socket.on(event, handler);

    const unsubscribe = () => {
      socket.off(event, handler);
      subscriptionsRef.current = subscriptionsRef.current.filter((fn) => fn !== unsubscribe);
    };

    subscriptionsRef.current.push(unsubscribe);
    return unsubscribe;
  };

  return {
    socket,
    connected,
    connecting,
    connectionError,
    subscribe,
    joinRoom,
    leaveRoom,
    sendMessage,
    disconnect,
  };
}
