import { api } from "./client";

export interface Account {
  _id: string;
  account_name: string;
  account_type: string;
  account_balance?: number | null;
  initial_balance?: number | null;
}

export function createAccount(body: {
  account_name: string;
  account_type: string;
  initial_balance?: number | null;
  custom_fields?: Record<string, string> | null;
}): Promise<Account> {
  return api<Account>("/accounts", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
