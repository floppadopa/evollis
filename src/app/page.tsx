"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import AppShell from "~/components/home/AppShell";
import ChatComposer from "~/components/home/ChatComposer";
import Greeting from "~/components/home/Greeting";
import { NEW_CHAT_IMAGES_KEY } from "~/components/home/new-chat";

export default function Home() {
  const router = useRouter();
  const [message, setMessage] = useState("");

  const handleSubmit = (text: string, images: string[] = []) => {
    const trimmed = text.trim();
    if (!trimmed && images.length === 0) return;
    if (images.length > 0) {
      try {
        sessionStorage.setItem(NEW_CHAT_IMAGES_KEY, JSON.stringify(images));
      } catch {
        // ignore storage failures (private mode, quota, …)
      }
    }
    router.push(`/chat/new?m=${encodeURIComponent(trimmed)}`);
  };

  return (
    <AppShell>
      <main className="flex h-full flex-col items-center overflow-y-auto px-4 pt-[18vh] md:px-8">
        <div className="flex w-full max-w-2xl flex-col items-center gap-8">
          <Greeting />
          <div className="w-full">
            <ChatComposer
              value={message}
              onChange={setMessage}
              onSubmit={handleSubmit}
              allowImages
            />
          </div>
        </div>
      </main>
    </AppShell>
  );
}
