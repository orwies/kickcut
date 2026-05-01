import { useEffect, useRef } from 'react';
import { subscribe, unsubscribe } from '../ws';

/**
 * Subscribe to a WebSocket event type.
 * @param {string} event - Event type
 * @param {Function} callback - Handler; receives event data
 */
// Hook to subscribe to a specific WebSocket event type and handle incoming data.
export function useWebSocket(event, callback) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    const handler = (data) => cbRef.current(data);
    subscribe(event, handler);
    return () => unsubscribe(event, handler);
  }, [event]);
}
