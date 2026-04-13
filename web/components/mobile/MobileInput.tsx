"use client";

import { ChatInput } from "@/components/chat/ChatInput";
import type { BuddyProfile, BuddySuggestion } from "@/lib/buddy";

interface MobileInputProps {
  conversationId: string;
  /** Height of the software keyboard in px — shifts input above it */
  keyboardHeight: number;
  buddyProfile?: BuddyProfile;
  latestPrompt?: string;
  buddySuggestions?: BuddySuggestion[];
  onOpenBuddy?: () => void;
  pendingBuddyPrompt?: string;
  onBuddyPromptApplied?: () => void;
}

/**
 * Mobile-optimised chat input wrapper.
 * Uses a paddingBottom equal to the keyboard height so the input floats
 * above the virtual keyboard without relying on position:fixed (which
 * breaks on iOS Safari when the keyboard is open).
 */
export function MobileInput({
  conversationId,
  keyboardHeight,
  buddyProfile,
  latestPrompt,
  buddySuggestions,
  onOpenBuddy,
  pendingBuddyPrompt,
  onBuddyPromptApplied,
}: MobileInputProps) {
  return (
    <div
      style={{ paddingBottom: `calc(${keyboardHeight}px + env(safe-area-inset-bottom))` }}
      className="transition-[padding] duration-100"
    >
      <ChatInput
        conversationId={conversationId}
        buddyProfile={buddyProfile}
        latestPrompt={latestPrompt}
        buddySuggestions={buddySuggestions}
        onOpenBuddy={onOpenBuddy}
        pendingBuddyPrompt={pendingBuddyPrompt}
        onBuddyPromptApplied={onBuddyPromptApplied}
      />
    </div>
  );
}
