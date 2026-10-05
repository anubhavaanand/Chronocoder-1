"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface WSMessage {
  type: string;
  payload: any;
}

interface UseMentorWSOptions {
  mentorId: string;
  userCode: string;
  sessionId?: string;
  onAnalysisComplete?: (analysis: any) => void;
  onFeedbackChunk?: (chunk: any) => void;
  onFeedbackComplete?: () => void;
  onError?: (error: string) => void;
}

export function useMentorWebSocket(options: UseMentorWSOptions) {
  const { mentorId, userCode, sessionId, onAnalysisComplete, onFeedbackChunk, onFeedbackComplete, onError } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000"}/ws/feedback`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[WS] Connected");
      setIsConnected(true);
      setIsAnalyzing(true);
      reconnectAttempts.current = 0;

      // Send analysis request
      ws.send(JSON.stringify({
        mentor_id: mentorId,
        user_code: userCode,
        session_id: sessionId,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        console.log("[WS] Received:", msg.type);

        switch (msg.type) {
          case "analysis_complete":
            onAnalysisComplete?.(msg.payload);
            break;
          case "feedback_token":
            onFeedbackChunk?.(msg.payload);
            break;
          case "feedback_complete":
            setIsAnalyzing(false);
            onFeedbackComplete?.();
            break;
          case "error":
            setIsAnalyzing(false);
            onError?.(msg.payload.message || "Unknown error");
            break;
          default:
            console.warn("[WS] Unknown message type:", msg.type);
        }
      } catch (err) {
        console.error("[WS] Parse error:", err);
      }
    };

    ws.onclose = (event) => {
      console.log("[WS] Closed:", event.code, event.reason);
      setIsConnected(false);
      setIsAnalyzing(false);

      // Attempt reconnect for unexpected closures
      if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      }
    };

    ws.onerror = (err) => {
      console.error("[WS] Error:", err);
      onError?.("WebSocket connection error");
    };
  }, [mentorId, userCode, sessionId, onAnalysisComplete, onFeedbackChunk, onFeedbackComplete, onError]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close(1000, "Client disconnect");
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsAnalyzing(false);
  }, []);

  const sendMessage = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Auto-connect on mount / deps change
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { isConnected, isAnalyzing, sendMessage, disconnect, connect };
}