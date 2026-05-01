import { useEffect, useRef } from 'react';
import { subscribe, unsubscribe } from '../ws';

/**
 * Custom React hook to subscribe to a specific WebSocket event type and handle incoming data.
 * Receives an 'event' string name and a 'callback' function.
 * Registers the callback on mount using the global WebSocket manager and cleans up on unmount.
 * Returns nothing.
 */
export function useWebSocket(event, callback) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    const handler = (data) => cbRef.current(data);
    subscribe(event, handler);
    return () => unsubscribe(event, handler);
  }, [event]);
}
