import type { Metadata } from "next";
import { Suspense } from "react";

import { ChatPage } from "@/components/chat/chat-page";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Coach chat" };

export default function NewChatPage() {
  return (
    <div>
      <h1 className="sr-only">Coach chat</h1>
      <Suspense fallback={<Skeleton className="h-[32rem] rounded-2xl" />}>
        <ChatPage conversationId={null} />
      </Suspense>
    </div>
  );
}
