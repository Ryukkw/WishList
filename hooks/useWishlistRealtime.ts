"use client";

import { useEffect, useRef, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getWsUrl(slug: string): string {
  try {
    const url = new URL(API_URL);
    const protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${url.host}/ws/list/${encodeURIComponent(slug)}`;
  } catch {
    const base = API_URL.replace(/^http/, "ws").replace(/\/+$/, "");
    return `${base}/ws/list/${encodeURIComponent(slug)}`;
  }
}

export type RealtimeItem = {
  id: number;
  title: string;
  url: string | null;
  price: number | string | null;
  image_url: string | null;
  description?: string | null;
  type: string;
  target_amount: number | string | null;
  position: number;
  status: string;
  reservation_count?: number;
  reserved_by?: string | null;
  contribution_total?: number | string | null;
  contribution_percentage?: number | null;
};

export type RealtimeEvent =
  | { type: "gift_reserved"; item_id: number; reserved_count: number; reserved_by?: string }
  | { type: "gift_unreserved"; item_id: number }
  | { type: "contribution_added"; item_id: number; total_amount: number; percentage: number | null }
  | { type: "item_deleted"; item_id: number }
  | { type: "item_added"; item: RealtimeItem }
  | { type: "item_updated"; item: RealtimeItem }
  | {
      type: "wishlist_updated";
      title?: string;
      description?: string | null;
      event_date?: string | null;
      show_owner?: boolean;
      owner_name?: string | null;
      owner_avatar_url?: string | null;
      show_reserved_to_owner?: boolean;
      show_reserved_to_guests?: boolean;
    }
  | { type: "items_reordered"; item_ids: number[] };

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
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({ ping: 1 }));
            } catch {
              // ignore
            }
          }
        }, 25000);
      };

      ws.onmessage = (e) => {
        if (!mounted) return;
        try {
          const data = JSON.parse(e.data) as RealtimeEvent & { type?: string };
          if (data.type && data.type !== "connected") {
            setLastEvent(data as RealtimeEvent);
            onEventRef.current?.(data as RealtimeEvent);
          }
        } catch {
          // ignore invalid JSON
        }
      };

      ws.onclose = () => {
        if (!mounted) return;
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
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
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
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
