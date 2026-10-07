"use client";

import { useState, useEffect, useRef, useCallback } from "react";

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
    if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000"}/ws/feedback`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    intentionalClose.current = false;

    ws.onopen = () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;
      onOpen?.(ws);
    };

    ws.onmessage = (event) => {
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
        sessionRef.current =
          options.sessionId ||
          `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      }

      const request: FeedbackRequest = {
        mentor_id: handlersRef.current.mentorId,
        user_code: userCode,
        session_id: sessionRef.current,
      };
      pendingRequest.current = request;
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
