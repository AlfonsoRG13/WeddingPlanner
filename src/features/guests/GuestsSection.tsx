import { useMemo, useState, type FormEvent } from "react";
import { getErrorMessage, normalizeSearch, requestJson } from "../../shared/api";
import ErrorBanner from "../../shared/components/ErrorBanner";
import { EMPTY_GUEST_FORM, GUESTS_API_PATH } from "./constants";
import GuestFormModal from "./components/GuestFormModal";
import GuestList from "./components/GuestList";
import GuestSummary from "./components/GuestSummary";
import GuestToolbar from "./components/GuestToolbar";
import type { Guest, GuestFilter, GuestFormValues } from "./types";

type GuestsSectionProps = {
  guests: Guest[];
  loading: boolean;
  loadError: string;
  onGuestsChange: (guests: Guest[] | ((current: Guest[]) => Guest[])) => void;
};

function GuestsSection({ guests, loading, loadError, onGuestsChange }: GuestsSectionProps) {
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<GuestFilter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [form, setForm] = useState<GuestFormValues>(EMPTY_GUEST_FORM);
  const [saving, setSaving] = useState(false);

  const filteredGuests = useMemo(() => {
    const search = normalizeSearch(query);
    return guests.filter((guest) => {
      const matchesFilter = filter === "all"
        || (filter === "confirmed" && guest.confirmed)
        || (filter === "pending" && !guest.confirmed && !guest.symbolicInvitation)
        || (filter === "symbolic" && guest.symbolicInvitation)
        || (filter === "bestMan" && guest.weddingRole === "bestMan")
        || (filter === "bridesmaid" && guest.weddingRole === "bridesmaid");
      const matchesSearch = !search || normalizeSearch([guest.name, guest.invitedBy, guest.plusOneName].join(" ")).includes(search);
      return matchesFilter && matchesSearch;
    });
  }, [filter, guests, query]);

  const confirmedCount = guests.filter((guest) => guest.confirmed).length;
  const plusOneCount = guests.filter((guest) => guest.hasPlusOne).length;
  const symbolicCount = guests.filter((guest) => guest.symbolicInvitation).length;
  const childrenCount = guests.filter((guest) => guest.isChild).length;
  const attendingGuests = guests.filter((guest) => !guest.symbolicInvitation && !guest.isChild);
  const totalInvitees = attendingGuests.length + attendingGuests.filter((guest) => guest.hasPlusOne).length;

  function openNewForm() {
    setEditingGuest(null);
    setForm(EMPTY_GUEST_FORM);
    setFormOpen(true);
    setError("");
  }

  function openEditForm(guest: Guest) {
    setEditingGuest(guest);
    setForm({
      name: guest.name,
      invitedBy: guest.invitedBy,
      hasPlusOne: guest.hasPlusOne,
      plusOneName: guest.plusOneName,
      confirmed: guest.confirmed,
      symbolicInvitation: guest.symbolicInvitation,
      isChild: guest.isChild,
      gender: guest.gender,
      weddingRole: guest.weddingRole ?? "none",
    });
    setFormOpen(true);
    setError("");
  }

  async function saveGuest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const guest = await requestJson<Guest>(
        editingGuest ? `${GUESTS_API_PATH}/${encodeURIComponent(editingGuest.id)}` : GUESTS_API_PATH,
        {
          method: editingGuest ? "PUT" : "POST",
          body: JSON.stringify({
            ...form,
            name: form.name.trim(),
            plusOneName: form.hasPlusOne ? form.plusOneName.trim() : "",
            confirmed: form.symbolicInvitation ? false : form.confirmed,
          }),
        },
      );
      onGuestsChange((current) => editingGuest
        ? current.map((item) => item.id === guest.id ? guest : item)
        : [...current, guest]);
      setFormOpen(false);
      setForm(EMPTY_GUEST_FORM);
      setEditingGuest(null);
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function deleteGuest(guest: Guest) {
    if (!window.confirm(`¿Eliminar a ${guest.name} de la lista?`)) return;
    setError("");
    try {
      await requestJson<void>(`${GUESTS_API_PATH}/${encodeURIComponent(guest.id)}`, { method: "DELETE" });
      onGuestsChange((current) => current.filter((item) => item.id !== guest.id));
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  return (
    <section aria-label="Sección de invitados">
      <GuestSummary
        totalInvitees={totalInvitees}
        symbolicCount={symbolicCount}
        childrenCount={childrenCount}
        confirmedCount={confirmedCount}
        plusOneCount={plusOneCount}
        onAddGuest={openNewForm}
      />
      {loadError && <ErrorBanner message={`No se pudo cargar la lista de invitados: ${loadError}`} />}
      {error && <ErrorBanner message={error} />}
      <section className="guest-panel">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">PERSONAS IMPORTANTES</div>
            <h2>Invitados <span>{guests.length}</span></h2>
          </div>
          <GuestToolbar query={query} filter={filter} onQueryChange={setQuery} onFilterChange={setFilter} />
        </div>
        <GuestList
          guests={filteredGuests}
          totalGuests={guests.length}
          loading={loading}
          onEdit={openEditForm}
          onDelete={(guest) => void deleteGuest(guest)}
          onAddFirstGuest={openNewForm}
        />
      </section>
      {formOpen && (
        <GuestFormModal
          editing={editingGuest !== null}
          form={form}
          saving={saving}
          onFormChange={setForm}
          onClose={() => setFormOpen(false)}
          onSubmit={(event) => void saveGuest(event)}
        />
      )}
    </section>
  );
}

export default GuestsSection;
