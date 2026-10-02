import {
  useState,
  type FormEvent,
} from "react"

import {
  signInWithPassword,
  signUpPlayer,
} from "../../services/authService"

type AuthMode = "login" | "signup"

function getReadableAuthError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : "Une erreur inconnue est survenue."

  const lower = message.toLowerCase()

  if (lower.includes("invalid login credentials")) {
    return "E-mail ou mot de passe incorrect."
  }

  if (lower.includes("email not confirmed")) {
    return "Ton adresse e-mail doit encore être confirmée."
  }

  if (lower.includes("user already registered")) {
    return "Un compte existe déjà avec cette adresse e-mail."
  }

  if (lower.includes("password should be")) {
    return "Le mot de passe est trop court. Utilise au moins 8 caractères."
  }

  if (lower.includes("rate limit")) {
    return "Trop de tentatives. Réessaie dans quelques instants."
  }

  return message
}

function isValidUsername(value: string) {
  return /^[\p{L}\p{N}_-]{3,20}$/u.test(value)
}

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>("login")
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode)
    setErrorMessage(null)
    setSuccessMessage(null)
    setPassword("")
    setConfirmPassword("")
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (busy) {
      return
    }

    setErrorMessage(null)
    setSuccessMessage(null)

    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setErrorMessage("Entre une adresse e-mail valide.")
      return
    }

    if (password.length < 8) {
      setErrorMessage("Le mot de passe doit contenir au moins 8 caractères.")
      return
    }

    if (mode === "signup") {
      const normalizedUsername = username.trim()

      if (!isValidUsername(normalizedUsername)) {
        setErrorMessage(
          "Le pseudo doit contenir 3 à 20 lettres/chiffres, avec _ ou - si besoin."
        )
        return
      }

      if (password !== confirmPassword) {
        setErrorMessage("Les deux mots de passe ne correspondent pas.")
        return
      }
    }

    setBusy(true)

    try {
      if (mode === "login") {
        await signInWithPassword(normalizedEmail, password)
      } else {
        const result = await signUpPlayer(
          normalizedEmail,
          password,
          username
        )

        if (result.requiresEmailConfirmation) {
          setSuccessMessage(
            "Compte créé. Ouvre l'e-mail de confirmation Supabase, puis reviens te connecter."
          )
          setMode("login")
          setPassword("")
          setConfirmPassword("")
        } else {
          setSuccessMessage("Compte créé. Préparation de ton empire…")
        }
      }
    } catch (error) {
      setErrorMessage(getReadableAuthError(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#07090d] text-white">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-35"
        style={{
          backgroundImage: "url('/city-map.png')",
        }}
      />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(127,29,29,0.2),transparent_38%),linear-gradient(to_bottom,rgba(5,5,8,0.45),rgba(5,5,8,0.96))]" />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-6xl items-center justify-center px-4 py-8 sm:px-6">
        <section className="grid w-full overflow-hidden rounded-3xl border border-red-900/35 bg-black/75 shadow-2xl backdrop-blur-xl lg:grid-cols-[1.15fr_0.85fr]">
          <div className="hidden min-h-[620px] flex-col justify-end border-r border-white/5 bg-[linear-gradient(to_top,rgba(0,0,0,0.92),rgba(0,0,0,0.1)),url('/world/world-map.jpg')] bg-cover bg-center p-10 lg:flex">
            <p className="text-xs font-black uppercase tracking-[0.32em] text-red-400">
              Crime Empire
            </p>
            <h1 className="mt-3 max-w-xl text-5xl font-black leading-[0.95]">
              Bâtis ton réseau. Étends ton territoire.
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-6 text-zinc-300">
              Chaque compte possède désormais sa propre ville, ses ressources, ses troupes et sa progression.
            </p>
          </div>

          <div className="p-5 sm:p-8 lg:p-10">
            <div className="mb-8">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-red-400">
                {mode === "login" ? "Retour en ville" : "Nouvel empire"}
              </p>
              <h2 className="mt-2 text-3xl font-black">
                {mode === "login" ? "Connexion" : "Créer un compte"}
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                {mode === "login"
                  ? "Connecte-toi pour reprendre exactement ta partie."
                  : "Ta première connexion créera automatiquement une nouvelle ville."}
              </p>
            </div>

            <div className="mb-6 grid grid-cols-2 rounded-2xl border border-white/10 bg-zinc-950/70 p-1">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${
                  mode === "login"
                    ? "bg-red-700 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Connexion
              </button>
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${
                  mode === "signup"
                    ? "bg-red-700 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Inscription
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-zinc-400">
                    Pseudo
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                    maxLength={20}
                    className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-base text-white outline-none transition focus:border-red-500"
                    placeholder="Ton nom d'empire"
                  />
                </label>
              )}

              <label className="block">
                <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-zinc-400">
                  E-mail
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-base text-white outline-none transition focus:border-red-500"
                  placeholder="toi@email.fr"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-zinc-400">
                  Mot de passe
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-base text-white outline-none transition focus:border-red-500"
                  placeholder="8 caractères minimum"
                />
              </label>

              {mode === "signup" && (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-zinc-400">
                    Confirmer le mot de passe
                  </span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-base text-white outline-none transition focus:border-red-500"
                    placeholder="Répète ton mot de passe"
                  />
                </label>
              )}

              {errorMessage && (
                <div className="rounded-xl border border-red-500/25 bg-red-950/35 px-4 py-3 text-sm text-red-200">
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
                  {successMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="h-12 w-full rounded-xl bg-red-700 px-5 text-sm font-black uppercase tracking-wide text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy
                  ? "Connexion au réseau…"
                  : mode === "login"
                    ? "Entrer dans Crime Empire"
                    : "Créer mon empire"}
              </button>
            </form>

            <p className="mt-6 text-center text-xs leading-5 text-zinc-500">
              Version MVP fermée — les comptes créés ici possèdent une sauvegarde distincte dans Supabase.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
