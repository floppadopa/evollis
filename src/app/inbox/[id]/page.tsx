"use client";

import "~/components/inbox/_css/InboxShell.css";

import { useParams } from "next/navigation";

import ConversationHeader from "~/components/inbox/conversation/ConversationHeader";
import MessageThread from "~/components/inbox/conversation/MessageThread";
import ReplyComposer from "~/components/inbox/conversation/ReplyComposer";
import ContactPanel from "~/components/inbox/contact/ContactPanel";

export default function InboxConversationPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="inbox-id-row">
      <div className="inbox-conversation-slot">
        <ConversationHeader conversationId={id} />
        <MessageThread conversationId={id} />
        <ReplyComposer conversationId={id} />
      </div>

      <aside className="inbox-contact-slot">
        <ContactPanel conversationId={id} />
      </aside>
    </div>
  );
}
