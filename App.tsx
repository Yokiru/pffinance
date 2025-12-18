
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

// --- ONLINE-ONLY ARCHITECTURE ---
// Data consistency is prioritized over offline capability.
// All writes are blocking and go directly to Supabase.
// Local storage is used for caching/faster initial load but not for pending writes.

const STORAGE_KEYS = {
  CUSTOMERS: 'monetto_customers',
  TRANSACTIONS: 'monetto_transactions',
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
  const [isLoading, setIsLoading] = useState(false); // Global blocking loading state

  // --- BROWSER HISTORY MANAGEMENT ---
  const navigateToPage = (page: Page) => {
    if (page !== activePage) {
      window.history.pushState({ page, modal: null }, '', `#${page}`);
      setActivePage(page);
    }
  };

  const openModal = (modalType: 'customer' | 'saver' | 'transaction', customer?: Customer, mode?: TransactionMode) => {
    window.history.pushState({ page: activePage, modal: modalType, customerId: customer?.id, mode }, '', `#${activePage}/${modalType}`);

    if (modalType === 'customer') setIsCustomerModalOpen(true);
    else if (modalType === 'saver') setIsSaverModalOpen(true);
    else if (modalType === 'transaction' && customer) {
      setTransactionTarget(customer);
      if (mode) setTransactionMode(mode);
    }
  };

  const closeAllModals = () => {
    setIsCustomerModalOpen(false);
    setIsSaverModalOpen(false);
    setTransactionTarget(null);
  };

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      if (!state) {
        closeAllModals();
        setActivePage('dashboard');
        return;
      }
      closeAllModals();
      if (state.page) {
        setActivePage(state.page);
      }
    };
    if (!window.history.state) {
      window.history.replaceState({ page: 'dashboard', modal: null }, '', `#dashboard`);
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
      localStorage.removeItem(key);
      return null;
    }
  };

  const generateUniqueId = (prefix: string) => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return `${prefix}-${crypto.randomUUID()}`;
    }
    const deviceId = localStorage.getItem('device_id') || (() => {
      const id = `DEV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('device_id', id);
      return id;
    })();
    return `${prefix}-${Date.now()}-${deviceId.slice(-6)}-${Math.random().toString(36).substr(2, 4)}`;
  };

  const fetchData = async () => {
    const localHolidays = loadFromLocal<string[]>(STORAGE_KEYS.HOLIDAYS);
    if (localHolidays) setCustomHolidays(localHolidays);

    // Initial load from local storage to show something immediately
    loadDataFromLocal();

    if (navigator.onLine) {
      try {
        console.log("Online: Fetching ALL data from Supabase...");

        // Show loading if we have no data yet
        if (customers.length === 0) setIsLoading(true);

        const { data: customersDB, error: cError } = await supabase.from('customers').select('*');
        if (cError) throw cError;

        let allTransactionsDB: any[] = [];
        let hasMore = true;
        let page = 0;
        const pageSize = 1000;

        while (hasMore) {
          const { data: batch, error: tError } = await supabase
            .from('transactions')
            .select('*')
            .order('date', { ascending: false })
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (tError) throw tError;

          if (batch && batch.length > 0) {
            allTransactionsDB = [...allTransactionsDB, ...batch];
            if (batch.length < pageSize) hasMore = false;
            else page++;
          } else {
            hasMore = false;
          }
        }

        const serverCustomers = (customersDB || []).map(mapCustomerFromDB);
        const serverTransactions = (allTransactionsDB || []).map(mapTransactionFromDB);

        setCustomers(serverCustomers);
        setTransactions(serverTransactions);

        saveToLocal(STORAGE_KEYS.CUSTOMERS, serverCustomers);
        saveToLocal(STORAGE_KEYS.TRANSACTIONS, serverTransactions);

        console.log(`✅ Fetched ${serverCustomers.length} customers and ${serverTransactions.length} transactions.`);
      } catch (error) {
        console.error("Failed to fetch from Supabase.", error);
      } finally {
        setIsLoading(false);
      }
    } else {
      console.log("Offline, using local data.");
      loadDataFromLocal();
    }
  };

  const loadDataFromLocal = () => {
    const localCustomers = loadFromLocal<Customer[]>(STORAGE_KEYS.CUSTOMERS);
    const localTransactions = loadFromLocal<Transaction[]>(STORAGE_KEYS.TRANSACTIONS);
    if (localCustomers) setCustomers(localCustomers);
    if (localTransactions) setTransactions(localTransactions);
  }

  useEffect(() => {
    fetchData();

    const channel = supabase.channel('realtime_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, (payload) => {
        console.log('⚡ REALTIME CUSTOMER UPDATE:', payload);
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const newCustomer = mapCustomerFromDB(payload.new as any);
          setCustomers(prev => {
            const index = prev.findIndex(c => c.id === newCustomer.id);
            if (index >= 0) {
              const newArr = [...prev];
              newArr[index] = newCustomer;
              return newArr;
            }
            return [...prev, newCustomer];
          });
        } else if (payload.eventType === 'DELETE') {
          setCustomers(prev => prev.filter(c => c.id !== payload.old.id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, (payload) => {
        console.log('⚡ REALTIME TRANSACTION UPDATE:', payload);
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const newTx = mapTransactionFromDB(payload.new as any);
          setTransactions(prev => {
            const index = prev.findIndex(t => t.id === newTx.id);
            if (index >= 0) {
              const newArr = [...prev];
              newArr[index] = newTx;
              return newArr;
            }
            return [newTx, ...prev];
          });
        } else if (payload.eventType === 'DELETE') {
          setTransactions(prev => prev.filter(t => t.id !== payload.old.id));
        }
      })
      .subscribe();

    const handleOnline = () => {
      console.log("App is online.");
      setIsOnline(true);
      fetchData();
    };
    const handleOffline = () => {
      console.log("App is offline.");
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      supabase.removeChannel(channel);
    };
  }, []);

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

  // --- BLOCKING CRUD OPERATIONS ---

  const addCustomer = async (customerData: CustomerFormData) => {
    if (!navigator.onLine) {
      alert('Mode Offline: Tidak dapat menambah pelanggan.');
      return;
    }

    try {
      setIsLoading(true);
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

      const { error: cError } = await supabase.from('customers').insert([mapCustomerToDB(newCustomer)]);
      if (cError) throw cError;

      const { error: tError } = await supabase.from('transactions').insert([mapTransactionToDB(newTransaction)]);
      if (tError) throw tError;

      // Optimistic update
      const nextCustomers = [...customers, newCustomer];
      const nextTransactions = [...transactions, newTransaction];
      setCustomers(nextCustomers);
      setTransactions(nextTransactions);
      saveToLocal(STORAGE_KEYS.CUSTOMERS, nextCustomers);
      saveToLocal(STORAGE_KEYS.TRANSACTIONS, nextTransactions);

      setIsCustomerModalOpen(false);
      window.history.back();
    } catch (e: any) {
      console.error("Add customer error", e);
      alert('Gagal tambah pelanggan: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const addSaver = async (data: { name: string; amount: number; date: string }) => {
    if (!navigator.onLine) {
      alert('Mode Offline: Tidak dapat menambah penabung.');
      return;
    }

    try {
      setIsLoading(true);
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

      const { error: cError } = await supabase.from('customers').insert([mapCustomerToDB(newSaverAsCustomer)]);
      if (cError) throw cError;

      const { error: tError } = await supabase.from('transactions').insert([mapTransactionToDB(newTransaction)]);
      if (tError) throw tError;

      const nextCustomers = [...customers, newSaverAsCustomer];
      const nextTransactions = [...transactions, newTransaction];
      setCustomers(nextCustomers);
      setTransactions(nextTransactions);
      saveToLocal(STORAGE_KEYS.CUSTOMERS, nextCustomers);
      saveToLocal(STORAGE_KEYS.TRANSACTIONS, nextTransactions);

      setIsSaverModalOpen(false);
      window.history.back();
    } catch (e: any) {
      console.error("Add saver error", e);
      alert('Gagal tambah penabung: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCustomer = async (updatedCustomer: Customer) => {
    if (!navigator.onLine) {
      alert('Mode Offline: Tidak dapat update data.');
      return;
    }
    try {
      setIsLoading(true);
      const { error } = await supabase.from('customers').update(mapCustomerToDB(updatedCustomer)).eq('id', updatedCustomer.id);
      if (error) throw error;

      const nextCustomers = customers.map(c => c.id === updatedCustomer.id ? updatedCustomer : c);
      setCustomers(nextCustomers);
      saveToLocal(STORAGE_KEYS.CUSTOMERS, nextCustomers);
    } catch (e: any) {
      console.error("Update customer error", e);
      alert('Gagal update: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCustomer = async (customerId: string) => {
    if (!confirm('Yakin ingin menghapus pelanggan ini beserta semua transaksinya?')) return;
    if (!navigator.onLine) {
      alert('Mode Offline: Tidak dapat menghapus data.');
      return;
    }

    try {
      setIsLoading(true);
      const { error: tError } = await supabase.from('transactions').delete().eq('customer_id', customerId);
      if (tError) throw tError;

      const { error: cError } = await supabase.from('customers').delete().eq('id', customerId);
      if (cError) throw cError;

      const nextCustomers = customers.filter(c => c.id !== customerId);
      const nextTransactions = transactions.filter(t => t.customerId !== customerId);

      setCustomers(nextCustomers);
      setTransactions(nextTransactions);
      saveToLocal(STORAGE_KEYS.CUSTOMERS, nextCustomers);
      saveToLocal(STORAGE_KEYS.TRANSACTIONS, nextTransactions);

      if (transactionTarget?.id === customerId) {
        setTransactionTarget(null);
      }
    } catch (e: any) {
      console.error("Delete customer error", e);
      alert('Gagal hapus: ' + e.message);
    } finally {
      setIsLoading(false);
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

  const recalculateCustomerStatus = async (customerId: string) => {
    if (!navigator.onLine) return;

    try {
      const { data: serverTx, error } = await supabase.from('transactions').select('*').eq('customer_id', customerId);

      if (!error && serverTx) {
        const freshTransactions = serverTx.map(mapTransactionFromDB);
        const customer = customers.find(c => c.id === customerId);

        if (customer && customer.loanAmount > 0 && customer.status !== 'arsip') {
          const totalRepayments = freshTransactions
            .filter(t => t.type === TransactionType.REPAYMENT)
            .reduce((sum, t) => sum + t.amount, 0);

          const totalLoanWithInterest = customer.loanAmount * (1 + customer.interestRate / 100);
          const isPaidOff = totalRepayments >= totalLoanWithInterest;
          const newStatus: Customer['status'] = isPaidOff ? 'lunas' : 'aktif';

          if (customer.status !== newStatus) {
            const updatedCustomer = { ...customer, status: newStatus };
            await supabase.from('customers').update({ status: newStatus }).eq('id', customerId);
            setCustomers(prev => prev.map(c => c.id === customerId ? updatedCustomer : c));
          }
        }
      }
    } catch (e) {
      console.error("Recalculate error:", e);
    }
  };

  const handleCreateTransactionFromNumpad = async (transactionData: Omit<Transaction, 'id'>) => {
    if (!navigator.onLine) {
      alert('Mode Offline: Tidak dapat transaksi.');
      return;
    }

    try {
      setIsLoading(true);
      const newTransaction: Transaction = {
        ...transactionData,
        id: generateUniqueId('TRX'),
      };

      const { error } = await supabase.from('transactions').insert([mapTransactionToDB(newTransaction)]);
      if (error) throw error;

      const nextTransactions = [...transactions, newTransaction];
      setTransactions(nextTransactions);
      saveToLocal(STORAGE_KEYS.TRANSACTIONS, nextTransactions);

      setTransactionTarget(null);

      if (transactionData.type === TransactionType.REPAYMENT) {
        await recalculateCustomerStatus(transactionData.customerId);
      }

    } catch (e: any) {
      console.error("Create transaction error", e);
      alert('Transaksi Gagal: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateTransaction = async (updatedTransaction: Transaction) => {
    if (!navigator.onLine) {
      alert('Mode Offline: Tidak dapat update.');
      return;
    }

    try {
      setIsLoading(true);
      const transactionToSave = { ...updatedTransaction, isEdited: true };
      const { error } = await supabase.from('transactions').update(mapTransactionToDB(transactionToSave)).eq('id', transactionToSave.id);
      if (error) throw error;

      const nextTransactions = transactions.map(t => t.id === updatedTransaction.id ? transactionToSave : t);
      setTransactions(nextTransactions);
      saveToLocal(STORAGE_KEYS.TRANSACTIONS, nextTransactions);

      await recalculateCustomerStatus(updatedTransaction.customerId);
    } catch (e: any) {
      console.error("Update transaction error", e);
      alert('Gagal update transaksi: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTransaction = async (transactionId: string) => {
    const transactionToDelete = transactions.find(t => t.id === transactionId);
    if (!transactionToDelete) return;
    if (!confirm('Hapus transaksi ini?')) return;

    if (!navigator.onLine) {
      alert('Mode Offline: Tidak dapat hapus.');
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await supabase.from('transactions').delete().eq('id', transactionId);
      if (error) throw error;

      const nextTransactions = transactions.filter(t => t.id !== transactionId);
      setTransactions(nextTransactions);
      saveToLocal(STORAGE_KEYS.TRANSACTIONS, nextTransactions);

      await recalculateCustomerStatus(transactionToDelete.customerId);
    } catch (e: any) {
      console.error("Delete transaction error", e);
      alert('Gagal hapus transaksi: ' + e.message);
    } finally {
      setIsLoading(false);
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
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[60] bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-5 rounded-lg shadow-xl flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-3"></div>
            <p className="font-bold text-gray-700">Memproses Data...</p>
            <p className="text-xs text-gray-500 mt-1">Mohon tunggu sebentar</p>
          </div>
        </div>
      )}

      <main className={`flex-1 p-3 sm:p-6 lg:p-8 ${!isOnline ? 'pt-8' : ''}`}>
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
    </div>
  );
};

export default App;
