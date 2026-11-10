import type { FormEvent } from "react";
import Modal from "../../../shared/components/Modal";
import { GENDER_OPTIONS, WEDDING_ROLE_OPTIONS } from "../constants";
import type { GuestFormValues } from "../types";

type GuestFormModalProps = {
  editing: boolean;
  form: GuestFormValues;
  saving: boolean;
  onFormChange: (form: GuestFormValues) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function GuestFormModal({ editing, form, saving, onFormChange, onClose, onSubmit }: GuestFormModalProps) {
  return (
    <Modal
      titleId="form-title"
      eyebrow="LISTA DE INVITADOS"
      title={editing ? "Editar invitado" : "Un nuevo invitado"}
      onClose={onClose}
    >
      <form onSubmit={onSubmit}>
        <div className="form-grid">
          <label className="full-width">Nombre<input autoFocus required value={form.name} onChange={(event) => onFormChange({ ...form, name: event.target.value })} placeholder="Nombre completo" /></label>
          <label className="full-width">¿Quién lo invitó?<input value={form.invitedBy} onChange={(event) => onFormChange({ ...form, invitedBy: event.target.value })} placeholder="Por ejemplo, Ana o la familia López" /></label>
          <label className="full-width">Sexo
            <select value={form.gender} onChange={(event) => onFormChange({ ...form, gender: event.target.value as GuestFormValues["gender"] })}>
              {GENDER_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="full-width">Rol en la boda
            <select value={form.weddingRole} onChange={(event) => onFormChange({ ...form, weddingRole: event.target.value as GuestFormValues["weddingRole"] })}>
              {WEDDING_ROLE_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="check-option full-width">
            <input type="checkbox" checked={form.isChild} onChange={(event) => onFormChange({ ...form, isChild: event.target.checked })} />
            <span><strong>Es niño/a</strong><small>Identifica a los invitados menores de edad.</small></span>
          </label>
          <label className="check-option full-width">
            <input type="checkbox" checked={form.hasPlusOne} onChange={(event) => onFormChange({ ...form, hasPlusOne: event.target.checked })} />
            <span><strong>Puede llevar acompañante</strong><small>Podrás anotar su nombre ahora o más adelante.</small></span>
          </label>
          {form.hasPlusOne && <label className="full-width">Nombre del acompañante<input value={form.plusOneName} onChange={(event) => onFormChange({ ...form, plusOneName: event.target.value })} placeholder="Si ya lo sabes" /></label>}
          <label className="check-option full-width">
            <input type="checkbox" checked={form.confirmed} disabled={form.symbolicInvitation} onChange={(event) => onFormChange({ ...form, confirmed: event.target.checked })} />
            <span><strong>Asistencia confirmada</strong><small>Marca esta opción cuando haya confirmado su asistencia.</small></span>
          </label>
          <label className="check-option full-width">
            <input type="checkbox" checked={form.symbolicInvitation} onChange={(event) => onFormChange({ ...form, symbolicInvitation: event.target.checked, confirmed: event.target.checked ? false : form.confirmed })} />
            <span><strong>Invitación simbólica (no asistirá)</strong><small>Registra a esta persona aunque no vaya a asistir.</small></span>
          </label>
        </div>
        <div className="form-actions">
          <button type="button" className="button button-text" onClick={onClose}>Cancelar</button>
          <button type="submit" className="button button-dark" disabled={saving}>{saving ? "Guardando..." : editing ? "Guardar cambios" : "Agregar invitado"}</button>
        </div>
      </form>
    </Modal>
  );
}

export default GuestFormModal;
