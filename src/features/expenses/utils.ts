import type { Expense } from "./types";

export const CURRENCY_FORMATTER = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

export function getExpenseTotal(expense: Expense, guestCount: number): number {
  return expense.pricePerPerson === null
    ? expense.fixedAmount
    : Math.round(expense.pricePerPerson * guestCount * 100) / 100;
}

export function getExpensePaidTotal(expense: Expense): number {
  return expense.payments.reduce((sum, payment) => sum + payment.amount, 0);
}

export function getExpensePendingTotal(expense: Expense, guestCount: number): number {
  return Math.max(getExpenseTotal(expense, guestCount) - getExpensePaidTotal(expense), 0);
}

export function hasAssignedExpenseTotal(expense: Expense): boolean {
  return expense.pricePerPerson !== null || expense.fixedAmount > 0;
}
