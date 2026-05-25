"use client";

import "./_css/ClientLoginModal.css";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { api } from "~/trpc/react";
import { loginAsClient } from "~/server/auth/actions";
import Avatar from "~/components/inbox/ui/Avatar";

/**
 * Demo connection modal for the customer chat. Pre-filled (cosmetic) creds plus
 * one-click sign-in to a seeded client profile, which scopes the chat to that
 * customer's conversations.
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

  // The canonical demo profile shown pre-filled in the form. Profiles are
  // ordered by name, so visibleProfiles[0] would be Aïcha — pick Camille
  // explicitly so the pre-filled email and the "Se connecter" target match.
  const DEFAULT_EMAIL = "camille.laurent@example.fr";
  const defaultProfile =
    visibleProfiles.find((p) => p.email === DEFAULT_EMAIL) ?? visibleProfiles[0];
  const defaultEmail = defaultProfile?.email ?? DEFAULT_EMAIL;

  function handleLogin(clientId: string) {
    startTransition(async () => {
      await loginAsClient(clientId);
      // Clear the previous identity's cached queries before loading this one.
      queryClient.clear();
      router.refresh();
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!defaultProfile) return;
    handleLogin(defaultProfile.id);
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
            <strong>Comment l&apos;utiliser :</strong> les identifiants sont
            pré-remplis — cliquez sur « Se connecter », ou choisissez un profil
            ci-dessous.
          </p>
        </div>

        {/* Cosmetic pre-filled credentials (locked in demo mode) */}
        <form className="client-login__form" onSubmit={handleSubmit} noValidate>
          <div className="client-login__field">
            <label className="client-login__label" htmlFor="client-email">
              Adresse e-mail
            </label>
            <input
              id="client-email"
              type="email"
              className="client-login__input"
              value={defaultEmail}
              readOnly
              autoComplete="email"
              disabled
            />
          </div>

          <div className="client-login__field">
            <label className="client-login__label" htmlFor="client-password">
              Mot de passe
            </label>
            <input
              id="client-password"
              type="password"
              className="client-login__input"
              defaultValue="evollis-demo"
              autoComplete="current-password"
              disabled
            />
          </div>

          <p className="client-login__locked-hint">
            🔒 Champs verrouillés en mode démo.
          </p>

          <button
            type="submit"
            className="client-login__submit"
            disabled={pending || !defaultProfile}
          >
            {pending ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <div className="client-login__divider" aria-hidden="true">
          ou choisir un profil
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
