export type Payment = {
  id: string;
  amount: number;
  date: string;
  note: string;
};

export type Expense = {
  id: string;
  concept: string;
  responsible: string;
  phone: string;
  pricePerPerson: number | null;
  fixedAmount: number;
  payments: Payment[];
};

export type ExpenseFormValues = {
  concept: string;
  responsible: string;
  phone: string;
  pricePerPerson: string;
  fixedAmount: string;
};

export type PaymentFormValues = {
  amount: string;
  date: string;
  note: string;
};
