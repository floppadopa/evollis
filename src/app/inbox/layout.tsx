import { type Metadata } from "next";

import ConversationList from "~/components/inbox/list/ConversationList";
import InboxShell from "~/components/inbox/InboxShell";

export const metadata: Metadata = {
  title: "Boîte de réception · Evollis",
};

export default function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <InboxShell list={<ConversationList />}>{children}</InboxShell>;
}
