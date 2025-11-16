
import React, { useMemo, useState } from 'react';
import { Customer, Transaction, TransactionType } from '../types';
import { formatCurrency } from '../utils/formatters';
import { TransactionIcon } from './TransactionIcon';
import { isDateHoliday } from '../utils/holidays';

interface CustomerDetailViewProps {
  customer: Customer;
  transactions: Transaction[];
  onClose: () => void;
  onEditClick: () => void;
  onEditTransactionClick: (transaction: Transaction) => void;
  onDeleteTransactionClick: (transaction: Transaction) => void;
  customHolidays: string[];
}

const BentoCard: React.FC<{ children: React.ReactNode; className?: string; span?: string }> = ({ children, className = '', span = 'col-span-4' }) => (
    <div className={`shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100 rounded-2xl p-5 flex flex-col justify-center ${span} ${className.includes('bg-') ? '' : 'bg-card'} ${className}`}>
        {children}
    </div>
);

const CustomerDetailView: React.FC<CustomerDetailViewProps> = ({ customer, transactions, onClose, onEditClick, onEditTransactionClick, onDeleteTransactionClick, customHolidays }) => {
    const [viewMode, setViewMode] = useState<'transactions' | 'missed_payments'>('transactions');
    
    const customerTransactions = useMemo(() => {
        return transactions
            .filter(t => t.customerId === customer.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, customer.id]);
    
    const { 
        totalRepayments, 
        remainingLoan, 
        dueDate, 
        installmentAmount, 
        totalLoanWithInterest, 
        jumlahBolong, 
        missedPaymentDates,
        installmentsPaid,
        loanProgressPercentage 
    } = useMemo(() => {
        // Helper to get local YYYY-MM-DD string to avoid UTC shifts
        const toLocalYMD = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const repayments = customerTransactions
            .filter(t => t.type === TransactionType.REPAYMENT);

        // Use strict YYYY-MM-DD comparison based on local time
        const repaymentDates = new Set(
            repayments.map(t => toLocalYMD(new Date(t.date)))
        );

        const loanDate = new Date(customer.loanDate + 'T00:00:00');
        const dueDateCalc = new Date(loanDate);
        dueDateCalc.setDate(loanDate.getDate() + customer.installments);

        const totalLoanWithInterest = customer.loanAmount * (1 + customer.interestRate / 100);
        const installment = customer.installments > 0 ? totalLoanWithInterest / customer.installments : 0;

        // Calculate missed payments ("Jumlah Bolong") and their dates
        const missedDates: Date[] = [];
        if (customer.status === 'aktif') {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Normalize today's date
            const startDate = new Date(customer.loanDate + 'T00:00:00');
            
            // Start checking from the next day, as payments are expected starting the day after the loan.
            const checkStartDate = new Date(startDate);
            checkStartDate.setDate(startDate.getDate() + 1);

            const loopEndDate = today < dueDateCalc ? today : dueDateCalc;

            for (let d = new Date(checkStartDate); d <= loopEndDate; d.setDate(d.getDate() + 1)) {
                const dayOfWeek = d.getDay();
                const dateString = toLocalYMD(d);

                // Check if it's not Sunday (0) and not a holiday (static + custom). Saturday (6) is now included.
                if (dayOfWeek !== 0 && !isDateHoliday(dateString, customHolidays)) {
                    // This is an expected payment day. Check if payment was made on this day (using local string match).
                    if (!repaymentDates.has(dateString)) {
                        missedDates.push(new Date(d));
                    }
                }
            }
        }
        
        const totalRepaymentsAmount = repayments.reduce((sum, t) => sum + t.amount, 0);
        
        const paidInstallments = installment > 0 ? Math.floor(totalRepaymentsAmount / installment) : 0;
        const progressPercentage = customer.installments > 0 ? (paidInstallments / customer.installments) * 100 : 0;

        return {
            totalRepayments: totalRepaymentsAmount,
            remainingLoan: Math.max(0, totalLoanWithInterest - totalRepaymentsAmount),
            dueDate: dueDateCalc,
            installmentAmount: installment,
            totalLoanWithInterest,
            jumlahBolong: missedDates.length,
            missedPaymentDates: missedDates.reverse(), // Show most recent first
            installmentsPaid: paidInstallments,
            loanProgressPercentage: progressPercentage
        };
    }, [customerTransactions, customer, customHolidays]);

    const formatDate = (date: Date | string) => {
        const dateObj = typeof date === 'string' ? new Date(date) : date; 
        return dateObj.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const getTransactionTitle = (t: Transaction) => {
        switch (t.type) {
            case TransactionType.LOAN: return `Pinjaman Awal`;
            case TransactionType.SAVINGS: return `Simpanan`;
            case TransactionType.REPAYMENT: return `Pembayaran Cicilan`;
            default: return 'Transaksi';
        }
    };

    const getTransactionAmount = (t: Transaction) => {
      switch (t.type) {
          case TransactionType.LOAN: return { value: -t.amount, color: 'text-accent-red' };
          case TransactionType.SAVINGS: return { value: t.amount, color: 'text-accent-green' };
          case TransactionType.REPAYMENT: return { value: t.amount, color: 'text-accent-green' };
          case TransactionType.WITHDRAWAL: return { value: -t.amount, color: 'text-accent-red' };
          default: return { value: t.amount, color: 'text-gray-900' };
      }
    };

    return (
        <div className="relative flex flex-col h-full text-gray-900 overflow-hidden bg-app-bg">
            {/* Simple Header */}
            <header className="bg-app-bg/80 backdrop-blur-md p-4 flex items-center justify-center z-10 sticky top-0">
                <h2 className="text-lg font-bold text-center">Detail Nasabah</h2>
            </header>

            <main className="flex-1 overflow-y-auto no-scrollbar z-10 pb-24">
                <div className="p-4 space-y-6">
                    
                    {/* Bento Grid Layout */}
                    <div className="grid grid-cols-4 gap-3">
                        
                        {/* Profile Card (Full Width) */}
                        <BentoCard span="col-span-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 border border-gray-200">
                                        <span className="text-2xl font-bold text-gray-700">{customer.name[0]?.toUpperCase()}</span>
                                    </div>
                                    <div>
                                        <p className="text-xl font-bold text-gray-900">{customer.name}</p>
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <span>{customer.location}</span>
                                            {customer.phone && customer.phone.trim().length > 0 && (
                                                <>
                                                    <span>•</span>
                                                    <span>{customer.phone}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={onEditClick} 
                                    className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors text-gray-600"
                                >
                                    {/* Increased to w-6 h-6 */}
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
                                    </svg>
                                </button>
                            </div>
                        </BentoCard>

                        {/* Remaining Loan (Prominent) */}
                        <BentoCard span="col-span-2" className="bg-[#C7FF24] border-none">
                            <p className="text-xs text-black mb-1">Sisa Tagihan</p>
                            <p className="text-xl font-semibold text-black truncate">{formatCurrency(remainingLoan)}</p>
                        </BentoCard>

                        {/* Total Paid */}
                        <BentoCard span="col-span-2" className="bg-[#050505] border-none">
                            <p className="text-xs text-gray-400 mb-1">Total Dibayar</p>
                            <p className="text-xl font-semibold text-white truncate">{formatCurrency(totalRepayments)}</p>
                        </BentoCard>

                        {/* Status */}
                        <BentoCard span="col-span-2">
                            <div className="flex flex-col">
                                <p className="text-xs text-gray-500 mb-2">Status</p>
                                <span className={`inline-flex self-start px-3 py-1 rounded-full text-xs font-bold ${
                                    customer.status === 'aktif' 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                    {customer.status === 'aktif' ? 'AKTIF' : 'LUNAS'}
                                </span>
                            </div>
                        </BentoCard>

                        {/* Missed Payments (Bolong) */}
                        <BentoCard span="col-span-2">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Bolong</p>
                                    <p className={`text-2xl font-bold ${jumlahBolong > 0 ? 'text-red-500' : 'text-gray-300'}`}>
                                        {jumlahBolong}
                                    </p>
                                </div>
                                <span className="text-xs text-gray-400 mb-1">Hari</span>
                            </div>
                        </BentoCard>

                        {/* Progress Bar */}
                         {customer.status === 'aktif' && (
                            <BentoCard span="col-span-4">
                                <div className="flex justify-between items-center text-xs mb-2">
                                    <p className="font-semibold text-gray-500">Progres Cicilan</p>
                                    <p className="font-bold text-gray-900">{Math.round(loanProgressPercentage)}%</p>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                    <div 
                                        className="bg-[#1B1B1B] h-full rounded-full transition-all duration-500 ease-out" 
                                        style={{ width: `${loanProgressPercentage}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-gray-400 mt-2 text-right">{installmentsPaid} / {customer.installments} cicilan</p>
                            </BentoCard>
                        )}

                        {/* Loan Configuration Grid */}
                        <BentoCard span="col-span-4">
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-gray-400">Pinjaman Awal</p>
                                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(customer.loanAmount)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Total + Bunga</p>
                                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(totalLoanWithInterest)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Setoran</p>
                                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(installmentAmount)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Jatuh Tempo</p>
                                    <p className="text-sm font-semibold text-gray-900">{formatDate(dueDate)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Tanggal Pinjam</p>
                                    <p className="text-sm font-semibold text-gray-900">{formatDate(customer.loanDate + 'T00:00:00')}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Bunga</p>
                                    <p className="text-sm font-semibold text-gray-900">{customer.interestRate}%</p>
                                </div>
                             </div>
                        </BentoCard>

                    </div>

                    {/* History Section */}
                    <div className="pt-2">
                        <div className="bg-card shadow-sm rounded-2xl overflow-hidden border border-gray-100">
                             <div className="p-5 flex justify-between items-center border-b border-gray-100">
                                <h3 className="text-lg font-bold text-gray-900">{viewMode === 'transactions' ? 'Riwayat Transaksi' : 'Riwayat Bolong'}</h3>
                                <button 
                                    onClick={() => setViewMode(prev => prev === 'transactions' ? 'missed_payments' : 'transactions')}
                                    className="text-xs font-bold bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors text-gray-600"
                                >
                                    {viewMode === 'transactions' ? 'Lihat Bolong' : 'Lihat Transaksi'}
                                </button>
                            </div>
                        
                            {viewMode === 'transactions' ? (
                                <div>
                                    {customerTransactions.length > 0 ? (
                                        customerTransactions.map((t, index) => {
                                            const amountInfo = getTransactionAmount(t);
                                            return (
                                                <div key={t.id} className={`group p-5 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors ${index !== customerTransactions.length - 1 ? 'border-b border-gray-100' : ''}`}>
                                                    <div className="flex items-center flex-1 min-w-0">
                                                        <TransactionIcon type={t.type} />
                                                        <div className="ml-4 flex-1 min-w-0">
                                                            <p className="font-bold text-gray-900 truncate">{getTransactionTitle(t)}</p>
                                                            <p className="text-sm text-gray-500">
                                                                {new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                                {' · '}
                                                                {new Date(t.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                                {t.isEdited && <span className="text-yellow-600"> (diedit)</span>}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="relative flex items-center justify-end min-w-[100px]">
                                                        <p className="font-light text-lg text-black transition-opacity duration-200 group-hover:opacity-0">
                                                            {formatCurrency(amountInfo.value, true)}
                                                        </p>
                                                        <div className="absolute right-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                            <button onClick={() => onEditTransactionClick(t)} className="w-9 h-9 flex items-center justify-center bg-gray-100 border border-gray-200 rounded-full hover:bg-gray-200 transition-colors">
                                                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                                                            </button>
                                                            <button onClick={() => onDeleteTransactionClick(t)} className="w-9 h-9 flex items-center justify-center bg-red-50 border border-red-100 rounded-full hover:bg-red-100 transition-colors">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="p-8 text-center text-gray-400 flex flex-col items-center justify-center space-y-4 min-h-[150px]">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <p>Belum ada riwayat transaksi.</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                 <div>
                                    {missedPaymentDates.length > 0 ? (
                                        missedPaymentDates.map((date, index) => (
                                            <div key={index} className={`p-5 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors ${index !== missedPaymentDates.length - 1 ? 'border-b border-gray-100' : ''}`}>
                                                <div className="flex items-center">
                                                    <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </div>
                                                    <div className="ml-4">
                                                        <p className="font-bold text-gray-900">Pembayaran Bolong</p>
                                                        <p className="text-sm text-gray-500">
                                                            {formatDate(date)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-8 text-center text-gray-400 flex flex-col items-center justify-center space-y-4 min-h-[150px]">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <p>Tidak ada riwayat bolong. Pembayaran lancar!</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Floating Close Button */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center z-20 pointer-events-none">
                <button
                    onClick={onClose}
                    className="w-14 h-14 bg-black rounded-full flex items-center justify-center shadow-2xl pointer-events-auto hover:scale-105 transition-transform"
                    aria-label="Tutup"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default CustomerDetailView;
