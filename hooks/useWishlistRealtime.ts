"use client";

import { useEffect, useRef, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getWsUrl(slug: string): string {
  const base = API_URL.replace(/^http/, "ws");
  return `${base}/ws/list/${slug}`;
}

export type RealtimeEvent =
  | { type: "gift_reserved"; item_id: number; reserved_count: number }
  | { type: "gift_unreserved"; item_id: number }
  | { type: "contribution_added"; item_id: number; total_amount: number; percentage: number | null }
  | { type: "item_deleted"; item_id: number };

const MAX_RECONNECT_DELAY = 30000;
const INITIAL_RECONNECT_DELAY = 1000;

export function useWishlistRealtime(
  slug: string,
  options: { onEvent?: (event: RealtimeEvent) => void; enabled?: boolean } = {}
) {
  const { onEvent, enabled = true } = options;
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);
  const wsRef = useRef<WebSocket | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!slug || !enabled) return;

    let mounted = true;

    function connect() {
      const url = getWsUrl(slug);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mounted) return;
        setConnected(true);
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
      };

      ws.onmessage = (e) => {
        if (!mounted) return;
        try {
          const data = JSON.parse(e.data) as RealtimeEvent;
          if (data.type) {
            setLastEvent(data);
            onEventRef.current?.(data);
          }
        } catch {
          // ignore invalid JSON
        }
      };

      ws.onclose = () => {
        if (!mounted) return;
        setConnected(false);
        wsRef.current = null;
        const delay = reconnectDelayRef.current;
        reconnectDelayRef.current = Math.min(
          delay * 2,
          MAX_RECONNECT_DELAY
        );
        timeoutRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        // close will fire after error
      };
    }

    connect();

    return () => {
      mounted = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setConnected(false);
    };
  }, [slug, enabled]);

  return { connected, lastEvent };
}
