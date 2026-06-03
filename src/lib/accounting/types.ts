export type TransactionType = 'INCOME' | 'EXPENSE';

export interface RawTransaction {
  date: string; // YYYY-MM-DD
  content: string | null;
  amount: number;
  type: TransactionType;
  merchant: string | null;
  orderNo: string | null;
  paymentMethod: string | null;
  businessNum: string | null;
  note: string | null;
}

export interface ParseResult {
  transactions: RawTransaction[];
  errors?: string[];
}

export interface BankParser {
  name: string;
  canParse: (headers: string[]) => boolean;
  parse: (data: any[][]) => ParseResult;
}
