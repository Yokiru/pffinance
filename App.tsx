

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
import ExportImportModal from './components/ExportImportModal';
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
  const [isExportImportOpen, setIsExportImportOpen] = useState(false);

  // --- BROWSER HISTORY MANAGEMENT ---
  // Handle browser back button properly for SPA navigation

  // Custom navigation functions that push to browser history
  const navigateToPage = (page: Page) => {
    if (page !== activePage) {
      window.history.pushState({ page, modal: null }, '', `#${page}`);
      setActivePage(page);
    }
  };

  const openModal = (modalType: 'customer' | 'saver' | 'export' | 'transaction', customer?: Customer, mode?: TransactionMode) => {
    window.history.pushState({ page: activePage, modal: modalType, customerId: customer?.id, mode }, '', `#${activePage}/${modalType}`);

    if (modalType === 'customer') setIsCustomerModalOpen(true);
    else if (modalType === 'saver') setIsSaverModalOpen(true);
    else if (modalType === 'export') setIsExportImportOpen(true);
    else if (modalType === 'transaction' && customer) {
      setTransactionTarget(customer);
      if (mode) setTransactionMode(mode);
    }
  };

  const closeAllModals = () => {
    setIsCustomerModalOpen(false);
    setIsSaverModalOpen(false);
    setIsExportImportOpen(false);
    setTransactionTarget(null);
  };

  // Handle browser back button
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;

      // If no state, we're at the initial page
      if (!state) {
        closeAllModals();
        setActivePage('dashboard');
        return;
      }

      // Close any open modals first
      closeAllModals();

      // Restore page state
      if (state.page) {
        setActivePage(state.page);
      }

      // If state had a modal open, we just closed it by going back
      // So we don't reopen it - the modal is now closed
    };

    // Set initial state only once on mount
    if (!window.history.state) {
      window.history.replaceState({ page: 'dashboard', modal: null }, '', `#dashboard`);
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []); // Empty dependency array - only run once on mount

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

  // Generate unique ID that won't collide between devices
  const generateUniqueId = (prefix: string) => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return `${prefix}-${crypto.randomUUID()}`;
    }
    // Fallback for older browsers: timestamp + random + device fingerprint
    const deviceId = localStorage.getItem('device_id') || (() => {
      const id = `DEV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('device_id', id);
      return id;
    })();
    return `${prefix}-${Date.now()}-${deviceId.slice(-6)}-${Math.random().toString(36).substr(2, 4)}`;
  };

  const addToSyncQueue = (item: Omit<SyncQueueItem, 'queueId'>) => {
    const queue = loadFromLocal<SyncQueueItem[]>(STORAGE_KEYS.SYNC_QUEUE) || [];
    const newItem: SyncQueueItem = {
      ...item,
      queueId: generateUniqueId('Q')
    };
    // FIXED: Better dedupe - only remove if SAME id AND action, keep order
    // Also add timestamp to prevent stale queue items
    const existingIndex = queue.findIndex(q => q.id === newItem.id && q.action === newItem.action);
    if (existingIndex >= 0) {
      // Replace existing item with newer one (same position)
      queue[existingIndex] = newItem;
    } else {
      queue.push(newItem);
    }
    saveToLocal(STORAGE_KEYS.SYNC_QUEUE, queue);
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

    // Always load the queue first
    const syncQueue = loadFromLocal<SyncQueueItem[]>(STORAGE_KEYS.SYNC_QUEUE) || [];

    // Always load local data first as fallback
    const localCustomers = loadFromLocal<Customer[]>(STORAGE_KEYS.CUSTOMERS) || [];
    const localTransactions = loadFromLocal<Transaction[]>(STORAGE_KEYS.TRANSACTIONS) || [];

    if (navigator.onLine) {
      try {
        console.log("Online: Fetching latest data from Supabase...");

        const { data: customersDB, error: cError } = await supabase.from('customers').select('*');
        if (cError) throw cError;

        const { data: transactionsDB, error: tError } = await supabase
          .from('transactions')
          .select('*')
          .order('date', { ascending: false });
        if (tError) throw tError;

        // Map server data to App format
        const serverCustomers = (customersDB || []).map(mapCustomerFromDB);
        const serverTransactions = (transactionsDB || []).map(mapTransactionFromDB);

        // DEBUG: Log server data counts
        const serverSavers = serverCustomers.filter(c => c.role === 'saver');
        console.log(`📊 DEBUG: Server returned ${serverCustomers.length} customers, ${serverSavers.length} savers`);
        console.log(`📊 DEBUG: Saver names:`, serverSavers.map(s => s.name));

        // FIXED: Always start with SERVER data, then apply sync queue ON TOP
        // This ensures we get data from OTHER devices first
        let mergedCustomers = [...serverCustomers];
        let mergedTransactions = [...serverTransactions];

        // Apply pending sync queue items (local changes not yet synced)
        if (syncQueue.length > 0) {
          console.log(`📦 Applying ${syncQueue.length} pending sync queue items on top of server data...`);

          // Apply customer changes from queue
          const customerQueueItems = syncQueue.filter(q => q.table === 'customers');
          for (const item of customerQueueItems) {
            if (item.action === 'INSERT' || item.action === 'UPDATE') {
              const existingIndex = mergedCustomers.findIndex(c => c.id === item.payload.id);
              const customerData = mapCustomerFromDB(item.payload);
              if (existingIndex >= 0) {
                mergedCustomers[existingIndex] = customerData;
              } else {
                mergedCustomers.push(customerData);
              }
            } else if (item.action === 'DELETE') {
              mergedCustomers = mergedCustomers.filter(c => c.id !== item.id);
            }
          }

          // Apply transaction changes from queue
          const transactionQueueItems = syncQueue.filter(q => q.table === 'transactions');
          for (const item of transactionQueueItems) {
            if (item.action === 'INSERT' || item.action === 'UPDATE') {
              const existingIndex = mergedTransactions.findIndex(t => t.id === item.payload.id);
              const transactionData = mapTransactionFromDB(item.payload);
              if (existingIndex >= 0) {
                mergedTransactions[existingIndex] = transactionData;
              } else {
                mergedTransactions.push(transactionData);
              }
            } else if (item.action === 'DELETE') {
              mergedTransactions = mergedTransactions.filter(t => t.id !== item.id);
            }
          }
        }

        // Also check for local-only items not in server AND not in queue (edge case recovery)
        const mergedCustomerIds = new Set(mergedCustomers.map(c => c.id));
        const mergedTransactionIds = new Set(mergedTransactions.map(t => t.id));
        const queueCustomerIds = new Set(syncQueue.filter(q => q.table === 'customers').map(q => q.id));
        const queueTransactionIds = new Set(syncQueue.filter(q => q.table === 'transactions').map(q => q.id));

        const orphanedLocalCustomers = localCustomers.filter(c =>
          !mergedCustomerIds.has(c.id) && !queueCustomerIds.has(c.id)
        );
        const orphanedLocalTransactions = localTransactions.filter(t =>
          !mergedTransactionIds.has(t.id) && !queueTransactionIds.has(t.id)
        );

        if (orphanedLocalCustomers.length > 0 || orphanedLocalTransactions.length > 0) {
          console.log(`🚨 RECOVERY: Found ${orphanedLocalCustomers.length} orphaned customers and ${orphanedLocalTransactions.length} orphaned transactions. Re-queuing...`);

          for (const customer of orphanedLocalCustomers) {
            mergedCustomers.push(customer);
            addToSyncQueue({ id: customer.id, action: 'INSERT', table: 'customers', payload: mapCustomerToDB(customer) });
          }
          for (const transaction of orphanedLocalTransactions) {
            mergedTransactions.push(transaction);
            addToSyncQueue({ id: transaction.id, action: 'INSERT', table: 'transactions', payload: mapTransactionToDB(transaction) });
          }
        }

        setCustomers(mergedCustomers);
        setTransactions(mergedTransactions);

        // Save merged data to local storage
        saveToLocal(STORAGE_KEYS.CUSTOMERS, mergedCustomers);
        saveToLocal(STORAGE_KEYS.TRANSACTIONS, mergedTransactions);

        console.log("✅ Successfully fetched and merged data.");

        // Trigger sync for any pending items
        if (syncQueue.length > 0) {
          setTimeout(processSyncQueue, 500);
        }
      } catch (error) {
        console.error("Failed to fetch from Supabase, using local data.", error);
        loadDataFromLocal();
      }
    } else {
      console.log("Offline, using local data.");
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
    console.log(`🔄 SYNC: Processing ${queue.length} offline items...`);

    const successfullySyncedQueueIds = new Set<string>();
    const failedItems: SyncQueueItem[] = [];

    for (const item of queue) {
      let error = null;
      let syncSuccess = false;

      try {
        console.log(`🔄 SYNC: Processing ${item.action} for ${item.table} - ID: ${item.id}`);

        if (item.table === 'customers') {
          if (item.action === 'INSERT') {
            // Use upsert with select to verify data was actually written
            const { data, error: err } = await supabase.from('customers').upsert([item.payload]).select();
            error = err;
            // Verify data was returned (RLS could silently block writes)
            syncSuccess = !err && data && data.length > 0;
            if (!syncSuccess && !err) {
              console.error(`⚠️ RLS BLOCKED: Customer insert returned no data - check Supabase RLS policies!`);
            }
          } else if (item.action === 'UPDATE') {
            const { data, error: err } = await supabase.from('customers').update(item.payload).eq('id', item.payload.id).select();
            error = err;
            syncSuccess = !err && data && data.length > 0;
            if (!syncSuccess && !err) {
              console.error(`⚠️ RLS BLOCKED: Customer update returned no data!`);
            }
          } else if (item.action === 'DELETE') {
            const { error: err } = await supabase.from('customers').delete().eq('id', item.id);
            error = err;
            syncSuccess = !err; // DELETE doesn't return data
          }
        } else if (item.table === 'transactions') {
          if (item.action === 'INSERT') {
            const { data, error: err } = await supabase.from('transactions').upsert([item.payload]).select();
            error = err;
            syncSuccess = !err && data && data.length > 0;
            if (!syncSuccess && !err) {
              console.error(`⚠️ RLS BLOCKED: Transaction insert returned no data - check Supabase RLS policies!`);
            }
          } else if (item.action === 'UPDATE') {
            const { data, error: err } = await supabase.from('transactions').update(item.payload).eq('id', item.payload.id).select();
            error = err;
            syncSuccess = !err && data && data.length > 0;
            if (!syncSuccess && !err) {
              console.error(`⚠️ RLS BLOCKED: Transaction update returned no data!`);
            }
          } else if (item.action === 'DELETE') {
            const { error: err } = await supabase.from('transactions').delete().eq('id', item.id);
            error = err;
            syncSuccess = !err;
          }
        }
      } catch (e) {
        error = e;
        syncSuccess = false;
      }

      if (error || !syncSuccess) {
        console.error(`❌ SYNC FAILED for ${item.table}/${item.id}:`, error || 'No data returned (RLS?)');
        failedItems.push(item);
      } else {
        console.log(`✅ SYNC VERIFIED: ${item.table}/${item.id}`);
        successfullySyncedQueueIds.add(item.queueId);
      }
    }

    if (successfullySyncedQueueIds.size > 0) {
      // Reload queue from storage to handle any new items added while syncing
      const currentQueue = loadFromLocal<SyncQueueItem[]>(STORAGE_KEYS.SYNC_QUEUE) || [];
      const remainingQueue = currentQueue.filter(item => !successfullySyncedQueueIds.has(item.queueId));
      saveToLocal(STORAGE_KEYS.SYNC_QUEUE, remainingQueue);
      console.log(`✅ SYNC COMPLETE: ${successfullySyncedQueueIds.size} items synced, ${remainingQueue.length} remaining.`);
    }

    // Alert user if there are failed items (potential data loss risk)
    if (failedItems.length > 0) {
      console.error(`⚠️ SYNC WARNING: ${failedItems.length} items failed to sync!`, failedItems);
    }

    setIsSyncing(false);
  };

  useEffect(() => {
    fetchData();

    const handleOnline = async () => {
      console.log("App is online.");
      setIsOnline(true);
      // CRITICAL FIX: Wait for sync to complete BEFORE fetching new data
      // This prevents local data from being overwritten before it's synced to server
      await processSyncQueue();
      // Only fetch after sync is done
      await fetchData();
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
      id: generateUniqueId('CUST'),
      status: 'aktif',
      role: 'borrower',
    };
    const todayStr = new Date().toISOString().split('T')[0];
    let transactionDateIso = newCustomer.loanDate === todayStr
      ? new Date().toISOString()
      : new Date(newCustomer.loanDate + 'T09:00:00').toISOString();
    const newTransaction: Transaction = {
      id: generateUniqueId('TRX'),
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
      id: generateUniqueId('CUST'),
      name, phone: '', location: 'Luar', loanDate: date,
      loanAmount: 0, interestRate: 0, installments: 0,
      status: 'aktif', role: 'saver',
    };
    const newTransaction: Transaction = {
      id: generateUniqueId('TRX'),
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
      id: generateUniqueId('TRX'),
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
      window.history.pushState({ page: activePage, modal: 'customer' }, '', `#${activePage}/add`);
      setIsCustomerModalOpen(true);
    } else if (activePage === 'savings') {
      window.history.pushState({ page: activePage, modal: 'saver' }, '', `#${activePage}/add`);
      setIsSaverModalOpen(true);
    }
  };

  const handleWithdrawClick = (customer: Customer) => {
    setTransactionTarget(null);
    setTimeout(() => {
      window.history.pushState({ page: activePage, modal: 'transaction', customerId: customer.id }, '', `#${activePage}/withdraw`);
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

      {/* Export/Import Button - Fixed position */}
      <button
        onClick={() => {
          window.history.pushState({ page: activePage, modal: 'export' }, '', `#export`);
          setIsExportImportOpen(true);
        }}
        className="fixed top-2 right-2 z-40 bg-white shadow-lg rounded-full p-2 hover:bg-gray-100 transition-colors"
        title="Export/Import Data"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      </button>

      <main className={`flex-1 p-3 sm:p-6 lg:p-8 ${!isOnline || isSyncing ? 'pt-8' : ''}`}>
        {activePage === 'dashboard' && (
          <Dashboard
            customers={customers}
            dailyTransactions={filteredTransactions}
            allTransactions={transactions}
            customerMap={customerMap}
            dateRange={dateRange}
            setDateRange={setDateRange}
            addTransaction={() => { }} // Deprecated, add from modals
            customHolidays={customHolidays}
            setCustomHolidays={setCustomHolidays}
          />
        )}
        {activePage === 'customers' && (
          <Customers
            customers={customers.filter(c => c.role === 'borrower')}
            transactions={transactions}
            onCustomerSelect={(customer) => {
              window.history.pushState({ page: activePage, modal: 'transaction', customerId: customer.id }, '', `#${activePage}/customer/${customer.id}`);
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
              window.history.pushState({ page: activePage, modal: 'transaction', customerId: customer.id }, '', `#${activePage}/saver/${customer.id}`);
              setTransactionMode('savings');
              setTransactionTarget(customer);
            }}
          />
        )}
      </main>
      <BottomNav
        activePage={activePage}
        setActivePage={navigateToPage}
        onAddClick={handleFabClick}
        isVisible={!transactionTarget}
      />
      <Modal isOpen={isCustomerModalOpen} onClose={() => { setIsCustomerModalOpen(false); window.history.back(); }}>
        <CustomerForm onSubmit={addCustomer} onCancel={() => { setIsCustomerModalOpen(false); window.history.back(); }} />
      </Modal>
      <Modal isOpen={isSaverModalOpen} onClose={() => { setIsSaverModalOpen(false); window.history.back(); }} title="Tambah Penabung">
        <SaverForm
          onSubmit={addSaver}
          onCancel={() => { setIsSaverModalOpen(false); window.history.back(); }}
        />
      </Modal>
      {transactionTarget && (
        <TransactionNumpadModal
          customer={transactionTarget}
          transactions={transactions}
          onClose={() => { setTransactionTarget(null); window.history.back(); }}
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
      <ExportImportModal
        isOpen={isExportImportOpen}
        onClose={() => { setIsExportImportOpen(false); window.history.back(); }}
        customers={customers}
        transactions={transactions}
        onImportComplete={() => {
          // Refresh data after import
          window.location.reload();
        }}
      />
    </div>
  );
};

export default App;
