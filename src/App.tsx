import { useEffect, useMemo, useState, type FormEvent } from "react";

type Gender = "female" | "male" | "other" | "undisclosed";
type Guest = {
  id: string;
  firstName: string;
  lastName: string;
  invitedBy: string;
  hasPlusOne: boolean;
  plusOneName: string;
  confirmed: boolean;
  symbolicInvitation: boolean;
  isChild: boolean;
  gender: Gender;
};
type GuestForm = Omit<Guest, "id">;

const emptyForm: GuestForm = {
  firstName: "",
  lastName: "",
  invitedBy: "",
  hasPlusOne: false,
  plusOneName: "",
  confirmed: false,
  symbolicInvitation: false,
  isChild: false,
  gender: "undisclosed",
};

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { "content-type": "application/json", ...options?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || "No se pudo completar la solicitud.");
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

const genderLabels: Record<Gender, string> = {
  female: "Mujer",
  male: "Hombre",
  other: "Otro",
  undisclosed: "Prefiero no decir",
};

function App() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "confirmed" | "pending" | "symbolic">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [form, setForm] = useState<GuestForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    request<Guest[]>("/api/guests")
      .then(setGuests)
      .catch((cause: Error) => setError(cause.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredGuests = useMemo(() => {
    const search = query.trim().toLocaleLowerCase("es");
    return guests.filter((guest) => {
      const matchesFilter = filter === "all"
        || (filter === "confirmed" && guest.confirmed)
        || (filter === "pending" && !guest.confirmed && !guest.symbolicInvitation)
        || (filter === "symbolic" && guest.symbolicInvitation);
      const searchable = [guest.firstName, guest.lastName, guest.invitedBy, guest.plusOneName]
        .join(" ")
        .toLocaleLowerCase("es");
      return matchesFilter && (!search || searchable.includes(search));
    });
  }, [filter, guests, query]);

  const confirmedCount = guests.filter((guest) => guest.confirmed).length;
  const plusOneCount = guests.filter((guest) => guest.hasPlusOne).length;

  function openNewForm() {
    setEditingGuest(null);
    setForm(emptyForm);
    setFormOpen(true);
    setError("");
  }

  function openEditForm(guest: Guest) {
    setEditingGuest(guest);
    setForm({
      firstName: guest.firstName,
      lastName: guest.lastName,
      invitedBy: guest.invitedBy,
      hasPlusOne: guest.hasPlusOne,
      plusOneName: guest.plusOneName,
      confirmed: guest.confirmed,
      symbolicInvitation: guest.symbolicInvitation,
      isChild: guest.isChild,
      gender: guest.gender,
    });
    setFormOpen(true);
    setError("");
  }

  async function saveGuest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const guest = await request<Guest>(
        editingGuest ? `/api/guests/${encodeURIComponent(editingGuest.id)}` : "/api/guests",
        {
          method: editingGuest ? "PUT" : "POST",
          body: JSON.stringify({
            ...form,
            plusOneName: form.hasPlusOne ? form.plusOneName.trim() : "",
            confirmed: form.symbolicInvitation ? false : form.confirmed,
          }),
        },
      );
      setGuests((current) => editingGuest
        ? current.map((item) => item.id === guest.id ? guest : item)
        : [...current, guest]);
      setFormOpen(false);
      setForm(emptyForm);
      setEditingGuest(null);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteGuest(guest: Guest) {
    if (!window.confirm(`¿Eliminar a ${guest.firstName} ${guest.lastName} de la lista?`)) return;
    setError("");
    try {
      await request<void>(`/api/guests/${encodeURIComponent(guest.id)}`, { method: "DELETE" });
      setGuests((current) => current.filter((item) => item.id !== guest.id));
    } catch (cause) {
      setError((cause as Error).message);
    }
  }

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Nuestro día, inicio">
          <span className="brand-mark">N</span>
          <span>NUESTRO DÍA</span>
        </a>
        <span className="topbar-note">EL COMIENZO DE ALGO BONITO</span>
      </header>

      <section className="welcome">
        <div className="eyebrow"><span /> ORGANIZACIÓN DE LA BODA</div>
        <h1>Las personas que<br /><em>hacen especial</em> este día.</h1>
        <p>Un lugar para cuidar cada detalle y tener cerca a quienes más queremos.</p>
        <div className="welcome-flower" aria-hidden="true">✳</div>
      </section>

      <section className="overview" aria-label="Resumen de invitados">
        <div className="overview-label">LISTA DE INVITADOS</div>
        <div className="overview-stats">
          <div className="stat"><strong>{guests.length}</strong><span>INVITADOS</span></div>
          <div className="stat-divider" />
          <div className="stat"><strong>{confirmedCount}</strong><span>CONFIRMADOS</span></div>
          <div className="stat-divider" />
          <div className="stat"><strong>{plusOneCount}</strong><span>CON ACOMPAÑANTE</span></div>
        </div>
        <button className="button button-dark" onClick={openNewForm}><span>＋</span> Agregar invitado</button>
      </section>

      {error && <div className="error-banner" role="alert">{error}</div>}

      <section className="guest-panel">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">PERSONAS IMPORTANTES</div>
            <h2>Invitados <span>{guests.length}</span></h2>
          </div>
          <div className="tools">
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar invitado" aria-label="Buscar invitado" />
            </label>
            <label className="filter-label">
              <span className="visually-hidden">Filtrar confirmación</span>
              <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}>
                <option value="all">Todos</option>
                <option value="confirmed">Confirmados</option>
                <option value="pending">Pendientes</option>
                <option value="symbolic">Invitaciones simbólicas</option>
              </select>
            </label>
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><span className="loader" /> Cargando tu lista...</div>
        ) : filteredGuests.length === 0 ? (
          <div className="empty-state">
            <span className="empty-ornament" aria-hidden="true">✳</span>
            <h3>{guests.length === 0 ? "Tu lista empieza aquí" : "No encontramos invitados"}</h3>
            <p>{guests.length === 0 ? "Agrega a las personas con quienes quieres compartir este día." : "Prueba con otro nombre o cambia los filtros."}</p>
            {guests.length === 0 && <button className="button button-outline" onClick={openNewForm}>Agregar primer invitado</button>}
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>INVITADO</th><th>INVITADO POR</th><th>ACOMPAÑANTE</th><th>SEXO</th><th>CONFIRMACIÓN</th><th><span className="visually-hidden">Acciones</span></th></tr>
              </thead>
              <tbody>
                {filteredGuests.map((guest) => (
                  <tr key={guest.id}>
                    <td>
                      <div className="guest-name"><span className="avatar">{guest.firstName.charAt(0).toLocaleUpperCase("es")}</span><span>{guest.firstName} {guest.lastName}</span>{guest.isChild && <span className="child-tag">Niño/a</span>}</div>
                    </td>
                    <td className="muted-cell">{guest.invitedBy || "—"}</td>
                    <td className="muted-cell">{guest.hasPlusOne ? guest.plusOneName || "Sí, sin nombre aún" : "—"}</td>
                    <td className="muted-cell">{genderLabels[guest.gender]}</td>
                    <td><span className={`status ${guest.symbolicInvitation ? "status-symbolic" : guest.confirmed ? "status-confirmed" : "status-pending"}`}><i />{guest.symbolicInvitation ? "Simbólica · no asistirá" : guest.confirmed ? "Confirmado" : "Pendiente"}</span></td>
                    <td className="row-actions">
                      <button onClick={() => openEditForm(guest)} aria-label={`Editar a ${guest.firstName}`} title="Editar">Editar</button>
                      <button onClick={() => void deleteGuest(guest)} aria-label={`Eliminar a ${guest.firstName}`} title="Eliminar">Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filteredGuests.length > 0 && <div className="table-footer">Mostrando {filteredGuests.length} de {guests.length} invitados</div>}
      </section>
      <footer className="footer-note">HECHO CON CARIÑO, PARA UN DÍA INOLVIDABLE <span>✳</span></footer>

      {formOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false); }}>
          <section className="guest-modal" role="dialog" aria-modal="true" aria-labelledby="form-title">
            <div className="modal-heading">
              <div><div className="eyebrow">LISTA DE INVITADOS</div><h2 id="form-title">{editingGuest ? "Editar invitado" : "Un nuevo invitado"}</h2></div>
              <button className="close-button" onClick={() => setFormOpen(false)} aria-label="Cerrar">×</button>
            </div>
            <form onSubmit={saveGuest}>
              <div className="form-grid">
                <label>Nombre<input autoFocus required value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} placeholder="Nombre" /></label>
                <label>Apellidos<input required value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} placeholder="Apellidos" /></label>
                <label className="full-width">¿Quién lo invitó?<input value={form.invitedBy} onChange={(event) => setForm({ ...form, invitedBy: event.target.value })} placeholder="Por ejemplo, Ana o la familia López" /></label>
                <label className="full-width">Sexo
                  <select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value as Gender })}>
                    <option value="female">Mujer</option><option value="male">Hombre</option><option value="other">Otro</option><option value="undisclosed">Prefiero no decir</option>
                  </select>
                </label>
                <label className="check-option full-width">
                  <input type="checkbox" checked={form.isChild} onChange={(event) => setForm({ ...form, isChild: event.target.checked })} />
                  <span><strong>Es niño/a</strong><small>Identifica a los invitados menores de edad.</small></span>
                </label>
                <label className="check-option full-width">
                  <input type="checkbox" checked={form.hasPlusOne} onChange={(event) => setForm({ ...form, hasPlusOne: event.target.checked })} />
                  <span><strong>Puede llevar acompañante</strong><small>Podrás anotar su nombre ahora o más adelante.</small></span>
                </label>
                {form.hasPlusOne && <label className="full-width">Nombre del acompañante<input value={form.plusOneName} onChange={(event) => setForm({ ...form, plusOneName: event.target.value })} placeholder="Si ya lo sabes" /></label>}
                <label className="check-option full-width">
                  <input type="checkbox" checked={form.confirmed} disabled={form.symbolicInvitation} onChange={(event) => setForm({ ...form, confirmed: event.target.checked })} />
                  <span><strong>Asistencia confirmada</strong><small>Marca esta opción cuando haya confirmado su asistencia.</small></span>
                </label>
                <label className="check-option full-width">
                  <input type="checkbox" checked={form.symbolicInvitation} onChange={(event) => setForm({ ...form, symbolicInvitation: event.target.checked, confirmed: event.target.checked ? false : form.confirmed })} />
                  <span><strong>Invitación simbólica (no asistirá)</strong><small>Registra a esta persona aunque no vaya a asistir.</small></span>
                </label>
              </div>
              <div className="form-actions">
                <button type="button" className="button button-text" onClick={() => setFormOpen(false)}>Cancelar</button>
                <button type="submit" className="button button-dark" disabled={saving}>{saving ? "Guardando..." : editingGuest ? "Guardar cambios" : "Agregar invitado"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
