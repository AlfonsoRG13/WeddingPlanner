import { EXPENSE_SUMMARY_LABELS } from "../constants";
import { CURRENCY_FORMATTER } from "../utils";

type ExpenseSummaryProps = {
  totalCost: number;
  totalPaid: number;
  totalPending: number;
  expenseCount: number;
};

function ExpenseSummary({ totalCost, totalPaid, totalPending, expenseCount }: ExpenseSummaryProps) {
  const summaryItems = [
    { label: EXPENSE_SUMMARY_LABELS.total, amount: totalCost, description: `${expenseCount} ${EXPENSE_SUMMARY_LABELS.conceptCount}` },
    { label: EXPENSE_SUMMARY_LABELS.paid, amount: totalPaid, description: EXPENSE_SUMMARY_LABELS.paidDescription },
    { label: EXPENSE_SUMMARY_LABELS.pending, amount: totalPending, description: EXPENSE_SUMMARY_LABELS.pendingDescription },
  ];

  return (
    <div className="expense-summary" aria-label="Resumen de gastos">
      {summaryItems.map((item) => (
        <div key={item.label}>
          <span>{item.label}</span>
          <strong>{CURRENCY_FORMATTER.format(item.amount)}</strong>
          <small>{item.description}</small>
        </div>
      ))}
    </div>
  );
}

export default ExpenseSummary;
