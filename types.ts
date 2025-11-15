
export enum TransactionType {
  SAVINGS = 'Simpanan',
  LOAN = 'Pinjaman',
  REPAYMENT = 'Pembayaran',
  WITHDRAWAL = 'Penarikan',
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  location: string;
  loanDate: string;
  loanAmount: number;
  interestRate: number;
  installments: number;
  status: 'aktif' | 'lunas';
  role: 'borrower' | 'saver'; // Added role to distinguish types
}

export interface Transaction {
  id: string;
  customerId: string;
  type: TransactionType;
  amount: number;
  date: string;
  description: string;
  paymentMethod: 'Cash' | 'Transfer';
  isEdited?: boolean;
}
