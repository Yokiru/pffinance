import React, { useState, useMemo, useEffect } from 'react';
import { Customer, Transaction, TransactionType } from './types';
import Dashboard from './components/Dashboard';
import Customers from './components/Customers';
import BottomNav from './components/BottomNav';
import Modal from './components/Modal';
import CustomerForm from './components/CustomerForm';
import TransactionNumpadModal from './components/TransactionNumpadModal';
import Savings from './components/Savings';
import SaverForm from './components/SaverForm';
import { supabase } from './supabaseClient';

export type Page = 'dashboard' | 'customers' | 'savings';
type TransactionMode = 'repayment' | 'savings' | 'withdrawal';

export interface DateRange {
  start: Date;
  end: Date;
}

// Helper mappings for Supabase (snake_case) <-> App (camelCase)
const mapCustomerFromDB = (c: any): Customer => ({
  id: c.id,
  name: c.name,
  phone: c.phone,
  location: c.location,
  loanDate: c.loan_date,
  loanAmount: c.loan_amount,
  interestRate: c.interest_rate,
  installments: c.installments,
  status: c.status,
});

const mapCustomerToDB = (c: Customer) => ({
  id: c.id,
  name: c.name,
  phone: c.phone,
  location: c.location,
  loan_date: c.loanDate,
  loan_amount: c.loanAmount,
  interest_rate: c.interestRate,
  installments: c.installments,
  status: c.status,
});

const mapTransactionFromDB = (t: any): Transaction => ({
  id: t.id,
  customerId: t.customer_id,
  type: t.type,
  amount: t.amount,
  date: t.date,
  description: t.description,
  paymentMethod: t.payment_method,
  isEdited: t.is_edited,
});

const mapTransactionToDB = (t: Transaction) => ({
  id: t.id,
  customer_id: t.customerId,
  type: t.type,
  amount: t.amount,
  date: t.date,
  description: t.description,
  payment_method: t.paymentMethod,
  is_edited: t.isEdited || false,
});

const App: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({ start: new Date(), end: new Date() });
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isSaverModalOpen, setIsSaverModalOpen] = useState(false);
  const [transactionTarget, setTransactionTarget] = useState<Customer | null>(null);
  const [transactionMode, setTransactionMode] = useState<TransactionMode>('repayment');

  // Fetch data from Supabase on mount
  useEffect(() => {
    const fetchData = async () => {
      const { data: customersData, error: custError } = await supabase.from('customers').select('*');
      const { data: transactionsData, error: transError } = await supabase.from('transactions').select('*');

      if (custError) console.error("Error loading customers:", custError);
      if (transError) console.error("Error loading transactions:", transError);

      if (customersData) {
        setCustomers(customersData.map(mapCustomerFromDB));
      }
      if (transactionsData) {
        setTransactions(transactionsData.map(mapTransactionFromDB));
      }
    };

    fetchData();
  }, []);

  const filteredTransactions = useMemo(() => {
    const startDate = new Date(dateRange.start);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(dateRange.end);
    endDate.setHours(23, 59, 59, 999);
    
    return transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate >= startDate && transactionDate <= endDate;
    });
  }, [transactions, dateRange]);

  const customerMap = useMemo(() => {
    return new Map(customers.map(c => [c.id, c]));
  }, [customers]);
  
  const addCustomer = async (customerData: Omit<Customer, 'id' | 'status'>) => {
    const newCustomer: Customer = {
      ...customerData,
      id: `CUST-${new Date().getTime()}`,
      status: 'aktif',
    };

    const { error } = await supabase.from('customers').insert([mapCustomerToDB(newCustomer)]);
    
    if (!error) {
      setCustomers(prev => [...prev, newCustomer]);
      setIsCustomerModalOpen(false);
    } else {
      console.error("Error adding customer:", error);
      alert("Gagal menambahkan nasabah.");
    }
  };

  const addSaver = async (data: { name: string; amount: number; date: string }) => {
    const { name, amount, date } = data;

    const newSaverAsCustomer: Customer = {
      id: `CUST-${new Date().getTime()}`,
      name,
      phone: '',
      location: 'Luar',
      loanDate: date,
      loanAmount: 0,
      interestRate: 0,
      installments: 0,
      status: 'aktif',
    };

    const initialSavingTransaction: Omit<Transaction, 'id'> = {
      customerId: newSaverAsCustomer.id,
      type: TransactionType.SAVINGS,
      amount,
      date: new Date(date + 'T00:00:00').toISOString(),
      description: 'Tabungan awal',
      paymentMethod: 'Cash',
    };

    const newTransaction: Transaction = {
        ...initialSavingTransaction,
        id: `TRX-${new Date().getTime()}`
    };

    // Insert both
    const { error: cError } = await supabase.from('customers').insert([mapCustomerToDB(newSaverAsCustomer)]);
    if (cError) {
        console.error("Error adding saver:", cError);
        alert("Gagal menambahkan penabung.");
        return;
    }

    const { error: tError } = await supabase.from('transactions').insert([mapTransactionToDB(newTransaction)]);
    if (tError) {
        console.error("Error adding initial transaction:", tError);
        // Optionally cleanup customer? For now just alert.
    }

    setCustomers(prev => [...prev, newSaverAsCustomer]);
    setTransactions(prev => [...prev, newTransaction]);
    setIsSaverModalOpen(false);
  };

  const updateCustomer = async (updatedCustomer: Customer) => {
    const { error } = await supabase
      .from('customers')
      .update(mapCustomerToDB(updatedCustomer))
      .eq('id', updatedCustomer.id);

    if (!error) {
      setCustomers(prevCustomers => 
        prevCustomers.map(c => 
          c.id === updatedCustomer.id ? updatedCustomer : c
        )
      );
    } else {
      console.error("Error updating customer:", error);
    }
  };

  const deleteCustomer = async (customerId: string) => {
    // Deleting customer usually deletes transactions via CASCADE in DB, but we update local state too
    const { error } = await supabase.from('customers').delete().eq('id', customerId);
    
    if (!error) {
      setCustomers(prev => prev.filter(c => c.id !== customerId));
      setTransactions(prev => prev.filter(t => t.customerId !== customerId));
      if (transactionTarget?.id === customerId) {
          setTransactionTarget(null);
      }
    } else {
      console.error("Error deleting customer:", error);
    }
  };
  
  const recalculateCustomerStatus = async (customerId: string, allTransactions: Transaction[]) => {
      const customer = customers.find(c => c.id === customerId);
      if (customer && customer.loanAmount > 0) {
        const totalRepayments = allTransactions
          .filter(t => t.customerId === customer.id && t.type === TransactionType.REPAYMENT)
          .reduce((sum, t) => sum + t.amount, 0);
        
        const totalLoanWithInterest = customer.loanAmount * (1 + customer.interestRate / 100);
        const isPaidOff = totalRepayments >= totalLoanWithInterest;
        const newStatus: Customer['status'] = isPaidOff ? 'lunas' : 'aktif';

        if (customer.status !== newStatus) {
           const updatedCustomer: Customer = { ...customer, status: newStatus };
           
           // Update DB
           const { error } = await supabase
             .from('customers')
             .update({ status: newStatus })
             .eq('id', customer.id);
             
           if (!error) {
             setCustomers(prevCustomers => 
                prevCustomers.map(c => 
                  c.id === customer.id ? updatedCustomer : c
                )
              );
           }
        }
      }
  };

  const addTransaction = async (transactionData: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...transactionData,
      id: `TRX-${new Date().getTime()}`,
    };

    const { error } = await supabase.from('transactions').insert([mapTransactionToDB(newTransaction)]);

    if (!error) {
      setTransactions(prev => [...prev, newTransaction]);
    } else {
      console.error("Error adding transaction:", error);
    }
  };
  
  const handleCreateTransactionFromNumpad = async (transactionData: Omit<Transaction, 'id' | 'date'>) => {
    const newTransaction: Transaction = {
      ...transactionData,
      id: `TRX-${new Date().getTime()}`,
      date: new Date().toISOString(),
    };
    
    const { error } = await supabase.from('transactions').insert([mapTransactionToDB(newTransaction)]);
    
    if (!error) {
      const updatedTransactions = [...transactions, newTransaction];
      setTransactions(updatedTransactions);
      setTransactionTarget(null);
      if (transactionData.type === TransactionType.REPAYMENT) {
          recalculateCustomerStatus(transactionData.customerId, updatedTransactions);
      }
    } else {
      console.error("Error adding transaction from numpad:", error);
    }
  };

  const updateTransaction = async (updatedTransaction: Transaction) => {
    const transactionToSave = { ...updatedTransaction, isEdited: true };
    const { error } = await supabase
      .from('transactions')
      .update(mapTransactionToDB(transactionToSave))
      .eq('id', transactionToSave.id);

    if (!error) {
      const updatedTransactions = transactions.map(t =>
        t.id === updatedTransaction.id ? transactionToSave : t
      );
      setTransactions(updatedTransactions);
      recalculateCustomerStatus(updatedTransaction.customerId, updatedTransactions);
    } else {
      console.error("Error updating transaction:", error);
    }
  };

  const deleteTransaction = async (transactionId: string) => {
    const transactionToDelete = transactions.find(t => t.id === transactionId);
    if (transactionToDelete) {
      const { error } = await supabase.from('transactions').delete().eq('id', transactionId);
      
      if (!error) {
        const updatedTransactions = transactions.filter(t => t.id !== transactionId);
        setTransactions(updatedTransactions);
        recalculateCustomerStatus(transactionToDelete.customerId, updatedTransactions);
      } else {
        console.error("Error deleting transaction:", error);
      }
    }
  };

  const handleFabClick = () => {
    if (activePage === 'customers') {
      setIsCustomerModalOpen(true);
    } else if (activePage === 'savings') {
      setIsSaverModalOpen(true);
    }
  };

  const handleWithdrawClick = (customer: Customer) => {
    setTransactionTarget(null);
    setTimeout(() => {
        setTransactionMode('withdrawal');
        setTransactionTarget(customer);
    }, 50);
  };

  return (
    <div className="font-sans min-h-screen text-gray-900 pb-28">
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        {activePage === 'dashboard' && (
          <Dashboard 
            customers={customers} 
            dailyTransactions={filteredTransactions}
            allTransactions={transactions}
            customerMap={customerMap}
            dateRange={dateRange}
            setDateRange={setDateRange}
            addTransaction={addTransaction}
          />
        )}
        {activePage === 'customers' && (
          <Customers
            customers={customers}
            transactions={transactions}
            onCustomerSelect={(customer) => {
                setTransactionMode('repayment');
                setTransactionTarget(customer);
            }}
          />
        )}
        {activePage === 'savings' && (
          <Savings
            transactions={transactions}
            customerMap={customerMap}
            onSaverSelect={(customer) => {
                setTransactionMode('savings');
                setTransactionTarget(customer);
            }}
          />
        )}
      </main>
      <BottomNav 
        activePage={activePage} 
        setActivePage={setActivePage} 
        onAddClick={handleFabClick}
        isVisible={!transactionTarget}
      />
      <Modal isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)}>
          <CustomerForm onSubmit={addCustomer} onCancel={() => setIsCustomerModalOpen(false)} />
      </Modal>
      <Modal isOpen={isSaverModalOpen} onClose={() => setIsSaverModalOpen(false)} title="Tambah Penabung">
          <SaverForm 
            onSubmit={addSaver} 
            onCancel={() => setIsSaverModalOpen(false)}
          />
      </Modal>
      {transactionTarget && (
        <TransactionNumpadModal
            customer={transactionTarget}
            transactions={transactions}
            onClose={() => setTransactionTarget(null)}
            onSubmit={handleCreateTransactionFromNumpad}
            onUpdateCustomer={updateCustomer}
            onUpdateTransaction={updateTransaction}
            onDeleteTransaction={deleteTransaction}
            onDeleteCustomer={deleteCustomer}
            onWithdrawClick={handleWithdrawClick}
            mode={transactionMode}
        />
      )}
    </div>
  );
};

export default App;