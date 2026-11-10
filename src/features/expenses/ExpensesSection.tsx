import { useEffect, useMemo, useState, type FormEvent } from "react";
import { getErrorMessage, normalizeSearch, requestJson } from "../../shared/api";
import ErrorBanner from "../../shared/components/ErrorBanner";
import {
  EMPTY_EXPENSE_FORM,
  EXPENSES_API_PATH,
  EXPENSE_MESSAGES,
  INITIAL_PAYMENT_FORM,
  getTodayDate,
} from "./constants";
import ExpenseCard from "./components/ExpenseCard";
import ExpenseFormModal from "./components/ExpenseFormModal";
import ExpenseSummary from "./components/ExpenseSummary";
import ExpenseToolbar from "./components/ExpenseToolbar";
import { CURRENCY_FORMATTER, getExpensePaidTotal, getExpenseTotal, hasAssignedExpenseTotal } from "./utils";
import type { Expense, ExpenseFormValues, Payment, PaymentFormValues } from "./types";

type ExpensesSectionProps = {
  guestCount: number;
  guestCountLoading: boolean;
  guestCountError: string;
};

function ExpensesSection({ guestCount, guestCountLoading, guestCountError }: ExpensesSectionProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [expandedExpenses, setExpandedExpenses] = useState<Set<string>>(() => new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseForm, setExpenseForm] = useState<ExpenseFormValues>(EMPTY_EXPENSE_FORM);
  const [paymentExpenseId, setPaymentExpenseId] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentFormValues>({ ...INITIAL_PAYMENT_FORM, date: getTodayDate() });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    requestJson<Expense[]>(EXPENSES_API_PATH)
      .then(setExpenses)
      .catch((cause: unknown) => setError(getErrorMessage(cause)))
      .finally(() => setLoading(false));
  }, []);

  const totalCost = useMemo(
    () => expenses.reduce((sum, expense) => sum + getExpenseTotal(expense, guestCount), 0),
    [expenses, guestCount],
  );
  const totalPaid = useMemo(() => expenses.reduce((sum, expense) => sum + getExpensePaidTotal(expense), 0), [expenses]);
  const totalPending = Math.max(totalCost - totalPaid, 0);
  const filteredExpenses = useMemo(() => {
    const search = normalizeSearch(query);
    return expenses.filter((expense) => {
      const matchesSearch = !search || normalizeSearch([
        expense.concept,
        expense.responsible,
        expense.phone,
        ...expense.payments.map((payment) => payment.note),
      ].join(" ")).includes(search);
      return matchesSearch && (!unassignedOnly || !hasAssignedExpenseTotal(expense));
    });
  }, [expenses, query, unassignedOnly]);

  function resetPaymentForm() {
    setPaymentForm({ ...INITIAL_PAYMENT_FORM, date: getTodayDate() });
  }

  function openNewExpense() {
    setEditingExpense(null);
    setExpenseForm(EMPTY_EXPENSE_FORM);
    setError("");
    setFormOpen(true);
  }

  function openEditExpense(expense: Expense) {
    setEditingExpense(expense);
    setExpenseForm({
      concept: expense.concept,
      responsible: expense.responsible,
      phone: expense.phone,
      pricePerPerson: expense.pricePerPerson === null ? "" : String(expense.pricePerPerson),
      fixedAmount: String(expense.fixedAmount),
    });
    setError("");
    setFormOpen(true);
  }

  async function saveExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const hasPerPersonPrice = expenseForm.pricePerPerson.trim() !== "";
    const pricePerPerson = hasPerPersonPrice ? Number(expenseForm.pricePerPerson) : null;
    const fixedAmount = hasPerPersonPrice ? 0 : Number(expenseForm.fixedAmount);
    if ((pricePerPerson !== null && (!Number.isFinite(pricePerPerson) || pricePerPerson < 0))
      || !Number.isFinite(fixedAmount) || fixedAmount < 0) {
      setError(EXPENSE_MESSAGES.invalidAmounts);
      setSaving(false);
      return;
    }

    try {
      const body = {
        concept: expenseForm.concept.trim(),
        responsible: expenseForm.responsible.trim(),
        phone: expenseForm.phone.trim(),
        pricePerPerson,
        fixedAmount,
      };
      const expense = await requestJson<Expense>(
        editingExpense ? `${EXPENSES_API_PATH}/${encodeURIComponent(editingExpense.id)}` : EXPENSES_API_PATH,
        { method: editingExpense ? "PUT" : "POST", body: JSON.stringify(body) },
      );
      setExpenses((current) => editingExpense
        ? current.map((item) => item.id === expense.id ? expense : item)
        : [...current, expense]);
      setFormOpen(false);
      setEditingExpense(null);
      setExpenseForm(EMPTY_EXPENSE_FORM);
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function addPayment(event: FormEvent<HTMLFormElement>, expense: Expense) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const amount = Number(paymentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError(EXPENSE_MESSAGES.invalidPaymentAmount);
      setSaving(false);
      return;
    }

    try {
      const payment = await requestJson<Payment>(
        `${EXPENSES_API_PATH}/${encodeURIComponent(expense.id)}/payments`,
        { method: "POST", body: JSON.stringify({ amount, date: paymentForm.date, note: paymentForm.note.trim() }) },
      );
      setExpenses((current) => current.map((item) => item.id === expense.id
        ? { ...item, payments: [...item.payments, payment] }
        : item));
      setPaymentExpenseId(null);
      resetPaymentForm();
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function deletePayment(expense: Expense, payment: Payment) {
    if (!window.confirm(`¿Eliminar el pago de ${CURRENCY_FORMATTER.format(payment.amount)}?`)) return;
    setError("");
    try {
      await requestJson<void>(
        `${EXPENSES_API_PATH}/${encodeURIComponent(expense.id)}/payments/${encodeURIComponent(payment.id)}`,
        { method: "DELETE" },
      );
      setExpenses((current) => current.map((item) => item.id === expense.id
        ? { ...item, payments: item.payments.filter((entry) => entry.id !== payment.id) }
        : item));
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  async function deleteExpense(expense: Expense) {
    if (!window.confirm(`¿Eliminar "${expense.concept}" y todos sus pagos?`)) return;
    setError("");
    try {
      await requestJson<void>(`${EXPENSES_API_PATH}/${encodeURIComponent(expense.id)}`, { method: "DELETE" });
      setExpenses((current) => current.filter((item) => item.id !== expense.id));
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  function toggleExpandedExpense(expenseId: string) {
    setExpandedExpenses((current) => {
      const next = new Set(current);
      if (next.has(expenseId)) next.delete(expenseId);
      else next.add(expenseId);
      return next;
    });
  }

  function togglePaymentForm(expenseId: string) {
    setPaymentExpenseId((current) => current === expenseId ? null : expenseId);
    resetPaymentForm();
    setError("");
  }

  return (
    <section className="expenses-page" aria-label="Sección de gastos">
      <div className="expenses-heading">
        <div>
          <div className="eyebrow"><span /> PRESUPUESTO DE LA BODA</div>
          <h2>Gastos <em>con todo bajo control.</em></h2>
          <p>Registra cada concepto y lleva un seguimiento de los pagos y saldos.</p>
        </div>
        <button className="button button-dark" onClick={openNewExpense}><span>＋</span> Agregar concepto</button>
      </div>

      <ExpenseSummary totalCost={totalCost} totalPaid={totalPaid} totalPending={totalPending} expenseCount={expenses.length} />
      {guestCountError && <ErrorBanner message={`No se pudo cargar la lista de invitados. Los cálculos por persona no estarán disponibles hasta reiniciar el servidor: ${guestCountError}`} />}
      {error && <ErrorBanner message={error} />}

      {loading ? (
        <div className="empty-state"><span className="loader" /> {EXPENSE_MESSAGES.loading}</div>
      ) : expenses.length === 0 ? (
        <div className="expense-empty">
          <span className="empty-ornament" aria-hidden="true">✳</span>
          <h3>{EXPENSE_MESSAGES.emptyTitle}</h3>
          <p>{EXPENSE_MESSAGES.emptyDescription}</p>
          <button className="button button-outline" onClick={openNewExpense}>Agregar primer concepto</button>
        </div>
      ) : (
        <>
          <ExpenseToolbar
            query={query}
            unassignedOnly={unassignedOnly}
            filteredCount={filteredExpenses.length}
            expenseCount={expenses.length}
            onQueryChange={setQuery}
            onUnassignedChange={setUnassignedOnly}
          />
          {filteredExpenses.length === 0 ? (
            <div className="expense-empty expense-no-results">
              <span className="empty-ornament" aria-hidden="true">⌕</span>
              <h3>{EXPENSE_MESSAGES.noResultsTitle}</h3>
              <p>{unassignedOnly && !query ? EXPENSE_MESSAGES.noUnassignedResults : EXPENSE_MESSAGES.noResultsSearch}</p>
              <button className="button button-outline" onClick={() => { setQuery(""); setUnassignedOnly(false); }}>Limpiar filtros</button>
            </div>
          ) : (
            <div className="expense-list">
              {filteredExpenses.map((expense) => (
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  guestCount={guestCount}
                  expanded={expandedExpenses.has(expense.id)}
                  paymentFormOpen={paymentExpenseId === expense.id}
                  paymentForm={paymentForm}
                  saving={saving}
                  onToggleExpanded={() => toggleExpandedExpense(expense.id)}
                  onEdit={() => openEditExpense(expense)}
                  onDelete={() => void deleteExpense(expense)}
                  onTogglePaymentForm={() => togglePaymentForm(expense.id)}
                  onPaymentFormChange={setPaymentForm}
                  onPaymentSubmit={(event) => void addPayment(event, expense)}
                  onDeletePayment={(payment) => void deletePayment(expense, payment)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {formOpen && (
        <ExpenseFormModal
          editing={editingExpense !== null}
          form={expenseForm}
          guestCount={guestCount}
          guestCountLoading={guestCountLoading}
          guestCountError={guestCountError}
          saving={saving}
          onChange={setExpenseForm}
          onClose={() => setFormOpen(false)}
          onSubmit={(event) => void saveExpense(event)}
        />
      )}
    </section>
  );
}

export default ExpensesSection;
