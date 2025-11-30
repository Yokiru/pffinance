

import React, { useState, useMemo, useEffect } from 'react';
import { Customer, Transaction, TransactionType } from './types';
import Dashboard from './components/Dashboard';
import Customers from './components/Customers';
import BottomNav from './components/BottomNav';
import Modal from './components/Modal';
import CustomerForm, { CustomerFormData } from './components/CustomerForm';
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

// --- OFFLINE SYNC UTILITIES ---
interface SyncQueueItem {
  queueId: string; // Unique ID for the queue item itself to prevent duplication issues
  id: string; // ID of the customer or transaction record
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  table: 'customers' | 'transactions';
  payload: any;
}

const STORAGE_KEYS = {
  CUSTOMERS: 'monetto_customers',
  TRANSACTIONS: 'monetto_transactions',
  SYNC_QUEUE: 'monetto_sync_queue',
  HOLIDAYS: 'monetto_holidays'
};

// --- SUPABASE MAPPERS ---
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
  role: c.role || (c.loan_amount === 0 ? 'saver' : 'borrower'),
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
  role: c.role,
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
  const [customHolidays, setCustomHolidays] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({ start: new Date(), end: new Date() });
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isSaverModalOpen, setIsSaverModalOpen] = useState(false);
  const [transactionTarget, setTransactionTarget] = useState<Customer | null>(null);
  const [transactionMode, setTransactionMode] = useState<TransactionMode>('repayment');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  // --- DATA PERSISTENCE & LOADING ---

  const saveToLocal = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  const loadFromLocal = <T,>(key: string): T | null => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error parsing JSON from localStorage key "${key}":`, error);
      // If parsing fails, remove the corrupted data to prevent future errors
      localStorage.removeItem(key);
      return null;
    }
  };

  const addToSyncQueue = (item: Omit<SyncQueueItem, 'queueId'>) => {
    const queue = loadFromLocal<SyncQueueItem[]>(STORAGE_KEYS.SYNC_QUEUE) || [];
    const newItem: SyncQueueItem = {
      ...item,
      queueId: `Q-${Date.now()}-${Math.random()}`
    };
    queue.push(newItem);
    saveToLocal(STORAGE_KEYS.SYNC_QUEUE, queue);
    console.log('Item added to sync queue:', newItem);
  };

  const fetchData = async () => {
    // Load Holidays from Local (No Supabase table for holidays yet in this version)
    const localHolidays = loadFromLocal<string[]>(STORAGE_KEYS.HOLIDAYS);
    if (localHolidays) setCustomHolidays(localHolidays);

    if (navigator.onLine) {
      try {
        const { data: customersData, error: cError } = await supabase.from('customers').select('*');
        if (cError) throw cError;

        const { data: transactionsData, error: tError } = await supabase.from('transactions').select('*');
        if (tError) throw tError;

        if (customersData) {
          const mappedCustomers = customersData.map(mapCustomerFromDB);
          setCustomers(mappedCustomers);
          saveToLocal(STORAGE_KEYS.CUSTOMERS, mappedCustomers);
        }
        if (transactionsData) {
          const mappedTransactions = transactionsData.map(mapTransactionFromDB);
          setTransactions(mappedTransactions);
          saveToLocal(STORAGE_KEYS.TRANSACTIONS, mappedTransactions);
        }
      } catch (error) {
         console.error("Failed to fetch data from Supabase, loading from local storage.", error);
         loadDataFromLocal();
      }
    } else {
      console.log("Offline, loading data from local storage.");
      loadDataFromLocal();
    }
  };
  
  const loadDataFromLocal = () => {
      const localCustomers = loadFromLocal<Customer[]>(STORAGE_KEYS.CUSTOMERS);
      const localTransactions = loadFromLocal<Transaction[]>(STORAGE_KEYS.TRANSACTIONS);
      if (localCustomers) setCustomers(localCustomers);
      if (localTransactions) setTransactions(localTransactions);
  }

  const processSyncQueue = async () => {
    if (!navigator.onLine || isSyncing) return;
    
    let queue = loadFromLocal<SyncQueueItem[]>(STORAGE_KEYS.SYNC_QUEUE) || [];
    if (queue.length === 0) return;

    setIsSyncing(true);
    console.log(`Processing ${queue.length} offline items...`);

    const successfullySyncedQueueIds = new Set<string>();

    for (const item of queue) {
      let error = null;
      try {
        if (item.table === 'customers') {
          if (item.action === 'INSERT') {
            const { error: err } = await supabase.from('customers').insert([item.payload]);
            error = err;
          } else if (item.action === 'UPDATE') {
            const { error: err } = await supabase.from('customers').update(item.payload).eq('id', item.payload.id);
            error = err;
          } else if (item.action === 'DELETE') {
            const { error: err } = await supabase.from('customers').delete().eq('id', item.id);
            error = err;
          }
        } else if (item.table === 'transactions') {
           if (item.action === 'INSERT') {
            const { error: err } = await supabase.from('transactions').insert([item.payload]);
            error = err;
          } else if (item.action === 'UPDATE') {
            const { error: err } = await supabase.from('transactions').update(item.payload).eq('id', item.payload.id);
            error = err;
          } else if (item.action === 'DELETE') {
            const { error: err } = await supabase.from('transactions').delete().eq('id', item.id);
            error = err;
          }
        }
      } catch (e) {
          error = e;
      }

      if (error) {
        console.error("Sync error for item, it will be retried:", item, error);
      } else {
        console.log("Successfully synced item:", item.id);
        successfullySyncedQueueIds.add(item.queueId);
      }
    }
    
    if (successfullySyncedQueueIds.size > 0) {
        const remainingQueue = queue.filter(item => !successfullySyncedQueueIds.has(item.queueId));
        saveToLocal(STORAGE_KEYS.SYNC_QUEUE, remainingQueue);
        console.log(`${successfullySyncedQueueIds.size} items synced. Refreshing data...`);
        // Refresh data to ensure consistency
        await fetchData();
    } else {
      console.log("Sync failed for all items in this run. They will be retried later.");
    }

    setIsSyncing(false);
  };

  useEffect(() => {
    fetchData();

    const handleOnline = () => {
      console.log("App is online.");
      setIsOnline(true);
      processSyncQueue();
    };
    const handleOffline = () => {
      console.log("App is offline.");
      setIsOnline(false)
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Also try to sync on load, just in case
    setTimeout(processSyncQueue, 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  useEffect(() => {
      // Save to local immediately on change for offline resilience
      saveToLocal(STORAGE_KEYS.CUSTOMERS, customers);
  }, [customers]);

  useEffect(() => {
      // Save to local immediately on change for offline resilience
      saveToLocal(STORAGE_KEYS.TRANSACTIONS, transactions);
  }, [transactions]);

  // Save holidays whenever changed
  useEffect(() => {
      saveToLocal(STORAGE_KEYS.HOLIDAYS, customHolidays);
  }, [customHolidays]);


  // --- APP LOGIC ---

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
  
  const addCustomer = async (customerData: CustomerFormData) => {
    const { disbursementMethod, ...data } = customerData;
    const newCustomer: Customer = {
      ...data,
      id: `CUST-${new Date().getTime()}`,
      status: 'aktif',
      role: 'borrower', 
    };
    const todayStr = new Date().toISOString().split('T')[0];
    let transactionDateIso = newCustomer.loanDate === todayStr 
        ? new Date().toISOString() 
        : new Date(newCustomer.loanDate + 'T09:00:00').toISOString();
    const newTransaction: Transaction = {
        id: `TRX-${new Date().getTime()}`,
        customerId: newCustomer.id,
        type: TransactionType.LOAN,
        amount: newCustomer.loanAmount,
        date: transactionDateIso,
        description: 'Pinjaman Awal',
        paymentMethod: disbursementMethod || 'Cash',
        isEdited: false
    };

    setCustomers(prev => [...prev, newCustomer]);
    setTransactions(prev => [...prev, newTransaction]);
    setIsCustomerModalOpen(false);

    const { error: cError } = await supabase.from('customers').insert([mapCustomerToDB(newCustomer)]);
    if (cError) {
      console.error("Offline: Queuing new customer.", cError);
      addToSyncQueue({ id: newCustomer.id, action: 'INSERT', table: 'customers', payload: mapCustomerToDB(newCustomer) });
    }

    const { error: tError } = await supabase.from('transactions').insert([mapTransactionToDB(newTransaction)]);
    if (tError) {
      console.error("Offline: Queuing initial loan transaction.", tError);
      addToSyncQueue({ id: newTransaction.id, action: 'INSERT', table: 'transactions', payload: mapTransactionToDB(newTransaction) });
    }
  };

  const addSaver = async (data: { name: string; amount: number; date: string }) => {
    const { name, amount, date } = data;
    const newSaverAsCustomer: Customer = {
      id: `CUST-${new Date().getTime()}`,
      name, phone: '', location: 'Luar', loanDate: date,
      loanAmount: 0, interestRate: 0, installments: 0,
      status: 'aktif', role: 'saver',
    };
    const newTransaction: Transaction = {
      id: `TRX-${new Date().getTime()}`,
      customerId: newSaverAsCustomer.id,
      type: TransactionType.SAVINGS, amount,
      date: new Date(date + 'T09:00:00').toISOString(),
      description: 'Tabungan awal', paymentMethod: 'Cash',
    };

    setCustomers(prev => [...prev, newSaverAsCustomer]);
    setTransactions(prev => [...prev, newTransaction]);
    setIsSaverModalOpen(false);

    const { error: cError } = await supabase.from('customers').insert([mapCustomerToDB(newSaverAsCustomer)]);
    if (cError) {
      console.error("Offline: Queuing new saver.", cError);
      addToSyncQueue({ id: newSaverAsCustomer.id, action: 'INSERT', table: 'customers', payload: mapCustomerToDB(newSaverAsCustomer) });
    }
        
    const { error: tError } = await supabase.from('transactions').insert([mapTransactionToDB(newTransaction)]);
    if (tError) {
      console.error("Offline: Queuing initial saving transaction.", tError);
      addToSyncQueue({ id: newTransaction.id, action: 'INSERT', table: 'transactions', payload: mapTransactionToDB(newTransaction) });
    }
  };

  const updateCustomer = async (updatedCustomer: Customer) => {
    setCustomers(prevCustomers => prevCustomers.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));

    const { error } = await supabase
      .from('customers')
      .update(mapCustomerToDB(updatedCustomer))
      .eq('id', updatedCustomer.id);
    if (error) {
      console.error("Offline: Queuing customer update.", error);
      addToSyncQueue({ id: updatedCustomer.id, action: 'UPDATE', table: 'customers', payload: mapCustomerToDB(updatedCustomer) });
    }
  };

  const deleteCustomer = async (customerId: string) => {
    setCustomers(prev => prev.filter(c => c.id !== customerId));
    setTransactions(prev => prev.filter(t => t.customerId !== customerId));
    if (transactionTarget?.id === customerId) {
          setTransactionTarget(null);
    }

    const { error } = await supabase.from('customers').delete().eq('id', customerId);
    if (error) {
      console.error("Offline: Queuing customer deletion.", error);
      addToSyncQueue({ id: customerId, action: 'DELETE', table: 'customers', payload: null });
    }
  };

  const handleArchiveToggle = (customerId: string) => {
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        const newStatus = customer.status === 'arsip' ? 'aktif' : 'arsip';
        const updatedCustomer: Customer = { ...customer, status: newStatus };
        updateCustomer(updatedCustomer);
      }
  };
  
  const recalculateCustomerStatus = async (customerId: string, allTransactions: Transaction[]) => {
      const customer = customers.find(c => c.id === customerId);
      if (customer && customer.loanAmount > 0 && customer.status !== 'arsip') {
        const totalRepayments = allTransactions
          .filter(t => t.customerId === customer.id && t.type === TransactionType.REPAYMENT)
          .reduce((sum, t) => sum + t.amount, 0);
        
        const totalLoanWithInterest = customer.loanAmount * (1 + customer.interestRate / 100);
        const isPaidOff = totalRepayments >= totalLoanWithInterest;
        const newStatus: Customer['status'] = isPaidOff ? 'lunas' : 'aktif';

        if (customer.status !== newStatus) {
           const updatedCustomer: Customer = { ...customer, status: newStatus };
           updateCustomer(updatedCustomer);
        }
      }
  };
  
  const handleCreateTransactionFromNumpad = async (transactionData: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...transactionData,
      id: `TRX-${new Date().getTime()}`,
    };
    
    const updatedTransactions = [...transactions, newTransaction];
    setTransactions(updatedTransactions);
    setTransactionTarget(null);
    
    const { error } = await supabase.from('transactions').insert([mapTransactionToDB(newTransaction)]);
    if (error) {
      console.error("Offline: Queuing numpad transaction.", error);
      addToSyncQueue({ id: newTransaction.id, action: 'INSERT', table: 'transactions', payload: mapTransactionToDB(newTransaction) });
    }

    if (transactionData.type === TransactionType.REPAYMENT) {
        recalculateCustomerStatus(transactionData.customerId, updatedTransactions);
    }
  };

  const updateTransaction = async (updatedTransaction: Transaction) => {
    const transactionToSave = { ...updatedTransaction, isEdited: true };
    
    const updatedTransactions = transactions.map(t => t.id === updatedTransaction.id ? transactionToSave : t);
    setTransactions(updatedTransactions);

    const { error } = await supabase
      .from('transactions')
      .update(mapTransactionToDB(transactionToSave))
      .eq('id', transactionToSave.id);
    if (error) {
      console.error("Offline: Queuing transaction update.", error);
      addToSyncQueue({ id: transactionToSave.id, action: 'UPDATE', table: 'transactions', payload: mapTransactionToDB(transactionToSave) });
    }

    recalculateCustomerStatus(updatedTransaction.customerId, updatedTransactions);
  };

  const deleteTransaction = async (transactionId: string) => {
    const transactionToDelete = transactions.find(t => t.id === transactionId);
    if (transactionToDelete) {
      const updatedTransactions = transactions.filter(t => t.id !== transactionId);
      setTransactions(updatedTransactions);
      
      const { error } = await supabase.from('transactions').delete().eq('id', transactionId);
      if (error) {
        console.error("Offline: Queuing transaction deletion.", error);
        addToSyncQueue({ id: transactionId, action: 'DELETE', table: 'transactions', payload: null });
      }

      recalculateCustomerStatus(transactionToDelete.customerId, updatedTransactions);
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
      {/* Offline Indicator */}
      {!isOnline && (
          <div className="bg-red-600 text-white text-xs font-bold text-center py-1 px-4 fixed top-0 left-0 right-0 z-50">
              OFFLINE MODE - Data disimpan secara lokal
          </div>
      )}
      {isSyncing && isOnline && (
           <div className="bg-blue-600 text-white text-xs font-bold text-center py-1 px-4 fixed top-0 left-0 right-0 z-50">
              SINKRONISASI DATA...
          </div>
      )}

      <main className={`flex-1 p-3 sm:p-6 lg:p-8 ${!isOnline || isSyncing ? 'pt-8' : ''}`}>
        {activePage === 'dashboard' && (
          <Dashboard 
            customers={customers} 
            dailyTransactions={filteredTransactions}
            allTransactions={transactions}
            customerMap={customerMap}
            dateRange={dateRange}
            setDateRange={setDateRange}
            addTransaction={() => {}} // Deprecated, add from modals
            customHolidays={customHolidays}
            setCustomHolidays={setCustomHolidays}
          />
        )}
        {activePage === 'customers' && (
          <Customers
            customers={customers.filter(c => c.role === 'borrower')}
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
            onArchiveToggle={handleArchiveToggle}
            mode={transactionMode}
            customHolidays={customHolidays}
        />
      )}
    </div>
  );
};

export default App;
