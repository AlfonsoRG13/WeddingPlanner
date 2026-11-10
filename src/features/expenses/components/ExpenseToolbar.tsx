import { EXPENSE_FILTER_OPTIONS } from "../constants";

type ExpenseToolbarProps = {
  query: string;
  unassignedOnly: boolean;
  filteredCount: number;
  expenseCount: number;
  onQueryChange: (query: string) => void;
  onUnassignedChange: (unassignedOnly: boolean) => void;
};

function ExpenseToolbar({
  query,
  unassignedOnly,
  filteredCount,
  expenseCount,
  onQueryChange,
  onUnassignedChange,
}: ExpenseToolbarProps) {
  return (
    <div className="expense-search-row">
      <label className="expense-search">
        <span aria-hidden="true">⌕</span>
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar concepto, encargado o pago"
          aria-label="Buscar gastos"
        />
        {query && <button type="button" onClick={() => onQueryChange("")} aria-label="Limpiar búsqueda">×</button>}
      </label>
      <label className="expense-filter">
        <span>Mostrar</span>
        <select
          value={unassignedOnly ? "unassigned" : "all"}
          onChange={(event) => onUnassignedChange(event.target.value === "unassigned")}
          aria-label="Filtrar gastos por monto asignado"
        >
          {EXPENSE_FILTER_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
        </select>
      </label>
      <span className="expense-result-count">{filteredCount} de {expenseCount} conceptos</span>
    </div>
  );
}

export default ExpenseToolbar;
