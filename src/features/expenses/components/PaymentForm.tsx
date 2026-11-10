import type { FormEvent } from "react";
import type { PaymentFormValues } from "../types";

type PaymentFormProps = {
  form: PaymentFormValues;
  saving: boolean;
  onChange: (form: PaymentFormValues) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function PaymentForm({ form, saving, onChange, onSubmit }: PaymentFormProps) {
  return (
    <form className="payment-form" onSubmit={onSubmit}>
      <label>Importe<input autoFocus type="number" min="0.01" step="0.01" required value={form.amount} onChange={(event) => onChange({ ...form, amount: event.target.value })} placeholder="0.00" /></label>
      <label>Fecha<input type="date" required value={form.date} onChange={(event) => onChange({ ...form, date: event.target.value })} /></label>
      <label className="payment-note-input">Nota (opcional)<input value={form.note} onChange={(event) => onChange({ ...form, note: event.target.value })} placeholder="Anticipo, liquidación..." /></label>
      <button className="button button-dark" disabled={saving}>{saving ? "Guardando..." : "Guardar pago"}</button>
    </form>
  );
}

export default PaymentForm;
