import { useEffect, useMemo, useState, type FormEvent } from "react";

type Payment = {
  id: string;
  amount: number;
  date: string;
  note: string;
};

type Expense = {
  id: string;
  concept: string;
  responsible: string;
  phone: string;
  pricePerPerson: number | null;
  fixedAmount: number;
  payments: Payment[];
};

type ExpenseForm = {
  concept: string;
  responsible: string;
  phone: string;
  pricePerPerson: string;
  fixedAmount: string;
};

type PaymentForm = {
  amount: string;
  date: string;
  note: string;
};

const emptyExpenseForm: ExpenseForm = {
  concept: "",
  responsible: "",
  phone: "",
  pricePerPerson: "",
  fixedAmount: "0",
};

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const currency = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const totalFor = (expense: Expense, guestCount: number) => expense.pricePerPerson === null
  ? expense.fixedAmount
  : Math.round(expense.pricePerPerson * guestCount * 100) / 100;
const paidFor = (expense: Expense) => expense.payments.reduce((sum, payment) => sum + payment.amount, 0);

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { "content-type": "application/json", ...options?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || "No se pudo completar la solicitud.");
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

function getErrorMessage(cause: unknown) {
  return cause instanceof Error ? cause.message : "Ocurrió un error inesperado.";
}

function normalizeSearch(value: string) {
  return value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
}

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
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(emptyExpenseForm);
  const [paymentExpenseId, setPaymentExpenseId] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({ amount: "", date: today(), note: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    request<Expense[]>("/api/expenses")
      .then(setExpenses)
      .catch((cause: unknown) => setError(getErrorMessage(cause)))
      .finally(() => setLoading(false));
  }, []);

  const totalCost = useMemo(
    () => expenses.reduce((sum, expense) => sum + totalFor(expense, guestCount), 0),
    [expenses, guestCount],
  );
  const totalPaid = useMemo(
    () => expenses.reduce((sum, expense) => sum + paidFor(expense), 0),
    [expenses],
  );
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
      const hasAssignedTotal = expense.pricePerPerson !== null || expense.fixedAmount > 0;
      return matchesSearch && (!unassignedOnly || !hasAssignedTotal);
    });
  }, [expenses, query, unassignedOnly]);

  function openNewExpense() {
    setEditingExpense(null);
    setExpenseForm(emptyExpenseForm);
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
      setError("Ingresa importes válidos, iguales o mayores a cero.");
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
      const expense = await request<Expense>(
        editingExpense ? `/api/expenses/${encodeURIComponent(editingExpense.id)}` : "/api/expenses",
        { method: editingExpense ? "PUT" : "POST", body: JSON.stringify(body) },
      );
      setExpenses((current) => editingExpense
        ? current.map((item) => item.id === expense.id ? expense : item)
        : [...current, expense]);
      setFormOpen(false);
      setEditingExpense(null);
      setExpenseForm(emptyExpenseForm);
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
      setError("El importe del pago debe ser mayor a cero.");
      setSaving(false);
      return;
    }

    try {
      const payment = await request<Payment>(
        `/api/expenses/${encodeURIComponent(expense.id)}/payments`,
        {
          method: "POST",
          body: JSON.stringify({ amount, date: paymentForm.date, note: paymentForm.note.trim() }),
        },
      );
      setExpenses((current) => current.map((item) => item.id === expense.id
        ? { ...item, payments: [...item.payments, payment] }
        : item));
      setPaymentExpenseId(null);
      setPaymentForm({ amount: "", date: today(), note: "" });
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function deletePayment(expense: Expense, payment: Payment) {
    if (!window.confirm(`¿Eliminar el pago de ${currency.format(payment.amount)}?`)) return;
    setError("");
    try {
      await request<void>(
        `/api/expenses/${encodeURIComponent(expense.id)}/payments/${encodeURIComponent(payment.id)}`,
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
      await request<void>(`/api/expenses/${encodeURIComponent(expense.id)}`, { method: "DELETE" });
      setExpenses((current) => current.filter((item) => item.id !== expense.id));
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  return (
    <section className="expenses-page">
      <div className="expenses-heading">
        <div>
          <div className="eyebrow"><span /> PRESUPUESTO DE LA BODA</div>
          <h2>Gastos <em>con todo bajo control.</em></h2>
          <p>Registra cada concepto y lleva un seguimiento de los pagos y saldos.</p>
        </div>
        <button className="button button-dark" onClick={openNewExpense}><span>＋</span> Agregar concepto</button>
      </div>

      <div className="expense-summary" aria-label="Resumen de gastos">
        <div><span>COSTO TOTAL</span><strong>{currency.format(totalCost)}</strong><small>{expenses.length} conceptos</small></div>
        <div><span>PAGADO</span><strong>{currency.format(totalPaid)}</strong><small>Pagos registrados</small></div>
        <div><span>PENDIENTE</span><strong>{currency.format(totalPending)}</strong><small>Por pagar</small></div>
      </div>

      {guestCountError && (
        <div className="error-banner" role="alert">
          No se pudo cargar la lista de invitados. Los cálculos por persona no estarán disponibles hasta reiniciar el servidor: {guestCountError}
        </div>
      )}
      {error && <div className="error-banner" role="alert">{error}</div>}

      {loading ? (
        <div className="empty-state"><span className="loader" /> Cargando tus gastos...</div>
      ) : expenses.length === 0 ? (
        <div className="expense-empty">
          <span className="empty-ornament" aria-hidden="true">✳</span>
          <h3>Aún no hay conceptos de gastos</h3>
          <p>Agrega un concepto para comenzar a organizar el presupuesto de tu boda.</p>
          <button className="button button-outline" onClick={openNewExpense}>Agregar primer concepto</button>
        </div>
      ) : (
        <>
        <div className="expense-search-row">
          <label className="expense-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar concepto, encargado o pago"
              aria-label="Buscar gastos"
            />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="Limpiar búsqueda">×</button>}
          </label>
          <label className="expense-filter">
            <span>Mostrar</span>
            <select
              value={unassignedOnly ? "unassigned" : "all"}
              onChange={(event) => setUnassignedOnly(event.target.value === "unassigned")}
              aria-label="Filtrar gastos por monto asignado"
            >
              <option value="all">Todos los gastos</option>
              <option value="unassigned">Sin monto asignado</option>
            </select>
          </label>
          <span className="expense-result-count">
            {filteredExpenses.length} de {expenses.length} conceptos
          </span>
        </div>
        {filteredExpenses.length === 0 ? (
          <div className="expense-empty expense-no-results">
            <span className="empty-ornament" aria-hidden="true">⌕</span>
            <h3>No encontramos gastos</h3>
            <p>{unassignedOnly && !query
              ? "Todos tus conceptos ya tienen un monto total asignado."
              : "Prueba con otra búsqueda o cambia el filtro de monto."}</p>
            <button
              className="button button-outline"
              onClick={() => { setQuery(""); setUnassignedOnly(false); }}
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
        <div className="expense-list">
          {filteredExpenses.map((expense) => {
            const total = totalFor(expense, guestCount);
            const paid = paidFor(expense);
            const pending = Math.max(total - paid, 0);
            const overpaid = Math.max(paid - total, 0);
            const expanded = expandedExpenses.has(expense.id);
            const detailsId = `expense-details-${expense.id}`;
            return (
              <article className="expense-card" key={expense.id}>
                <div className="expense-card-heading">
                  <button
                    type="button"
                    className="expense-toggle"
                    aria-expanded={expanded}
                    aria-controls={detailsId}
                    onClick={() => setExpandedExpenses((current) => {
                      const next = new Set(current);
                      if (next.has(expense.id)) next.delete(expense.id);
                      else next.add(expense.id);
                      return next;
                    })}
                  >
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
                      <span><small>TOTAL</small><strong>{currency.format(total)}</strong></span>
                      <span><small>PENDIENTE</small><strong>{currency.format(pending)}</strong></span>
                      <span><small>PAGOS</small><strong>{expense.payments.length}</strong></span>
                    </span>
                  </button>
                  <div className="expense-actions">
                    <button onClick={() => openEditExpense(expense)}>Editar</button>
                    <button onClick={() => void deleteExpense(expense)}>Eliminar</button>
                  </div>
                </div>
                <div id={detailsId} className="expense-details" hidden={!expanded}>
                  {expense.pricePerPerson !== null && (
                    <div className="per-person-note">
                      {currency.format(expense.pricePerPerson)} por persona × {guestCount} invitados registrados
                    </div>
                  )}
                  <div className="expense-totals">
                    <div><span>TOTAL DEL CONCEPTO</span><strong>{currency.format(total)}</strong></div>
                    <div><span>ACUMULADO PAGADO</span><strong>{currency.format(paid)}</strong></div>
                    <div><span>PENDIENTE</span><strong>{currency.format(pending)}</strong></div>
                    {overpaid > 0 && <div className="overpaid-note"><span>PAGADO DE MÁS</span><strong>{currency.format(overpaid)}</strong></div>}
                  </div>
                  <div className="payments-section">
                    <div className="payments-heading">
                      <h4>Pagos <span>{expense.payments.length}</span></h4>
                      <button
                        className="button button-outline"
                        onClick={() => {
                          setPaymentExpenseId(paymentExpenseId === expense.id ? null : expense.id);
                          setPaymentForm({ amount: "", date: today(), note: "" });
                          setError("");
                        }}
                      >
                        {paymentExpenseId === expense.id ? "Cancelar" : "＋ Registrar pago"}
                      </button>
                    </div>
                    {expense.payments.length > 0 ? (
                      <ul className="payment-list">
                        {expense.payments.map((payment) => (
                          <li key={payment.id}>
                            <span className="payment-date">{new Date(`${payment.date}T12:00:00`).toLocaleDateString("es-MX")}</span>
                            <span className="payment-note">{payment.note || "Pago"}</span>
                            <strong>{currency.format(payment.amount)}</strong>
                            <button onClick={() => void deletePayment(expense, payment)} aria-label={`Eliminar pago de ${currency.format(payment.amount)}`}>Eliminar</button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="no-payments">Aún no se han registrado pagos para este concepto.</p>
                    )}
                    {paymentExpenseId === expense.id && (
                      <form className="payment-form" onSubmit={(event) => void addPayment(event, expense)}>
                        <label>Importe<input autoFocus type="number" min="0.01" step="0.01" required value={paymentForm.amount} onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })} placeholder="0.00" /></label>
                        <label>Fecha<input type="date" required value={paymentForm.date} onChange={(event) => setPaymentForm({ ...paymentForm, date: event.target.value })} /></label>
                        <label className="payment-note-input">Nota (opcional)<input value={paymentForm.note} onChange={(event) => setPaymentForm({ ...paymentForm, note: event.target.value })} placeholder="Anticipo, liquidación..." /></label>
                        <button className="button button-dark" disabled={saving}>{saving ? "Guardando..." : "Guardar pago"}</button>
                      </form>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        )}
        </>
      )}

      {formOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false); }}>
          <section className="guest-modal expense-modal" role="dialog" aria-modal="true" aria-labelledby="expense-form-title">
            <div className="modal-heading">
              <div><div className="eyebrow">PRESUPUESTO DE LA BODA</div><h2 id="expense-form-title">{editingExpense ? "Editar concepto" : "Nuevo concepto"}</h2></div>
              <button className="close-button" onClick={() => setFormOpen(false)} aria-label="Cerrar">×</button>
            </div>
            <form onSubmit={(event) => void saveExpense(event)}>
              <div className="form-grid">
                <label className="full-width">Concepto<input autoFocus required value={expenseForm.concept} onChange={(event) => setExpenseForm({ ...expenseForm, concept: event.target.value })} placeholder="Por ejemplo, banquete o flores" /></label>
                <label>Encargado<input value={expenseForm.responsible} onChange={(event) => setExpenseForm({ ...expenseForm, responsible: event.target.value })} placeholder="Nombre o proveedor" /></label>
                <label>Teléfono de contacto<input type="tel" value={expenseForm.phone} onChange={(event) => setExpenseForm({ ...expenseForm, phone: event.target.value })} placeholder="Teléfono" /></label>
                <label className="full-width">Precio por persona (opcional)<input type="number" min="0" step="0.01" value={expenseForm.pricePerPerson} onChange={(event) => setExpenseForm({ ...expenseForm, pricePerPerson: event.target.value })} placeholder="Déjalo vacío si no aplica" /></label>
                <label className="full-width">Total del concepto
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required={expenseForm.pricePerPerson.trim() === ""}
                    readOnly={expenseForm.pricePerPerson.trim() !== ""}
                    value={expenseForm.pricePerPerson.trim() === ""
                      ? expenseForm.fixedAmount
                      : (Number(expenseForm.pricePerPerson || 0) * guestCount).toFixed(2)}
                    onChange={(event) => setExpenseForm({ ...expenseForm, fixedAmount: event.target.value })}
                    aria-describedby="expense-total-help"
                  />
                  <small id="expense-total-help" className="field-help">
                    {expenseForm.pricePerPerson.trim() === ""
                      ? "Ingresa el total acordado para este concepto."
                      : guestCountLoading
                        ? "Cargando la lista de invitados para calcular el total..."
                        : `Cálculo automático: precio por persona × ${guestCount} invitados registrados.`}
                  </small>
                </label>
              </div>
              <div className="form-actions">
                <button type="button" className="button button-text" onClick={() => setFormOpen(false)}>Cancelar</button>
                <button
                  type="submit"
                  className="button button-dark"
                  disabled={saving || (expenseForm.pricePerPerson.trim() !== "" && (guestCountLoading || Boolean(guestCountError)))}
                >
                  {saving ? "Guardando..." : editingExpense ? "Guardar cambios" : "Agregar concepto"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}

export default ExpensesSection;
