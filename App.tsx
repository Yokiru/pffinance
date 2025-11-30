

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
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error saving to localStorage key "${key}":`, error);
    }
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
    // Avoid duplicates for the same record and action
    const filteredQueue = queue.filter(q => !(q.id === newItem.id && q.action === newItem.action));
    filteredQueue.push(newItem);
    saveToLocal(STORAGE_KEYS.SYNC_QUEUE, filteredQueue);
    console.log('Item added to sync queue:', newItem);
  };

  // Helper to merge server data with local offline queue
  const applySyncQueueToData = (serverData: any[], queue: SyncQueueItem[], table: 'customers' | 'transactions') => {
    let merged = [...serverData];
    const tableQueue = queue.filter(q => q.table === table);

    // Sort queue by queueId or implicitly by order to replay actions correctly
    // Assuming the queue is append-only, the order is already correct.

    tableQueue.forEach(item => {
      if (item.action === 'INSERT') {
         // Deduplicate: if ID already exists, remove it first (shouldn't happen on insert but good for safety)
         merged = merged.filter(d => d.id !== item.payload.id);
         merged.push(item.payload);
      } else if (item.action === 'UPDATE') {
         const index = merged.findIndex(d => d.id === item.payload.id);
         if (index >= 0) {
            merged[index] = { ...merged[index], ...item.payload };
         } else {
            // If updating an item that isn't in server data (e.g. created offline), append it
            merged.push(item.payload);
         }
      } else if (item.action === 'DELETE') {
         merged = merged.filter(d => d.id !== item.id);
      }
    });

    return merged;
  };

  const fetchData = async () => {
    // Load Holidays from Local (No Supabase table for holidays yet in this version)
    const localHolidays = loadFromLocal<string[]>(STORAGE_KEYS.HOLIDAYS);
    if (localHolidays) setCustomHolidays(localHolidays);

    // Always load the queue first to apply optimistic updates
    const syncQueue = loadFromLocal<SyncQueueItem[]>(STORAGE_KEYS.SYNC_QUEUE) || [];

    if (navigator.onLine) {
      try {
        console.log("Online: Fetching latest data from Supabase...");
        
        // Fetch raw DB data (snake_case)
        const { data: customersDB, error: cError } = await supabase.from('customers').select('*');
        if (cError) throw cError;

        const { data: transactionsDB, error: tError } = await supabase.from('transactions').select('*');
        if (tError) throw tError;

        // Apply local queue changes to the DB data BEFORE mapping to App state
        // This ensures pending offline changes are visible immediately
        const mergedCustomersDB = applySyncQueueToData(customersDB || [], syncQueue, 'customers');
        const mergedTransactionsDB = applySyncQueueToData(transactionsDB || [], syncQueue, 'transactions');

        // Map to App format
        const mappedCustomers = mergedCustomersDB.map(mapCustomerFromDB);
        const mappedTransactions = mergedTransactionsDB.map(mapTransactionFromDB);

        setCustomers(mappedCustomers);
        setTransactions(mappedTransactions);
        
        // Save the merged "Source of Truth" to local storage
        saveToLocal(STORAGE_KEYS.CUSTOMERS, mappedCustomers);
        saveToLocal(STORAGE_KEYS.TRANSACTIONS, mappedTransactions);
        
        console.log("Successfully fetched, merged, and updated local data.");
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
      
      // We still need to apply the queue to local storage data in case 
      // the local storage 'CUSTOMERS' key was stale but 'SYNC_QUEUE' had new items
      const syncQueue = loadFromLocal<SyncQueueItem[]>(STORAGE_KEYS.SYNC_QUEUE) || [];
      
      if (localCustomers) {
          // Note: mapCustomerToDB reverse mapping is needed if we want to reuse applySyncQueueToData
          // But simpler is to assume local storage is "App State" (camelCase) and Queue is "DB State" (snake_case).
          // To avoid complexity, let's just trust local storage + logic in add/update functions handled state updates.
          // However, to be robust:
          setCustomers(localCustomers);
      }
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
            const { error: err } = await supabase.from('customers').upsert([item.payload]);
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
            const { error: err } = await supabase.from('transactions').upsert([item.payload]);
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
        // Reload queue from storage to handle any new items added while syncing
        const currentQueue = loadFromLocal<SyncQueueItem[]>(STORAGE_KEYS.SYNC_QUEUE) || [];
        const remainingQueue = currentQueue.filter(item => !successfullySyncedQueueIds.has(item.queueId));
        saveToLocal(STORAGE_KEYS.SYNC_QUEUE, remainingQueue);
        console.log(`${successfullySyncedQueueIds.size} items synced.`);
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
      // Re-fetch data when coming back online to ensure consistency, 
      // but the optimistic merge logic will keep local changes safe.
      fetchData(); 
    };
    const handleOffline = () => {
      console.log("App is offline.");
      setIsOnline(false)
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const syncInterval = setInterval(processSyncQueue, 30000); 
    setTimeout(processSyncQueue, 1000); 

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(syncInterval);
    };
  }, []);
  
  useEffect(() => {
      // Save holidays to local storage when they change.
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
  
  const addCustomer = (customerData: CustomerFormData) => {
    const { disbursementMethod, ...data } = customerData;
    const newCustomer: Customer = {
      ...data,
      id: `CUST-${Date.now()}`,
      status: 'aktif',
      role: 'borrower', 
    };
    const todayStr = new Date().toISOString().split('T')[0];
    let transactionDateIso = newCustomer.loanDate === todayStr 
        ? new Date().toISOString() 
        : new Date(newCustomer.loanDate + 'T09:00:00').toISOString();
    const newTransaction: Transaction = {
        id: `TRX-${Date.now()}`,
        customerId: newCustomer.id,
        type: TransactionType.LOAN,
        amount: newCustomer.loanAmount,
        date: transactionDateIso,
        description: 'Pinjaman Awal',
        paymentMethod: disbursementMethod || 'Cash',
        isEdited: false
    };

    const nextCustomers = [...customers, newCustomer];
    const nextTransactions = [...transactions, newTransaction];

    saveToLocal(STORAGE_KEYS.CUSTOMERS, nextCustomers);
    saveToLocal(STORAGE_KEYS.TRANSACTIONS, nextTransactions);
    setCustomers(nextCustomers);
    setTransactions(nextTransactions);
    
    addToSyncQueue({ id: newCustomer.id, action: 'INSERT', table: 'customers', payload: mapCustomerToDB(newCustomer) });
    addToSyncQueue({ id: newTransaction.id, action: 'INSERT', table: 'transactions', payload: mapTransactionToDB(newTransaction) });
    
    setIsCustomerModalOpen(false);
    setTimeout(processSyncQueue, 100);
  };

  const addSaver = (data: { name: string; amount: number; date: string }) => {
    const { name, amount, date } = data;
    const newSaverAsCustomer: Customer = {
      id: `CUST-${Date.now()}`,
      name, phone: '', location: 'Luar', loanDate: date,
      loanAmount: 0, interestRate: 0, installments: 0,
      status: 'aktif', role: 'saver',
    };
    const newTransaction: Transaction = {
      id: `TRX-${Date.now()}`,
      customerId: newSaverAsCustomer.id,
      type: TransactionType.SAVINGS, amount,
      date: new Date(date + 'T09:00:00').toISOString(),
      description: 'Tabungan awal', paymentMethod: 'Cash',
    };

    const nextCustomers = [...customers, newSaverAsCustomer];
    const nextTransactions = [...transactions, newTransaction];
    
    saveToLocal(STORAGE_KEYS.CUSTOMERS, nextCustomers);
    saveToLocal(STORAGE_KEYS.TRANSACTIONS, nextTransactions);
    setCustomers(nextCustomers);
    setTransactions(nextTransactions);

    addToSyncQueue({ id: newSaverAsCustomer.id, action: 'INSERT', table: 'customers', payload: mapCustomerToDB(newSaverAsCustomer) });
    addToSyncQueue({ id: newTransaction.id, action: 'INSERT', table: 'transactions', payload: mapTransactionToDB(newTransaction) });
    
    setIsSaverModalOpen(false);
    setTimeout(processSyncQueue, 100);
  };

  const updateCustomer = (updatedCustomer: Customer) => {
    const nextCustomers = customers.map(c => c.id === updatedCustomer.id ? updatedCustomer : c);
    saveToLocal(STORAGE_KEYS.CUSTOMERS, nextCustomers);
    setCustomers(nextCustomers);

    addToSyncQueue({ id: updatedCustomer.id, action: 'UPDATE', table: 'customers', payload: mapCustomerToDB(updatedCustomer) });
    setTimeout(processSyncQueue, 100);
  };

  const deleteCustomer = (customerId: string) => {
    const nextCustomers = customers.filter(c => c.id !== customerId);
    const nextTransactions = transactions.filter(t => t.customerId !== customerId);
    
    saveToLocal(STORAGE_KEYS.CUSTOMERS, nextCustomers);
    saveToLocal(STORAGE_KEYS.TRANSACTIONS, nextTransactions);
    setCustomers(nextCustomers);
    setTransactions(nextTransactions);

    if (transactionTarget?.id === customerId) {
          setTransactionTarget(null);
    }
    addToSyncQueue({ id: customerId, action: 'DELETE', table: 'customers', payload: null });
    setTimeout(processSyncQueue, 100);
  };

  const handleArchiveToggle = (customerId: string) => {
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        const newStatus = customer.status === 'arsip' ? 'aktif' : 'arsip';
        const updatedCustomer: Customer = { ...customer, status: newStatus };
        updateCustomer(updatedCustomer);
      }
  };
  
  const recalculateCustomerStatus = (customerId: string, allTransactions: Transaction[]) => {
      // Find customer from the main state, as this function is a utility
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
           // This will trigger its own save and sync
           updateCustomer(updatedCustomer);
        }
      }
  };
  
  const handleCreateTransactionFromNumpad = (transactionData: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...transactionData,
      id: `TRX-${Date.now()}`,
    };
    
    const nextTransactions = [...transactions, newTransaction];
    saveToLocal(STORAGE_KEYS.TRANSACTIONS, nextTransactions);
    setTransactions(nextTransactions);
    
    addToSyncQueue({ id: newTransaction.id, action: 'INSERT', table: 'transactions', payload: mapTransactionToDB(newTransaction) });
    
    setTransactionTarget(null);
    setTimeout(processSyncQueue, 100);

    if (transactionData.type === TransactionType.REPAYMENT) {
        recalculateCustomerStatus(transactionData.customerId, nextTransactions);
    }
  };

  const updateTransaction = (updatedTransaction: Transaction) => {
    const transactionToSave = { ...updatedTransaction, isEdited: true };
    const nextTransactions = transactions.map(t => t.id === updatedTransaction.id ? transactionToSave : t);

    saveToLocal(STORAGE_KEYS.TRANSACTIONS, nextTransactions);
    setTransactions(nextTransactions);

    addToSyncQueue({ id: transactionToSave.id, action: 'UPDATE', table: 'transactions', payload: mapTransactionToDB(transactionToSave) });
    setTimeout(processSyncQueue, 100);

    recalculateCustomerStatus(updatedTransaction.customerId, nextTransactions);
  };

  const deleteTransaction = (transactionId: string) => {
    const transactionToDelete = transactions.find(t => t.id === transactionId);
    if (transactionToDelete) {
      const nextTransactions = transactions.filter(t => t.id !== transactionId);
      
      saveToLocal(STORAGE_KEYS.TRANSACTIONS, nextTransactions);
      setTransactions(nextTransactions);
      
      addToSyncQueue({ id: transactionId, action: 'DELETE', table: 'transactions', payload: null });
      setTimeout(processSyncQueue, 100);

      recalculateCustomerStatus(transactionToDelete.customerId, nextTransactions);
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
