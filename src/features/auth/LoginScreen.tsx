import { useState, type FormEvent } from "react";
import { getErrorMessage, requestJson } from "../../shared/api";

type LoginScreenProps = {
  onAuthenticated: () => void;
  initialError?: string;
};

function LoginScreen({ onAuthenticated, initialError = "" }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await requestJson<{ authenticated: boolean }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      onAuthenticated();
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="brand-mark auth-brand-mark" aria-hidden="true">N</div>
        <p className="eyebrow">NUESTRO DÍA</p>
        <h1 id="login-title">Bienvenidos</h1>
        <p className="auth-description">Inicia sesión para continuar con la organización de la boda.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Usuario
            <input
              autoComplete="username"
              name="username"
              onChange={(event) => setUsername(event.target.value)}
              required
              value={username}
            />
          </label>
          <label>
            Contraseña
            <input
              autoComplete="current-password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          {error && <div className="error-banner" role="alert">{error}</div>}
          <button className="button button-dark" disabled={submitting} type="submit">
            {submitting ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default LoginScreen;
