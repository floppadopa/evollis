"use client";

import "./_css/LoginModal.css";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "~/trpc/react";
import { loginAs } from "~/server/auth/actions";
import Avatar from "~/components/inbox/ui/Avatar";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrateur",
  AGENT: "Agent",
};

export default function LoginModal() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();

  const { data: profiles, isLoading } = api.auth.listProfiles.useQuery();

  const adminProfile = profiles?.find((p) => p.role === "ADMIN") ?? profiles?.[0];
  const defaultEmail = adminProfile?.email ?? "marine.dubois@evollis.fr";

  function handleLogin(agentId: string) {
    startTransition(async () => {
      await loginAs(agentId);
      // Clear the previous identity's cached queries before loading this one.
      queryClient.clear();
      router.refresh();
    });
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!adminProfile) return;
    handleLogin(adminProfile.id);
  }

  return (
    <div className="login-modal__backdrop" role="dialog" aria-modal="true" aria-labelledby="login-modal-title">
      <div className="login-modal__card">

        {/* Header */}
        <header className="login-modal__header">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/evollis-logo.svg"
            alt="Evollis"
            className="login-modal__logo"
          />
          <h1 className="login-modal__title" id="login-modal-title">
            Connexion à l&apos;espace agent
          </h1>
          <p className="login-modal__subtitle">
            Démo — choisissez un profil pour vous connecter.
          </p>
        </header>

        {/* Demo disclaimer + how-to */}
        <div className="login-modal__note" role="note">
          <p className="login-modal__note-title">
            Ceci est une démo, pas une application prête pour la production.
          </p>
          <p className="login-modal__note-text">
            <strong>Comment l&apos;utiliser :</strong> les identifiants sont
            pré-remplis — cliquez sur « Se connecter », ou choisissez un profil
            ci-dessous.
          </p>
        </div>

        {/* Credential form (cosmetic pre-fill, locked in demo mode) */}
        <form className="login-modal__form" onSubmit={handleFormSubmit} noValidate>
          <div className="login-modal__field">
            <label className="login-modal__label" htmlFor="login-email">
              Adresse e-mail
            </label>
            <input
              id="login-email"
              type="email"
              className="login-modal__input"
              defaultValue={defaultEmail}
              autoComplete="email"
              placeholder="votre@evollis.fr"
              disabled
            />
          </div>

          <div className="login-modal__field">
            <label className="login-modal__label" htmlFor="login-password">
              Mot de passe
            </label>
            <input
              id="login-password"
              type="password"
              className="login-modal__input"
              defaultValue="evollis-demo"
              autoComplete="current-password"
              disabled
            />
          </div>

          <p className="login-modal__locked-hint">
            🔒 Champs verrouillés en mode démo.
          </p>

          <button
            type="submit"
            className="login-modal__submit"
            disabled={pending || !adminProfile}
          >
            {pending ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        {/* Divider */}
        <div className="login-modal__divider" aria-hidden="true">
          ou choisir un profil
        </div>

        {/* Profile grid */}
        {isLoading ? (
          <div className="login-modal__profile-skeleton" aria-busy="true" aria-label="Chargement des profils…">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="login-modal__skeleton-card" />
            ))}
          </div>
        ) : (
          <div className="login-modal__profiles" role="list">
            {(profiles ?? []).map((profile) => (
              <button
                key={profile.id}
                role="listitem"
                className="login-modal__profile-card"
                onClick={() => handleLogin(profile.id)}
                disabled={pending}
                aria-label={`Se connecter en tant que ${profile.name}`}
              >
                <Avatar
                  src={profile.avatarUrl}
                  name={profile.name}
                  size={36}
                  presence={profile.availability as "ONLINE" | "BUSY" | "OFFLINE"}
                />
                <span className="login-modal__profile-name">{profile.name}</span>
                <span className="login-modal__profile-role">
                  {ROLE_LABELS[profile.role] ?? profile.role}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
