"use client";

import { useEffect, useMemo, useState } from "react";
import { PawPrint, Settings2 } from "lucide-react";
import { useChatStore } from "@/lib/store";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { ChatWindow } from "./ChatWindow";
import { ChatInput } from "./ChatInput";
import { SkipToContent } from "@/components/a11y/SkipToContent";
import { AnnouncerProvider } from "@/components/a11y/Announcer";
import { DesktopFileViewer } from "@/components/file-viewer/DesktopFileViewer";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { CollaborationProvider } from "@/components/collaboration/CollaborationProvider";
import { ResearchWorkbench } from "@/components/research/ResearchWorkbench";
import { BuddyPanel } from "@/components/buddy/BuddyPanel";
import { getBuddyProfile, getBuddySeed, getBuddySuggestions, type BuddyProfile } from "@/lib/buddy";
import { getAgentPack, getMemoryNamespace } from "@/lib/integrations";
import { MobileSidebar } from "@/components/mobile/MobileSidebar";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { MobileInput } from "@/components/mobile/MobileInput";
import { MobileFileViewer } from "@/components/mobile/MobileFileViewer";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useViewportHeight } from "@/hooks/useViewportHeight";
import { useFileViewerStore } from "@/lib/fileViewerStore";
import { ImageViewer } from "@/components/file-viewer/ImageViewer";

const DEMO_USER = {
  id: "local-user",
  name: "Local Operator",
  email: "local@example.com",
  color: "#22c55e",
  role: "owner" as const,
};

function extractMessageText(content: string | Array<{ type?: string; text?: string; content?: unknown }>) {
  if (typeof content === "string") {
    return content;
  }
  return content
    .map((block) => {
      if (block?.type === "text") {
        return block.text ?? "";
      }
      if (block?.type === "tool_result" && typeof block.content === "string") {
        return block.content;
      }
      return "";
    })
    .join("");
}

export function ChatLayout() {
  const {
    conversations,
    createConversation,
    activeConversationId,
    buddyOpen,
    settings,
    openSettings,
    openBuddy,
    closeBuddy,
  } = useChatStore();
  const isMobile = useIsMobile();
  const { viewportHeight, keyboardHeight } = useViewportHeight();
  const { isOpen: isFileViewerOpen, tabs, activeTabId, setOpen: setFileViewerOpen } = useFileViewerStore();
  const [buddyProfile, setBuddyProfile] = useState<BuddyProfile>(() => getBuddyProfile("agclaw-local-operator"));
  const [pendingBuddyPrompt, setPendingBuddyPrompt] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (conversations.length === 0) {
      createConversation();
    }
  }, [conversations.length, createConversation]);

  useEffect(() => {
    setBuddyProfile(getBuddyProfile(getBuddySeed()));
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setMobileSidebarOpen(false);
    }
  }, [isMobile]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) ?? null,
    [conversations, activeConversationId]
  );
  const activeFileTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? null,
    [tabs, activeTabId]
  );

  const latestPrompt = useMemo(() => {
    const latestUserMessage = [...(activeConversation?.messages ?? [])]
      .reverse()
      .find((message) => message.role === "user");
    return latestUserMessage ? extractMessageText(latestUserMessage.content) : "";
  }, [activeConversation]);

  const buddySuggestions = useMemo(
    () =>
      getBuddySuggestions(buddyProfile, latestPrompt, {
        pack: getAgentPack(settings.integrations.activeAgentPack),
        memoryNamespace: getMemoryNamespace(settings.integrations.memoryNamespace),
      }),
    [buddyProfile, latestPrompt, settings.integrations.activeAgentPack, settings.integrations.memoryNamespace]
  );

  const mobileHeaderActions = (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={openBuddy}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-surface-400 transition-colors hover:text-surface-100 active:bg-surface-800"
        aria-label="Open buddy panel"
      >
        <PawPrint className="h-5 w-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={openSettings}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-surface-400 transition-colors hover:text-surface-100 active:bg-surface-800"
        aria-label="Open settings"
      >
        <Settings2 className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );

  const mobileFileViewerContent = activeFileTab ? (
    activeFileTab.isImage ? (
      <ImageViewer src={activeFileTab.content} path={activeFileTab.path} />
    ) : activeFileTab.mode === "diff" && activeFileTab.diff ? (
      <div className="grid h-full min-h-0 grid-cols-1 divide-y divide-surface-800 md:grid-cols-2 md:divide-x md:divide-y-0">
        <pre className="overflow-auto p-4 text-xs text-surface-400">{activeFileTab.diff.oldContent}</pre>
        <pre className="overflow-auto p-4 text-xs text-surface-100">{activeFileTab.diff.newContent}</pre>
      </div>
    ) : activeFileTab.mode === "edit" ? (
      <textarea
        value={activeFileTab.content}
        onChange={() => {}}
        readOnly
        aria-label="Mobile file preview"
        className="h-full w-full resize-none bg-surface-950 p-4 font-mono text-xs text-surface-100 outline-none"
      />
    ) : (
      <pre className="h-full overflow-auto whitespace-pre-wrap p-4 font-mono text-xs text-surface-100">
        {activeFileTab.content}
      </pre>
    )
  ) : null;

  return (
    <CollaborationProvider sessionId="local-session" currentUser={DEMO_USER}>
      <AnnouncerProvider>
        <SkipToContent />
        <div
          className="flex bg-surface-950 text-surface-100"
          style={isMobile && viewportHeight > 0 ? { height: viewportHeight } : { height: "100vh" }}
        >
          {!isMobile && <Sidebar />}
          <div className="flex min-w-0 flex-1 flex-col">
            {isMobile ? (
              <MobileHeader
                title={activeConversation?.title ?? "Chat"}
                onMenuOpen={() => setMobileSidebarOpen(true)}
                right={mobileHeaderActions}
              />
            ) : (
              <Header buddyProfile={buddyProfile} onOpenBuddy={openBuddy} />
            )}
            <main id="main-content" aria-label="Chat" className="flex min-h-0 flex-1">
              <div className="flex min-w-0 flex-1 flex-col">
                {activeConversationId ? (
                  <>
                    <ChatWindow conversationId={activeConversationId} />
                    {isMobile ? (
                      <MobileInput
                        conversationId={activeConversationId}
                        keyboardHeight={keyboardHeight}
                        buddyProfile={buddyProfile}
                        latestPrompt={latestPrompt}
                        buddySuggestions={buddySuggestions}
                        onOpenBuddy={openBuddy}
                        pendingBuddyPrompt={pendingBuddyPrompt}
                        onBuddyPromptApplied={() => setPendingBuddyPrompt("")}
                      />
                    ) : (
                      <ChatInput
                        conversationId={activeConversationId}
                        buddyProfile={buddyProfile}
                        latestPrompt={latestPrompt}
                        buddySuggestions={buddySuggestions}
                        onOpenBuddy={openBuddy}
                        pendingBuddyPrompt={pendingBuddyPrompt}
                        onBuddyPromptApplied={() => setPendingBuddyPrompt("")}
                      />
                    )}
                  </>
                ) : (
                  <div className="flex flex-1 items-center justify-center text-surface-500">
                    Select or create a conversation
                  </div>
                )}
              </div>
              {!isMobile && <DesktopFileViewer />}
            </main>
          </div>
        </div>
        {isMobile && <MobileSidebar isOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />}
        {isMobile && activeFileTab && (
          <MobileFileViewer
            isOpen={isFileViewerOpen}
            onClose={() => setFileViewerOpen(false)}
            fileName={activeFileTab.filename}
          >
            {mobileFileViewerContent}
          </MobileFileViewer>
        )}
        <SettingsDialog />
        <ResearchWorkbench />
        <BuddyPanel
          open={buddyOpen}
          profile={buddyProfile}
          latestPrompt={latestPrompt}
          suggestions={buddySuggestions}
          onClose={closeBuddy}
          onUseSuggestion={(prompt) => {
            setPendingBuddyPrompt(prompt);
            closeBuddy();
          }}
        />
      </AnnouncerProvider>
    </CollaborationProvider>
  );
}
