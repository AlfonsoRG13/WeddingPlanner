import type { FormEvent } from "react";
import type { Expense, Payment, PaymentFormValues } from "../types";
import { CURRENCY_FORMATTER, getExpensePaidTotal, getExpensePendingTotal, getExpenseTotal } from "../utils";
import PaymentForm from "./PaymentForm";
import PaymentList from "./PaymentList";

type ExpenseCardProps = {
  expense: Expense;
  guestCount: number;
  expanded: boolean;
  paymentFormOpen: boolean;
  paymentForm: PaymentFormValues;
  saving: boolean;
  onToggleExpanded: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePaymentForm: () => void;
  onPaymentFormChange: (form: PaymentFormValues) => void;
  onPaymentSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDeletePayment: (payment: Payment) => void;
};

function ExpenseCard({
  expense,
  guestCount,
  expanded,
  paymentFormOpen,
  paymentForm,
  saving,
  onToggleExpanded,
  onEdit,
  onDelete,
  onTogglePaymentForm,
  onPaymentFormChange,
  onPaymentSubmit,
  onDeletePayment,
}: ExpenseCardProps) {
  const total = getExpenseTotal(expense, guestCount);
  const paid = getExpensePaidTotal(expense);
  const pending = getExpensePendingTotal(expense, guestCount);
  const overpaid = Math.max(paid - total, 0);
  const detailsId = `expense-details-${expense.id}`;

  return (
    <article className="expense-card">
      <div className="expense-card-heading">
        <button type="button" className="expense-toggle" aria-expanded={expanded} aria-controls={detailsId} onClick={onToggleExpanded}>
          <span className={`expense-chevron${expanded ? " expanded" : ""}`} aria-hidden="true">⌄</span>
          <span className="expense-heading-copy">
            <span className="eyebrow">CONCEPTO</span>
            <span className="expense-title">{expense.concept}</span>
            <span className="expense-contact">
              <span>{expense.responsible || "Sin encargado"}</span>
              {expense.phone && <span>{expense.phone}</span>}
            </span>
          </span>
          <span className="expense-heading-totals">
            <span><small>TOTAL</small><strong>{CURRENCY_FORMATTER.format(total)}</strong></span>
            <span><small>PENDIENTE</small><strong>{CURRENCY_FORMATTER.format(pending)}</strong></span>
            <span><small>PAGOS</small><strong>{expense.payments.length}</strong></span>
          </span>
        </button>
        <div className="expense-actions">
          <button onClick={onEdit}>Editar</button>
          <button onClick={onDelete}>Eliminar</button>
        </div>
      </div>
      <div id={detailsId} className="expense-details" hidden={!expanded}>
        {expense.pricePerPerson !== null && (
          <div className="per-person-note">
            {CURRENCY_FORMATTER.format(expense.pricePerPerson)} por persona × {guestCount} invitados registrados
          </div>
        )}
        <div className="expense-totals">
          <div><span>TOTAL DEL CONCEPTO</span><strong>{CURRENCY_FORMATTER.format(total)}</strong></div>
          <div><span>ACUMULADO PAGADO</span><strong>{CURRENCY_FORMATTER.format(paid)}</strong></div>
          <div><span>PENDIENTE</span><strong>{CURRENCY_FORMATTER.format(pending)}</strong></div>
          {overpaid > 0 && <div className="overpaid-note"><span>PAGADO DE MÁS</span><strong>{CURRENCY_FORMATTER.format(overpaid)}</strong></div>}
        </div>
        <div className="payments-section">
          <div className="payments-heading">
            <h4>Pagos <span>{expense.payments.length}</span></h4>
            <button className="button button-outline" onClick={onTogglePaymentForm}>
              {paymentFormOpen ? "Cancelar" : "＋ Registrar pago"}
            </button>
          </div>
          <PaymentList payments={expense.payments} onDelete={onDeletePayment} />
          {paymentFormOpen && (
            <PaymentForm form={paymentForm} saving={saving} onChange={onPaymentFormChange} onSubmit={onPaymentSubmit} />
          )}
        </div>
      </div>
    </article>
  );
}

export default ExpenseCard;
