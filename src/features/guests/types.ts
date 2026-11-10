export type Gender = "female" | "male" | "other" | "undisclosed";
export type WeddingRole = "none" | "bestMan" | "bridesmaid";
export type GuestFilter = "all" | "confirmed" | "pending" | "symbolic" | "bestMan" | "bridesmaid";

export type Guest = {
  id: string;
  name: string;
  invitedBy: string;
  hasPlusOne: boolean;
  plusOneName: string;
  confirmed: boolean;
  symbolicInvitation: boolean;
  isChild: boolean;
  gender: Gender;
  weddingRole: WeddingRole;
};

export type GuestFormValues = Omit<Guest, "id">;
