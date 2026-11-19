import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ChatPage } from "@/components/chat/chat-page";
import { Skeleton } from "@/components/ui/skeleton";
import { idSchema } from "@/lib/validation/accounts";

export const metadata: Metadata = { title: "Coach chat" };

async function Conversation({ params }: { params: PageProps<"/app/chat/[id]">["params"] }) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  return <ChatPage conversationId={id} />;
}

export default function ConversationPage({ params }: PageProps<"/app/chat/[id]">) {
  return (
    <div>
      <h1 className="sr-only">Coach chat</h1>
      <Suspense fallback={<Skeleton className="h-[32rem] rounded-2xl" />}>
        <Conversation params={params} />
      </Suspense>
    </div>
  );
}
