"use client";

import "./_css/AgentBar.css";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { logout } from "~/server/auth/actions";
import Avatar from "~/components/inbox/ui/Avatar";
import ViewToggle from "~/components/ViewToggle";
import ThemeToggle from "~/components/ThemeToggle";

type Availability = "ONLINE" | "BUSY" | "OFFLINE";

const AVAILABILITY_LABELS: Record<Availability, string> = {
  ONLINE: "Disponible",
  BUSY: "Occupé",
  OFFLINE: "Hors ligne",
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrateur",
  AGENT: "Agent",
};

export default function AgentBar() {
  const router = useRouter();
  const utils = api.useUtils();
  const [pendingLogout, startLogout] = useTransition();
  const [pendingAvail, startAvail] = useTransition();

  const { data: me, isLoading } = api.auth.me.useQuery();

  const setAvailability = api.auth.setAvailability.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
    },
  });

  function handleAvailabilityChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value as Availability;
    startAvail(async () => {
      await setAvailability.mutateAsync({ availability: value });
    });
  }

  function handleLogout() {
    startLogout(async () => {
      await logout();
      await utils.auth.me.invalidate();
      router.refresh();
    });
  }

  const isPending = pendingLogout || pendingAvail;

  return (
    <header className="agent-bar">
      {/* Left: logo + title */}
      <div className="agent-bar__left">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/evollis-logo.svg"
          alt="Evollis"
          className="agent-bar__logo"
        />
        <span className="agent-bar__title">Boîte de réception</span>
      </div>

      {/* Right: view toggle (always) + agent controls (only when logged in) */}
      <div className="agent-bar__right">
        <ThemeToggle />
        <ViewToggle href="/" label="Vue Client" />

        {!isLoading && me && (
          <>
            <div className="agent-bar__sep" aria-hidden="true" />

          {/* Identity */}
          <div className="agent-bar__identity">
            <div className="agent-bar__meta">
              <span className="agent-bar__name">{me.name}</span>
              <span className="agent-bar__role">
                {ROLE_LABELS[me.role] ?? me.role}
              </span>
            </div>
            <Avatar
              src={me.avatarUrl}
              name={me.name}
              size={28}
              presence={me.availability as Availability}
            />
          </div>

          <div className="agent-bar__sep" aria-hidden="true" />

          {/* Availability selector */}
          <select
            className="agent-bar__availability"
            value={me.availability}
            onChange={handleAvailabilityChange}
            disabled={isPending}
            aria-label="Disponibilité"
          >
            {(Object.keys(AVAILABILITY_LABELS) as Availability[]).map((key) => (
              <option key={key} value={key}>
                {AVAILABILITY_LABELS[key]}
              </option>
            ))}
          </select>

          <div className="agent-bar__sep" aria-hidden="true" />

          {/* Logout */}
          <button
            className="agent-bar__logout"
            onClick={handleLogout}
            disabled={isPending}
            aria-label="Se déconnecter"
          >
            {pendingLogout ? "Déconnexion…" : "Se déconnecter"}
          </button>
          </>
        )}
      </div>
    </header>
  );
}
