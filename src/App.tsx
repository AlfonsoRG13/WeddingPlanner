import { useCallback, useEffect, useState } from "react";
import AppFooter from "./components/layout/AppFooter";
import AppHeader from "./components/layout/AppHeader";
import WelcomeBanner from "./components/layout/WelcomeBanner";
import LoginScreen from "./features/auth/LoginScreen";
import ExpensesSection from "./features/expenses/ExpensesSection";
import GuestsSection from "./features/guests/GuestsSection";
import { GUESTS_API_PATH } from "./features/guests/constants";
import type { Guest } from "./features/guests/types";
import { getErrorMessage, requestJson } from "./shared/api";
import ErrorBanner from "./shared/components/ErrorBanner";

type AppSection = "guests" | "expenses";
type AuthSession = {
  authenticated: boolean;
  authenticationEnabled: boolean;
};

function App() {
  const [activeSection, setActiveSection] = useState<AppSection>("guests");
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(true);
  const [guestLoadError, setGuestLoadError] = useState("");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [signOutError, setSignOutError] = useState("");

  useEffect(() => {
    requestJson<AuthSession>("/api/auth/session")
      .then(setSession)
      .catch((cause: unknown) => setSessionError(getErrorMessage(cause)))
      .finally(() => setLoadingSession(false));
  }, []);

  useEffect(() => {
    if (!session?.authenticated) return;
    requestJson<Guest[]>(GUESTS_API_PATH)
      .then(setGuests)
      .catch((cause: unknown) => setGuestLoadError(getErrorMessage(cause)))
      .finally(() => setLoadingGuests(false));
  }, [session?.authenticated]);

  const handleAuthenticated = useCallback(() => {
    setSessionError("");
    setGuestLoadError("");
    setLoadingGuests(true);
    setSession((current) => ({
      authenticated: true,
      authenticationEnabled: current?.authenticationEnabled ?? true,
    }));
  }, []);

  async function handleSignOut() {
    try {
      await requestJson<void>("/api/auth/logout", { method: "POST" });
      setSignOutError("");
      setSession((current) => current ? { ...current, authenticated: false } : current);
      setGuests([]);
    } catch (cause) {
      setSignOutError(getErrorMessage(cause));
    }
  }

  if (loadingSession) {
    return <main className="auth-page"><div className="loader" role="status" aria-label="Cargando sesión" /></main>;
  }

  if (!session?.authenticated) {
    return <LoginScreen onAuthenticated={handleAuthenticated} initialError={sessionError} />;
  }

  return (
    <main className="page-shell">
      <AppHeader
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onSignOut={session.authenticationEnabled ? handleSignOut : undefined}
      />
      {signOutError && <ErrorBanner message={signOutError} />}
      <WelcomeBanner />
      {activeSection === "guests" ? (
        <GuestsSection
          guests={guests}
          loading={loadingGuests}
          loadError={guestLoadError}
          onGuestsChange={setGuests}
        />
      ) : (
        <ExpensesSection
          guestCount={guests.length}
          guestCountLoading={loadingGuests}
          guestCountError={guestLoadError}
        />
      )}
      <AppFooter />
    </main>
  );
}

export default App;
