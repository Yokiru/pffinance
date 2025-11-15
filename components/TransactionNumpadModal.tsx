
import React, { useState, useEffect, useMemo } from 'react';
import { Customer, Transaction, TransactionType } from '../types';
import Numpad from './Numpad';
import CustomerDetailView from './CustomerDetailView';
import { formatCurrency } from '../utils/formatters';
import Modal from './Modal';
import CustomerForm from './CustomerForm';
import TransactionForm from './TransactionForm';
import SaverDetailView from './SaverDetailView';

interface TransactionNumpadModalProps {
  customer: Customer;
  transactions: Transaction[];
  onClose: () => void;
  onSubmit: (transaction: Omit<Transaction, 'id' | 'date'>) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onUpdateTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transactionId: string) => void;
  onDeleteCustomer: (customerId: string) => void;
  onWithdrawClick: (customer: Customer) => void;
  mode: 'repayment' | 'savings' | 'withdrawal';
}

const TransactionNumpadModal: React.FC<TransactionNumpadModalProps> = ({ customer, transactions, onClose, onSubmit, onUpdateCustomer, onUpdateTransaction, onDeleteTransaction, onDeleteCustomer, onWithdrawClick, mode }) => {
    const [amount, setAmount] = useState('0');
    const [isClosing, setIsClosing] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Transfer'>('Cash');
    const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // State for transaction edit/delete modals, lifted from CustomerDetailView
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [isEditTransactionModalOpen, setIsEditTransactionModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    
    // State for customer delete
    const [isDeleteCustomerConfirmOpen, setIsDeleteCustomerConfirmOpen] = useState(false);
    
    const togglePaymentMethod = () => {
        setPaymentMethod(prev => (prev === 'Cash' ? 'Transfer' : 'Cash'));
    };
    
    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300); // Wait for animation to finish
    };

    const handleInput = (value: string) => {
        if (value === '000') {
            if (amount === '0') return; // Don't add 000 to 0
            const parts = amount.split('.');
            // Prevent adding 000 if it exceeds reasonable length
            if (parts[0].length + 3 > 15) return; 
            setAmount(amount + '000');
            return;
        }

        if (value === '.') {
            if (!amount.includes('.')) {
                setAmount(amount + '.');
            }
            return;
        }
        
        if (amount === '0') {
            setAmount(value);
        } else {
            const parts = amount.split('.');
            if (parts.length > 1 && parts[1].length >= 2) {
                return;
            }
            // Prevent excessively long numbers
            if (parts[0].length >= 15) return;
            setAmount(amount + value);
        }
    };
    
    const handleBackspace = () => {
        if (amount.length > 1) {
            setAmount(amount.slice(0, -1));
        } else {
            setAmount('0');
        }
    };
    
    const numericAmount = useMemo(() => parseFloat(amount.replace(/,/g, '') || '0'), [amount]);

    const { remainingLoan, totalSavings, installmentAmount } = useMemo(() => {
        const customerTransactions = transactions.filter(t => t.customerId === customer.id);
        
        const totalRepayments = customerTransactions
            .filter(t => t.type === TransactionType.REPAYMENT)
            .reduce((sum, t) => sum + t.amount, 0);
        
        const totalSavingsAmount = customerTransactions
            .filter(t => t.type === TransactionType.SAVINGS)
            .reduce((sum, t) => sum + t.amount, 0);

        const totalWithdrawals = customerTransactions
            .filter(t => t.type === TransactionType.WITHDRAWAL)
            .reduce((sum, t) => sum + t.amount, 0);

        const netSavings = totalSavingsAmount - totalWithdrawals;

        const totalLoanWithInterest = customer.loanAmount * (1 + customer.interestRate / 100);
        const remaining = totalLoanWithInterest - totalRepayments;

        // Calculate installment amount (Setoran)
        const installment = customer.installments > 0 
            ? totalLoanWithInterest / customer.installments 
            : 0;

        return { 
            remainingLoan: remaining, 
            totalSavings: netSavings,
            installmentAmount: installment
        };
    }, [transactions, customer]);

    const handleSubmit = () => {
        if (numericAmount > 0) {
            if (mode === 'withdrawal' && numericAmount > totalSavings) {
                return; 
            }
            onSubmit({
                customerId: customer.id,
                amount: numericAmount,
                type: mode === 'repayment' ? TransactionType.REPAYMENT : mode === 'savings' ? TransactionType.SAVINGS : TransactionType.WITHDRAWAL,
                description: mode === 'repayment' ? `Pembayaran untuk ${customer.name}` : mode === 'savings' ? `Simpanan untuk ${customer.name}` : `Penarikan oleh ${customer.name}`,
                paymentMethod: paymentMethod,
            });
        }
    };

    const handleUpdateCustomer = (customerData: Omit<Customer, 'id' | 'status'>) => {
      onUpdateCustomer({
        ...customerData,
        id: customer.id,
        status: customer.status,
      });
      setIsEditModalOpen(false);
    };

    const handleConfirmDeleteCustomer = () => {
        onDeleteCustomer(customer.id);
        setIsDeleteCustomerConfirmOpen(false);
        setIsEditModalOpen(false);
    };

    // Handlers for transaction modals
    const handleEditTransactionClick = (transaction: Transaction) => {
        setSelectedTransaction(transaction);
        setIsEditTransactionModalOpen(true);
    };

    const handleDeleteTransactionClick = (transaction: Transaction) => {
        setSelectedTransaction(transaction);
        setIsDeleteConfirmOpen(true);
    };
    
    const handleConfirmDelete = () => {
        if (selectedTransaction) {
            onDeleteTransaction(selectedTransaction.id);
            setIsDeleteConfirmOpen(false);
            setSelectedTransaction(null);
        }
    };

    const handleUpdateTransaction = (updatedData: Omit<Transaction, 'id'>) => {
        if (selectedTransaction) {
            onUpdateTransaction({ ...updatedData, id: selectedTransaction.id });
            setIsEditTransactionModalOpen(false);
            setSelectedTransaction(null);
        }
    };

    useEffect(() => {
        // Trigger entrance animation on mount
        const timer = setTimeout(() => setIsVisible(true), 10);
        
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                handleClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('keydown', handleEsc);
        };
    }, []);

    const formattedAmount = new Intl.NumberFormat('id-ID').format(numericAmount);
    const integerPart = formattedAmount.split(',')[0];
    const decimalPart = amount.split('.')[1];

    const { amountFontSizeClass } = useMemo(() => {
        const len = integerPart.length;
        if (len <= 7) return { amountFontSizeClass: 'text-7xl' };
        if (len <= 9) return { amountFontSizeClass: 'text-6xl' };
        if (len <= 11) return { amountFontSizeClass: 'text-5xl' };
        return { amountFontSizeClass: 'text-4xl' };
    }, [integerPart]);

    const formatDate = (date: Date | string) => {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return dateObj.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const withdrawalExceedsBalance = mode === 'withdrawal' && numericAmount > totalSavings;
    const isConfirmDisabled = numericAmount === 0 || withdrawalExceedsBalance;

    return (
        <>
            <div className={`fixed inset-0 z-50 flex flex-col bg-app-bg transition-transform duration-300 ease-in-out ${isVisible && !isClosing ? 'translate-y-0' : 'translate-y-full'}`}>
                <div className="relative w-full h-full overflow-hidden">
                    <div className={`absolute inset-0 flex transition-transform duration-300 ease-in-out ${isDetailViewOpen ? '-translate-x-full' : 'translate-x-0'}`}>
                        {/* Numpad View */}
                        <div className="w-full h-full flex-shrink-0 flex flex-col bg-app-bg">
                            {/* Header / "Send to" Section */}
                            <div className="pt-2 px-6 pb-2">
                                <div className="flex items-center justify-between mb-2">
                                    <button 
                                        onClick={handleClose} 
                                        className="w-10 h-10 flex items-center justify-center bg-card border border-gray-200 rounded-full text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
                                        aria-label="Kembali"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                </div>
                                
                                <div className="bg-card rounded-2xl p-4 shadow-sm flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 border border-gray-200">
                                            <span className="text-xl font-bold text-gray-700">{customer.name[0]?.toUpperCase()}</span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">{customer.name}</p>
                                            <p className="text-xs text-gray-500">
                                               {mode === 'repayment' 
                                                    ? `Setoran: ${formatCurrency(installmentAmount)}` 
                                                    : mode === 'savings' ? 'Tambah Tabungan' : 'Tarik Tunai'}
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setIsDetailViewOpen(true)} 
                                        className="bg-gray-100 hover:bg-gray-200 text-gray-900 text-sm font-medium px-4 py-2 rounded-full transition-colors"
                                    >
                                        Detail
                                    </button>
                                </div>
                            </div>

                            {/* Amount Section */}
                            <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-4">
                                {withdrawalExceedsBalance && <p className="text-red-500 text-xs text-center mb-2 font-bold bg-red-50 px-3 py-1 rounded-full">Saldo tidak cukup</p>}
                                <div className="flex items-center justify-center">
                                    <span className={`font-medium text-4xl mr-2 text-gray-400 self-center`}>Rp</span>
                                    <span className={`${amountFontSizeClass} font-bold text-gray-900 tracking-tight leading-none`}>
                                        {integerPart}
                                        {amount.includes('.') && <span className="text-gray-400">,{decimalPart}</span>}
                                    </span>
                                </div>
                            </div>

                            {/* Numpad & Method Container */}
                            <div className="bg-card rounded-3xl mx-4 mb-4 px-8 pt-6 pb-6 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                                {/* Payment Method "Card" */}
                                <div className="bg-gray-50 rounded-xl p-4 mb-4 flex items-center justify-between border border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${paymentMethod === 'Cash' ? 'bg-green-100' : 'bg-blue-100'}`}>
                                            {paymentMethod === 'Cash' ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm">{paymentMethod}</p>
                                            <p className="text-xs text-gray-500">Metode Pembayaran</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={togglePaymentMethod} 
                                        className="bg-card border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-medium px-3 py-1.5 rounded-full transition-colors shadow-sm"
                                    >
                                        Ganti
                                    </button>
                                </div>

                                <div>
                                    <Numpad onInput={handleInput} onBackspace={handleBackspace} />
                                </div>
                                
                                <button 
                                    onClick={handleSubmit}
                                    disabled={isConfirmDisabled}
                                    className="w-full bg-black text-white font-bold py-4 rounded-full mt-4 text-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] hover:bg-gray-900 disabled:bg-gray-300 disabled:scale-100 disabled:cursor-not-allowed shadow-lg">
                                    {mode === 'repayment' ? 'Konfirmasi' : mode === 'savings' ? 'Simpan Uang' : 'Tarik Uang'}
                                </button>
                            </div>
                        </div>

                        {/* Detail View (Side Panel) */}
                        <div className="w-full h-full flex-shrink-0 bg-app-bg">
                            {mode === 'repayment' ? (
                                <CustomerDetailView 
                                    customer={customer}
                                    transactions={transactions}
                                    onClose={() => setIsDetailViewOpen(false)}
                                    onEditClick={() => setIsEditModalOpen(true)}
                                    onEditTransactionClick={handleEditTransactionClick}
                                    onDeleteTransactionClick={handleDeleteTransactionClick}
                                />
                            ) : (
                                <SaverDetailView
                                    customer={customer}
                                    transactions={transactions}
                                    onClose={() => setIsDetailViewOpen(false)}
                                    onEditTransactionClick={handleEditTransactionClick}
                                    onDeleteTransactionClick={handleDeleteTransactionClick}
                                    onWithdrawClick={onWithdrawClick}
                                    onDeleteClick={() => setIsDeleteCustomerConfirmOpen(true)}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals (Edit Customer, Delete Confirm, etc.) remain unchanged */}
            <Modal 
                isOpen={isEditModalOpen} 
                onClose={() => setIsEditModalOpen(false)} 
                title="Edit Nasabah"
                headerAction={
                    <button 
                        onClick={() => setIsDeleteCustomerConfirmOpen(true)}
                        className="w-9 h-9 flex items-center justify-center bg-red-50 rounded-full text-red-500 hover:bg-red-100 transition-colors"
                        title="Hapus Nasabah"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                }
            >
                <CustomerForm 
                    onSubmit={handleUpdateCustomer} 
                    onCancel={() => setIsEditModalOpen(false)}
                    initialData={customer}
                />
            </Modal>

            <Modal isOpen={isDeleteCustomerConfirmOpen} onClose={() => setIsDeleteCustomerConfirmOpen(false)} contentClassName="p-0">
                <div className="p-6 text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Hapus {mode === 'repayment' ? 'Nasabah' : 'Penabung'}?</h3>
                    <p className="text-gray-500 text-sm mb-4">
                        Anda yakin ingin menghapus {mode === 'repayment' ? 'nasabah' : 'penabung'} <span className="font-bold text-gray-900">{customer.name}</span>?
                        <br/>
                        <span className="text-xs text-red-500 mt-1 block">Semua data transaksi akan hilang permanen.</span>
                    </p>
                </div>
                <div className="flex border-t border-gray-100">
                    <button onClick={() => setIsDeleteCustomerConfirmOpen(false)} className="flex-1 p-3 text-gray-500 hover:bg-gray-50 transition-colors rounded-bl-3xl">Batal</button>
                    <button onClick={handleConfirmDeleteCustomer} className="flex-1 p-3 text-red-500 font-bold hover:bg-red-50 transition-colors border-l border-gray-100 rounded-br-3xl">Ya, Hapus</button>
                </div>
            </Modal>

            {isEditTransactionModalOpen && selectedTransaction && (
                <Modal isOpen={isEditTransactionModalOpen} onClose={() => setIsEditTransactionModalOpen(false)} title="Edit Transaksi">
                    <TransactionForm 
                        customers={[customer]} 
                        onSubmit={handleUpdateTransaction}
                        onCancel={() => setIsEditTransactionModalOpen(false)}
                        initialData={selectedTransaction}
                    />
                </Modal>
            )}

            {isDeleteConfirmOpen && selectedTransaction && (
                <Modal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} contentClassName="p-0">
                    <div className="p-6 text-center">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Hapus Transaksi?</h3>
                        <p className="text-gray-500 text-sm">Anda yakin ingin menghapus transaksi sebesar <span className="font-bold text-gray-900">{formatCurrency(selectedTransaction.amount)}</span> pada tanggal {formatDate(selectedTransaction.date)}?</p>
                        <p className="text-gray-500 text-sm mt-1">Tindakan ini tidak dapat diurungkan.</p>
                    </div>
                    <div className="flex border-t border-gray-100">
                        <button onClick={() => setIsDeleteConfirmOpen(false)} className="flex-1 p-3 text-gray-500 hover:bg-gray-50 transition-colors rounded-bl-3xl">Batal</button>
                        <button onClick={handleConfirmDelete} className="flex-1 p-3 text-red-500 font-bold hover:bg-red-50 transition-colors border-l border-gray-100 rounded-br-3xl">Ya, Hapus</button>
                    </div>
                </Modal>
            )}
        </>
    );
};

export default TransactionNumpadModal;
