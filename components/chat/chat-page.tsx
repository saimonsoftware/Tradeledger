import { notFound } from "next/navigation";

import { ConsentCard } from "@/components/coach/consent-card";
import { getChatSidebar, getConversationBubbles } from "@/lib/chat/data";

import { CoachChatApp } from "./coach-chat-app";

/** Shared server loader for /app/chat and /app/chat/[id]. */
export async function ChatPage({ conversationId }: { conversationId: string | null }) {
  const sidebar = await getChatSidebar();
  if (!sidebar.consented) return <ConsentCard />;
  const bubbles = conversationId ? await getConversationBubbles(conversationId) : [];
  if (bubbles === null) notFound(); // other users' conversations look like they don't exist (RLS)
  return (
    <CoachChatApp
      // Remount when switching conversations so state resets cleanly.
      key={conversationId ?? "new"}
      conversationId={conversationId}
      conversations={sidebar.conversations}
      initial={bubbles}
      messagesLeft={sidebar.messagesLeft}
      existingRuleTitles={sidebar.existingRuleTitles}
    />
  );
}
