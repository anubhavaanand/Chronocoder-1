"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getStoredAuthToken } from "../lib/auth";

export interface FeedbackSectionView {
  id?: string;
  label: string;
  icon?: string;
  content: string;
}

export interface FeedbackPayload {
  reading?: string;
  sections?: FeedbackSectionView[];
  challenge?: string;
  closing?: string;
}

export interface CodeAnalysis {
  line_count: number;
  functions: number;
  classes: number;
  imports: number;
  complexity_score: number;
  estimated_tokens: number;
}

interface WSMessage {
  type: string;
  payload: unknown;
}

interface FeedbackRequest {
  mentor_id: string;
  user_code: string;
  session_id?: string;
}

interface UseMentorWSOptions {
  mentorId: string;
  sessionId?: string;
  onAnalysisComplete?: (analysis: CodeAnalysis) => void;
  onFeedbackChunk?: (chunk: FeedbackPayload) => void;
  onFeedbackComplete?: () => void;
  onError?: (error: string) => void;
}

type ConnectFn = (onOpen?: (ws: WebSocket) => void) => void;

/**
 * Resolves the WebSocket URL with automatic HTTPS -> WSS upgrade to prevent
 * browser Mixed Content blocking in production deployments (#CC-047).
 *
 * Resolution order:
 *   1. explicit `baseUrl` argument
 *   2. `NEXT_PUBLIC_WS_URL` — for split frontend/backend deployments
 *   3. the current page's origin — so a production deploy needs no env var at
 *      all. Defaulting to `ws://localhost:8000` instead (the old behaviour)
 *      made the browser dial the *user's* machine whenever the var was unset
 *      (#121).
 */
export function resolveWebSocketUrl(baseUrl?: string, token?: string | null): string {
  const base =
    baseUrl ||
    process.env.NEXT_PUBLIC_WS_URL ||
    (typeof window !== "undefined" && window.location
      ? `${window.location.protocol}//${window.location.host}`
      : "ws://localhost:8000");
  let url = base.replace(/\/+$/, "");

  // Normalise http(s) origins from `window.location` into ws(s) first. The
  // https-only rewrite below would otherwise leave a plain-http page with
  // `http://…/ws/feedback`, which is not a WebSocket URL at all.
  if (url.startsWith("http://")) {
    url = "ws://" + url.slice(7);
  } else if (url.startsWith("https://")) {
    url = "wss://" + url.slice(8);
  }

  // Upgrade ws:// or http:// to wss:// if page is served over HTTPS
  if (typeof window !== "undefined" && window.location?.protocol === "https:") {
    if (url.startsWith("ws://")) {
      url = "wss://" + url.slice(5);
    }
  }

  // #190/#286: browsers cannot set handshake headers on a WebSocket, so the
  // session token is carried in the URL query string. The backend verifies it
  // the same way it does for REST calls (Authorization header) and closes the
  // socket with 1008 when it is missing or invalid.
  if (token) {
    const separator = url.includes("?") ? "&" : "?";
    url = `${url}${separator}token=${encodeURIComponent(token)}`;
  }

  return `${url}/ws/feedback`;
}

/**
 * Generates a cryptographically strong session ID using crypto.randomUUID()
 * to prevent predictable session enumeration attacks (#CC-049).
 */
export function generateSecureSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `session_${crypto.randomUUID()}`;
  }
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `session_${hex}`;
  }
  return `session_${Date.now()}`;
}

/**
 * Detects terminal WebSocket close codes (e.g. auth failures, policy violations)
 * where reconnecting would be futile and produce unwanted retry loops (#CC-048).
 */
export function isTerminalWebSocketCloseCode(code: number): boolean {
  return (
    code === 1008 || // Policy Violation
    code === 4001 || // Unauthorized
    code === 4003 || // Forbidden
    code === 4401 || // Unauthorized (custom WS application code)
    code === 4403    // Forbidden (custom WS application code)
  );
}

/**
 * Connects to /ws/feedback lazily — only when requestFeedback() is called —
 * and resends the pending request if the socket drops mid-analysis.
 * Callbacks are read through a ref so changing them never re-opens the socket.
 * If no sessionId is provided, one is generated on first request.
 */
export function useMentorWebSocket(options: UseMentorWSOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;
  const pendingRequest = useRef<FeedbackRequest | null>(null);
  // Monotonic generation counter. Each requestFeedback bumps it; handlers
  // discard any message from a superseded generation so a new question
  // cannot be answered by a still-in-flight older stream (#319/#243/#207).
  const generationRef = useRef(0);
  const intentionalClose = useRef(false);
  const sessionRef = useRef<string>("");
  const connectRef = useRef<ConnectFn | null>(null);

  // Keep latest callbacks in a ref, updated post-render, so changing them
  // never re-opens the socket and sockets never see stale closures.
  const handlersRef = useRef(options);
  useEffect(() => {
    handlersRef.current = options;
  });

  const clearReconnectTimer = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  const connect = useCallback<ConnectFn>((onOpen) => {
    const existing = wsRef.current;
    if (existing) {
      if (existing.readyState === WebSocket.OPEN) {
        // Already open: nothing to wait for, but honour the caller's intent to
        // send now (e.g. a second submit while the socket is live).
        onOpen?.(existing);
        return;
      }
      if (existing.readyState === WebSocket.CONNECTING) {
        // Handshake in flight (#205): the previous code returned without
        // invoking onOpen, so the pending request was silently dropped and the
        // UI stayed in "Analyzing..." forever. Defer the send until onopen.
        existing.addEventListener("open", () => onOpen?.(existing), { once: true });
        return;
      }
      // CLOSING/CLOSED: fall through and open a fresh socket.
    }

    // #190/#286: include the auth token in the URL so the backend can verify it
    // during the WebSocket handshake. `getStoredAuthToken()` mirrors the same
    // keys `getAuthHeaders()` uses for REST calls (chrono_auth_token,
    // sb-access-token, supabase_token, supabase.auth.token).
    const authToken = getStoredAuthToken();
    const wsUrl = resolveWebSocketUrl(undefined, authToken);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    intentionalClose.current = false;
    // Snapshot the generation this socket was opened for. Messages arriving
    // after a newer requestFeedback() has superseded it are silently
    // discarded — they belong to a question the user has already moved on
    // from, and acting on them would render stale feedback (#319/#243/#207).
    const generation = generationRef.current;

    ws.onopen = () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;
      onOpen?.(ws);
    };

    ws.onmessage = (event) => {
      if (generation !== generationRef.current) return;
      try {
        const msg: WSMessage = JSON.parse(event.data);

        switch (msg.type) {
          case "analysis_complete":
            handlersRef.current.onAnalysisComplete?.(msg.payload as CodeAnalysis);
            break;
          case "feedback_chunk":
          case "feedback_token": // legacy event name
            handlersRef.current.onFeedbackChunk?.(msg.payload as FeedbackPayload);
            break;
          case "feedback_complete":
            pendingRequest.current = null;
            setIsAnalyzing(false);
            handlersRef.current.onFeedbackComplete?.();
            break;
          case "error":
            pendingRequest.current = null;
            setIsAnalyzing(false);
            handlersRef.current.onError?.(
              (msg.payload as { message?: string } | null)?.message || "Unknown error",
            );
            break;
          default:
            console.warn("[WS] Unknown message type:", msg.type);
        }
      } catch (err) {
        console.error("[WS] Parse error:", err);
      }
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      setIsAnalyzing(false);

      // Terminal auth rejection / policy violation — do not loop reconnect (#CC-048)
      if (isTerminalWebSocketCloseCode(event.code)) {
        pendingRequest.current = null;
        reconnectAttempts.current = maxReconnectAttempts;
        clearReconnectTimer();
        wsRef.current = null;
        handlersRef.current.onError?.(
          event.reason || "Authentication failed: access denied to mentor session"
        );
        return;
      }

      // Retry unexpected drops while an analysis is in flight
      if (
        event.code !== 1000 &&
        !intentionalClose.current &&
        pendingRequest.current &&
        reconnectAttempts.current < maxReconnectAttempts
      ) {
        reconnectAttempts.current++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
        reconnectTimeoutRef.current = setTimeout(() => {
          const request = pendingRequest.current;
          connectRef.current?.((socket) => {
            if (request) socket.send(JSON.stringify(request));
          });
        }, delay);
      } else if (
        event.code !== 1000 &&
        !intentionalClose.current &&
        pendingRequest.current
      ) {
        // Reconnect budget exhausted (or no request left to replay): surface a
        // clear error instead of ending silently with isAnalyzing=false and no
        // content (#128).
        pendingRequest.current = null;
        handlersRef.current.onError?.(
          "Connection lost before feedback completed. Please try again.",
        );
      }
    };

    ws.onerror = () => {
      handlersRef.current.onError?.("WebSocket connection error");
    };
  }, []);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const disconnect = useCallback(() => {
    clearReconnectTimer();
    pendingRequest.current = null;
    intentionalClose.current = true;
    if (wsRef.current) {
      wsRef.current.close(1000, "Client disconnect");
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsAnalyzing(false);
  }, []);

  /** Send code for analysis, opening the socket on first use. */
  const requestFeedback = useCallback(
    (userCode: string) => {
      if (!userCode.trim()) return;

      if (!sessionRef.current) {
        sessionRef.current = options.sessionId || generateSecureSessionId();
      }

      const request: FeedbackRequest = {
        mentor_id: handlersRef.current.mentorId,
        user_code: userCode,
        session_id: sessionRef.current,
      };
      pendingRequest.current = request;
      // Bump the generation counter so any in-flight stream from a previous
      // question is discarded once this one starts producing output (#319).
      generationRef.current += 1;
      setIsAnalyzing(true);

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(request));
      } else {
        connect((socket) => socket.send(JSON.stringify(request)));
      }
    },
    [connect, options.sessionId],
  );

  /** The session id (generated on first request). Safe to call from handlers. */
  const getSessionId = useCallback(() => sessionRef.current, []);

  // Close the socket on unmount only — not on every render.
  useEffect(() => {
    return () => {
      clearReconnectTimer();
      intentionalClose.current = true;
      wsRef.current?.close(1000, "Component unmount");
    };
  }, []);

  return { isConnected, isAnalyzing, requestFeedback, getSessionId, disconnect };
}
