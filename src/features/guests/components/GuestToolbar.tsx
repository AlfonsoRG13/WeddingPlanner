import { GUEST_FILTER_OPTIONS } from "../constants";
import type { GuestFilter } from "../types";

type GuestToolbarProps = {
  query: string;
  filter: GuestFilter;
  onQueryChange: (query: string) => void;
  onFilterChange: (filter: GuestFilter) => void;
};

function GuestToolbar({ query, filter, onQueryChange, onFilterChange }: GuestToolbarProps) {
  return (
    <div className="tools">
      <label className="search-box">
        <span aria-hidden="true">⌕</span>
        <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Buscar invitado" aria-label="Buscar invitado" />
      </label>
      <label className="filter-label">
        <span className="visually-hidden">Filtrar confirmación o rol</span>
        <select value={filter} onChange={(event) => onFilterChange(event.target.value as GuestFilter)}>
          {GUEST_FILTER_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
        </select>
      </label>
    </div>
  );
}

export default GuestToolbar;
