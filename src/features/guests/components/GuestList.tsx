import { GENDER_LABELS, WEDDING_ROLE_LABELS } from "../constants";
import type { Guest } from "../types";

type GuestListProps = {
  guests: Guest[];
  totalGuests: number;
  loading: boolean;
  onEdit: (guest: Guest) => void;
  onDelete: (guest: Guest) => void;
  onAddFirstGuest: () => void;
};

function GuestList({ guests, totalGuests, loading, onEdit, onDelete, onAddFirstGuest }: GuestListProps) {
  if (loading) {
    return <div className="empty-state"><span className="loader" /> Cargando tu lista...</div>;
  }

  if (guests.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-ornament" aria-hidden="true">✳</span>
        <h3>{totalGuests === 0 ? "Tu lista empieza aquí" : "No encontramos invitados"}</h3>
        <p>{totalGuests === 0 ? "Agrega a las personas con quienes quieres compartir este día." : "Prueba con otro nombre o cambia los filtros."}</p>
        {totalGuests === 0 && <button className="button button-outline" onClick={onAddFirstGuest}>Agregar primer invitado</button>}
      </div>
    );
  }

  return (
    <>
      <div className="table-scroll">
        <table>
          <thead>
            <tr><th>INVITADO</th><th>INVITADO POR</th><th>ACOMPAÑANTE</th><th>SEXO</th><th>ROL EN LA BODA</th><th>CONFIRMACIÓN</th><th><span className="visually-hidden">Acciones</span></th></tr>
          </thead>
          <tbody>
            {guests.map((guest) => (
              <tr key={guest.id}>
                <td>
                  <div className="guest-name"><span className="avatar">{guest.name.charAt(0).toLocaleUpperCase("es")}</span><span>{guest.name}</span>{guest.isChild && <span className="child-tag">Niño/a</span>}</div>
                </td>
                <td className="muted-cell">{guest.invitedBy || "—"}</td>
                <td className="muted-cell">{guest.hasPlusOne ? guest.plusOneName || "Sí, sin nombre aún" : "—"}</td>
                <td className="muted-cell">{GENDER_LABELS[guest.gender]}</td>
                <td className="muted-cell">{WEDDING_ROLE_LABELS[guest.weddingRole ?? "none"]}</td>
                <td><span className={`status ${guest.symbolicInvitation ? "status-symbolic" : guest.confirmed ? "status-confirmed" : "status-pending"}`}><i />{guest.symbolicInvitation ? "Simbólica · no asistirá" : guest.confirmed ? "Confirmado" : "Pendiente"}</span></td>
                <td className="row-actions">
                  <button onClick={() => onEdit(guest)} aria-label={`Editar a ${guest.name}`} title="Editar">Editar</button>
                  <button onClick={() => onDelete(guest)} aria-label={`Eliminar a ${guest.name}`} title="Eliminar">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-footer">Mostrando {guests.length} de {totalGuests} invitados</div>
    </>
  );
}

export default GuestList;
