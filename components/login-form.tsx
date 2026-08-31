"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const payload = (await response.json()) as { error?: string; home?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível entrar.");
      router.replace(payload.home ?? "/");
      router.refresh();
    } catch (caught) {
      setSaving(false);
      setError(caught instanceof Error ? caught.message : "Não foi possível entrar.");
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="brand">
          <i>T</i>
          <span>
            <b>TIRONI</b>
            <small>TECH CONTROL</small>
          </span>
        </div>
        <h1>Acesso ao sistema</h1>
        <p>A área gerencial é restrita. Equipe comercial e DEV entram nas telas do time.</p>
        <label>
          Usuário
          <input
            autoComplete="username"
            placeholder="Digite seu usuário"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>
        <label>
          Senha
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Digite sua senha"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error ? <p className="note">{error}</p> : null}
        <button className="primary" type="submit" disabled={saving}>
          {saving ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
