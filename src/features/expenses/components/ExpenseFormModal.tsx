import type { FormEvent } from "react";
import Modal from "../../../shared/components/Modal";
import { EXPENSE_MESSAGES } from "../constants";
import type { ExpenseFormValues } from "../types";

type ExpenseFormModalProps = {
  editing: boolean;
  form: ExpenseFormValues;
  guestCount: number;
  guestCountLoading: boolean;
  guestCountError: string;
  saving: boolean;
  onChange: (form: ExpenseFormValues) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function ExpenseFormModal({
  editing,
  form,
  guestCount,
  guestCountLoading,
  guestCountError,
  saving,
  onChange,
  onClose,
  onSubmit,
}: ExpenseFormModalProps) {
  const hasPerPersonPrice = form.pricePerPerson.trim() !== "";
  const calculatedTotal = (Number(form.pricePerPerson || 0) * guestCount).toFixed(2);
  const title = editing ? EXPENSE_MESSAGES.editExpenseTitle : EXPENSE_MESSAGES.newExpenseTitle;

  return (
    <Modal titleId="expense-form-title" eyebrow="PRESUPUESTO DE LA BODA" title={title} className="expense-modal" onClose={onClose}>
      <form onSubmit={onSubmit}>
        <div className="form-grid">
          <label className="full-width">Concepto<input autoFocus required value={form.concept} onChange={(event) => onChange({ ...form, concept: event.target.value })} placeholder="Por ejemplo, banquete o flores" /></label>
          <label>Encargado<input value={form.responsible} onChange={(event) => onChange({ ...form, responsible: event.target.value })} placeholder="Nombre o proveedor" /></label>
          <label>Teléfono de contacto<input type="tel" value={form.phone} onChange={(event) => onChange({ ...form, phone: event.target.value })} placeholder="Teléfono" /></label>
          <label className="full-width">Precio por persona (opcional)<input type="number" min="0" step="0.01" value={form.pricePerPerson} onChange={(event) => onChange({ ...form, pricePerPerson: event.target.value })} placeholder="Déjalo vacío si no aplica" /></label>
          <label className="full-width">Total del concepto
            <input
              type="number"
              min="0"
              step="0.01"
              required={!hasPerPersonPrice}
              readOnly={hasPerPersonPrice}
              value={hasPerPersonPrice ? calculatedTotal : form.fixedAmount}
              onChange={(event) => onChange({ ...form, fixedAmount: event.target.value })}
              aria-describedby="expense-total-help"
            />
            <small id="expense-total-help" className="field-help">
              {!hasPerPersonPrice
                ? "Ingresa el total acordado para este concepto."
                : guestCountLoading
                  ? "Cargando la lista de invitados para calcular el total..."
                  : `Cálculo automático: precio por persona × ${guestCount} invitados registrados.`}
            </small>
          </label>
        </div>
        <div className="form-actions">
          <button type="button" className="button button-text" onClick={onClose}>Cancelar</button>
          <button
            type="submit"
            className="button button-dark"
            disabled={saving || (hasPerPersonPrice && (guestCountLoading || Boolean(guestCountError)))}
          >
            {saving ? "Guardando..." : editing ? "Guardar cambios" : "Agregar concepto"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default ExpenseFormModal;
