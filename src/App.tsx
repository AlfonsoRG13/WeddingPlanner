import { useEffect, useState } from "react";
import AppFooter from "./components/layout/AppFooter";
import AppHeader from "./components/layout/AppHeader";
import WelcomeBanner from "./components/layout/WelcomeBanner";
import ExpensesSection from "./features/expenses/ExpensesSection";
import GuestsSection from "./features/guests/GuestsSection";
import { GUESTS_API_PATH } from "./features/guests/constants";
import type { Guest } from "./features/guests/types";
import { getErrorMessage, requestJson } from "./shared/api";

type AppSection = "guests" | "expenses";

function App() {
  const [activeSection, setActiveSection] = useState<AppSection>("guests");
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(true);
  const [guestLoadError, setGuestLoadError] = useState("");

  useEffect(() => {
    requestJson<Guest[]>(GUESTS_API_PATH)
      .then(setGuests)
      .catch((cause: unknown) => setGuestLoadError(getErrorMessage(cause)))
      .finally(() => setLoadingGuests(false));
  }, []);

  return (
    <main className="page-shell">
      <AppHeader activeSection={activeSection} onSectionChange={setActiveSection} />
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
