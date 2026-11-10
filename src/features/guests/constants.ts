import type { GuestFilter, GuestFormValues, Gender, WeddingRole } from "./types";

export const GUESTS_API_PATH = "/api/guests";

export const EMPTY_GUEST_FORM: GuestFormValues = {
  name: "",
  invitedBy: "",
  hasPlusOne: false,
  plusOneName: "",
  confirmed: false,
  symbolicInvitation: false,
  isChild: false,
  gender: "undisclosed",
  weddingRole: "none",
};

export const GENDER_OPTIONS: Array<{ value: Gender; label: string }> = [
  { value: "female", label: "Mujer" },
  { value: "male", label: "Hombre" },
  { value: "other", label: "Otro" },
  { value: "undisclosed", label: "Prefiero no decir" },
];

export const GENDER_LABELS: Record<Gender, string> = {
  female: "Mujer",
  male: "Hombre",
  other: "Otro",
  undisclosed: "Prefiero no decir",
};

export const WEDDING_ROLE_OPTIONS: Array<{ value: WeddingRole; label: string }> = [
  { value: "none", label: "Sin rol especial" },
  { value: "bestMan", label: "Best man" },
  { value: "bridesmaid", label: "Bridesmaid" },
];

export const WEDDING_ROLE_LABELS: Record<WeddingRole, string> = {
  none: "—",
  bestMan: "Best man",
  bridesmaid: "Bridesmaid",
};

export const GUEST_FILTER_OPTIONS: Array<{ value: GuestFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "confirmed", label: "Confirmados" },
  { value: "pending", label: "Pendientes" },
  { value: "symbolic", label: "Invitaciones simbólicas" },
  { value: "bestMan", label: "Best man" },
  { value: "bridesmaid", label: "Bridesmaid" },
];
