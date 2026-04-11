"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Message } from "@/lib/types";
import { estimateTextBlockHeight } from "@/lib/pretextSpike";
import { useChatStore } from "@/lib/store";
import { extractTextContent } from "@/lib/utils";
import { MessageBubble } from "./MessageBubble";

/**
 * Estimated heights used for initial layout. The virtualizer measures actual
 * heights after render and updates scroll positions accordingly.
 */
const ESTIMATED_HEIGHT = {
  short: 80,   // typical user message
  medium: 160, // short assistant reply
  tall: 320,   // code blocks / long replies
};

function estimateMessageHeight(message: Message, availableWidth: number, usePretext: boolean): number {
  const text = extractTextContent(message.content);

  if (!usePretext || !text.trim()) {
    if (text.length < 100) return ESTIMATED_HEIGHT.short;
    if (text.length < 500 || text.includes("```")) return ESTIMATED_HEIGHT.medium;
    return ESTIMATED_HEIGHT.tall;
  }

  const bubbleWidth = Math.min(672, Math.max(220, availableWidth - (message.role === "user" ? 132 : 148)));
  const baseHeight = estimateTextBlockHeight(text, Math.max(180, bubbleWidth - 32), {
    lineHeight: message.role === "assistant" ? 22 : 20,
    paddingY: 20,
    chromeHeight: message.role === "assistant" ? 22 : 0,
    whiteSpace: "pre-wrap",
  });
  const codeBlockPenalty = text.includes("```") ? 120 : 0;
  const streamingPenalty = message.status === "streaming" ? 18 : 0;
  return Math.max(ESTIMATED_HEIGHT.short, Math.min(1600, Math.ceil(baseHeight + codeBlockPenalty + streamingPenalty)));
}

interface VirtualMessageListProps {
  messages: Message[];
  /** Whether streaming is in progress — suppresses smooth-scroll so the
   *  autoscroll keeps up with incoming tokens. */
  isStreaming: boolean;
}

export function VirtualMessageList({ messages, isStreaming }: VirtualMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const pretextEnabled = useChatStore((state) => state.settings.integrations.pretextEnabled);
  const [availableWidth, setAvailableWidth] = useState(720);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }

    const updateWidth = () => setAvailableWidth(Math.max(320, element.clientWidth));
    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => estimateMessageHeight(messages[index], availableWidth, pretextEnabled),
    overscan: 5,
  });
  const virtualizerTotalSize = virtualizer.getTotalSize();

  const bindCanvasRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) {
        return;
      }
      node.style.height = `${virtualizerTotalSize}px`;
      node.style.position = "relative";
    },
    [virtualizerTotalSize]
  );

  const bindItemRef = useCallback(
    (node: HTMLDivElement | null, start: number) => {
      if (!node) {
        return;
      }
      node.style.position = "absolute";
      node.style.top = "0";
      node.style.left = "0";
      node.style.right = "0";
      node.style.transform = `translateY(${start}px)`;
      virtualizer.measureElement(node);
    },
    [virtualizer]
  );

  // Track whether the user has scrolled away from the bottom
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isAtBottomRef.current = distanceFromBottom < 80;
  }, []);

  // Auto-scroll to bottom when new messages arrive (if already at bottom)
  useEffect(() => {
    if (!isAtBottomRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    if (isStreaming) {
      // Instant scroll during streaming to keep up with tokens
      el.scrollTop = el.scrollHeight;
    } else {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages.length, isStreaming]);

  // Also scroll when the last streaming message content changes
  useEffect(() => {
    if (!isStreaming || !isAtBottomRef.current) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  });

  const items = virtualizer.getVirtualItems();

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto"
      onScroll={handleScroll}
    >
      {/* Spacer that gives the virtualizer its total height */}
      <div ref={bindCanvasRef} className="max-w-3xl mx-auto px-4 py-6">
        {items.map((virtualItem) => {
          const message = messages[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={(node) => bindItemRef(node, virtualItem.start)}
              className="pb-6"
            >
              <MessageBubble message={message} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
