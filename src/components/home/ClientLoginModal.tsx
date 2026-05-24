"use client";

import "./_css/ClientLoginModal.css";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { api } from "~/trpc/react";
import { loginAsClient } from "~/server/auth/actions";
import Avatar from "~/components/inbox/ui/Avatar";

/**
 * Demo connection modal for the customer chat. One-click sign-in to a seeded
 * client profile, which scopes the chat to that customer's conversations.
 */
export default function ClientLoginModal() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();

  const { data: profiles, isLoading } = api.chat.listClientProfiles.useQuery();

  // Demo profiles to hide from the picker.
  const visibleProfiles = (profiles ?? []).filter(
    (p) => p.name !== "Lucas Petit",
  );

  function handleLogin(clientId: string) {
    startTransition(async () => {
      await loginAsClient(clientId);
      // Clear the previous identity's cached queries before loading this one.
      queryClient.clear();
      router.refresh();
    });
  }

  return (
    <div
      className="client-login__backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="client-login-title"
    >
      <div className="client-login__card">
        <header className="client-login__header">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/evollis-logo.svg" alt="Evollis" className="client-login__logo" />
          <h1 className="client-login__title" id="client-login-title">
            Bienvenue sur Evollis
          </h1>
          <p className="client-login__subtitle">
            Démo — choisissez un profil client pour accéder à vos conversations.
          </p>
        </header>

        {/* Demo disclaimer + how-to */}
        <div className="client-login__note" role="note">
          <p className="client-login__note-title">
            Ceci est une démo, pas une application prête pour la production.
          </p>
          <p className="client-login__note-text">
            <strong>Comment l&apos;utiliser :</strong> cliquez sur un profil
            ci-dessous pour vous connecter.
          </p>
        </div>

        <div className="client-login__divider" aria-hidden="true">
          Choisir un profil
        </div>

        {isLoading ? (
          <div className="client-login__skeletons" aria-busy="true" aria-label="Chargement des profils…">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="client-login__skeleton" />
            ))}
          </div>
        ) : (
          <div className="client-login__profiles" role="list">
            {visibleProfiles.map((profile) => (
              <button
                key={profile.id}
                role="listitem"
                className="client-login__profile"
                onClick={() => handleLogin(profile.id)}
                disabled={pending}
                aria-label={`Se connecter en tant que ${profile.name ?? "client"}`}
              >
                <Avatar src={profile.avatarUrl} name={profile.name} size={34} />
                <span className="client-login__profile-info">
                  <span className="client-login__profile-name">
                    {profile.name ?? "Client"}
                  </span>
                  {profile.email ? (
                    <span className="client-login__profile-email">{profile.email}</span>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
