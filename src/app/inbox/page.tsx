import "~/components/inbox/_css/InboxShell.css";

import Image from "next/image";

export default function InboxIndexPage() {
  return (
    <div className="inbox-empty-state">
      <Image
        src="/evollis-logo.svg"
        alt="Evollis"
        width={40}
        height={40}
        className="inbox-empty-state__icon"
        priority
      />
      <p className="inbox-empty-state__text">
        Sélectionnez une conversation pour commencer.
      </p>
    </div>
  );
}
