import type { Payment } from "../types";
import { CURRENCY_FORMATTER } from "../utils";

type PaymentListProps = {
  payments: Payment[];
  onDelete: (payment: Payment) => void;
};

function PaymentList({ payments, onDelete }: PaymentListProps) {
  if (payments.length === 0) {
    return <p className="no-payments">Aún no se han registrado pagos para este concepto.</p>;
  }

  return (
    <ul className="payment-list">
      {payments.map((payment) => (
        <li key={payment.id}>
          <span className="payment-date">{new Date(`${payment.date}T12:00:00`).toLocaleDateString("es-MX")}</span>
          <span className="payment-note">{payment.note || "Pago"}</span>
          <strong>{CURRENCY_FORMATTER.format(payment.amount)}</strong>
          <button onClick={() => onDelete(payment)} aria-label={`Eliminar pago de ${CURRENCY_FORMATTER.format(payment.amount)}`}>Eliminar</button>
        </li>
      ))}
    </ul>
  );
}

export default PaymentList;
