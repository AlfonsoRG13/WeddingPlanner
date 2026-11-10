import type { ExpenseFormValues, PaymentFormValues } from "./types";

export const EXPENSES_API_PATH = "/api/expenses";

export const EMPTY_EXPENSE_FORM: ExpenseFormValues = {
  concept: "",
  responsible: "",
  phone: "",
  pricePerPerson: "",
  fixedAmount: "0",
};

export const INITIAL_PAYMENT_FORM: Omit<PaymentFormValues, "date"> = {
  amount: "",
  note: "",
};

export const EXPENSE_FILTER_OPTIONS = [
  { value: "all", label: "Todos los gastos" },
  { value: "unassigned", label: "Sin monto asignado" },
] as const;

export const EXPENSE_SUMMARY_LABELS = {
  total: "COSTO TOTAL",
  paid: "PAGADO",
  pending: "PENDIENTE",
  conceptCount: "conceptos",
  paidDescription: "Pagos registrados",
  pendingDescription: "Por pagar",
} as const;

export const EXPENSE_MESSAGES = {
  invalidAmounts: "Ingresa importes válidos, iguales o mayores a cero.",
  invalidPaymentAmount: "El importe del pago debe ser mayor a cero.",
  loading: "Cargando tus gastos...",
  emptyTitle: "Aún no hay conceptos de gastos",
  emptyDescription: "Agrega un concepto para comenzar a organizar el presupuesto de tu boda.",
  noResultsTitle: "No encontramos gastos",
  noResultsSearch: "Prueba con otra búsqueda o cambia el filtro de monto.",
  noUnassignedResults: "Todos tus conceptos ya tienen un monto total asignado.",
  newExpenseTitle: "Nuevo concepto",
  editExpenseTitle: "Editar concepto",
} as const;

export function getTodayDate(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
