import useSocket from '../../hooks/useSocket';

/**
 * Invisible component that lives at the app root.
 * Its sole purpose is to run the useSocket() hook once, which triggers
 * the auto-connect / auto-disconnect lifecycle whenever the auth token
 * changes.
 *
 * Without this, the socket would only connect when a component that uses
 * useSocket() (like the Chat page) is mounted.
 */
export default function SocketManager() {
  useSocket();
  return null;
}
