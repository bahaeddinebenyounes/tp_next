"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
 
export default function AuthForm(
  { mode }: { mode: "login" | "register" }
) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
 
  async function onSubmit(
    e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const data = Object.fromEntries(
      new FormData(e.currentTarget));
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Une erreur est survenue");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }
  const cls = "w-full rounded border p-2";
  return (
    <form onSubmit={onSubmit}
      className="flex max-w-sm flex-col gap-3">
      {mode === "register" && (
        <input name="name" placeholder="Nom"
          required className={cls} />
      )}
      <input name="email" type="email"
        placeholder="Email" required className={cls} />
      <input name="password" type="password"
        placeholder="Mot de passe" required className={cls} />
      {error && <p className="text-red-600">{error}</p>}
      <button disabled={loading}>
        {loading ? "Patientez..." : mode === "login"
          ? "Se connecter" : "S'inscrire"}
      </button>
    </form>
  );
}
