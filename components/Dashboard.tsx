
import React, { useMemo, useState } from 'react';
import { Customer, Transaction, TransactionType } from '../types';
import { DateRange } from '../App';
import Modal from './Modal';
import TransactionForm from './TransactionForm';
import { formatCurrency } from '../utils/formatters';
import { TransactionIcon } from './TransactionIcon';
import DateRangePickerModal from './DateRangePickerModal';
import { holidays } from '../utils/holidays';

interface DashboardProps {
  customers: Customer[];
  dailyTransactions: Transaction[];
  allTransactions: Transaction[];
  customerMap: Map<string, Customer>;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ customers, dailyTransactions, customerMap, dateRange, setDateRange, addTransaction }) => {
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'transactions' | 'missed'>('transactions');

    const handleAddTransaction = (transactionData: Omit<Transaction, 'id'>) => {
        addTransaction(transactionData);
        setIsTransactionModalOpen(false);
    };
    
    const displayedDate = useMemo(() => {
        const { start, end } = dateRange;
        const isSingleDay = start.toDateString() === end.toDateString();

        if (isSingleDay) {
            return start.toLocaleDateString('id-ID', { day: 'numeric', month: 'long'});
        }
        return `${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`;
    }, [dateRange]);

    const activityTitleDate = useMemo(() => {
        const { start, end } = dateRange;
        const isSingleDay = start.toDateString() === end.toDateString();
        if (isSingleDay) {
            return start.toLocaleDateString('id-ID', { day: 'numeric', month: 'long'});
        }
        return displayedDate;
    }, [dateRange, displayedDate]);

    const { totalUang, dailyRepayments, dailySavings, breakdowns } = useMemo(() => {
        let dailyRepaymentsTotal = 0;
        const dailyRepaymentsBreakdown = { cash: 0, transfer: 0 };

        let dailySavingsTotal = 0;
        const dailySavingsBreakdown = { cash: 0, transfer: 0 };

        dailyTransactions.forEach(t => {
            if (t.type === TransactionType.REPAYMENT) {
                dailyRepaymentsTotal += t.amount;
                if (t.paymentMethod === 'Cash') {
                    dailyRepaymentsBreakdown.cash += t.amount;
                } else {
                    dailyRepaymentsBreakdown.transfer += t.amount;
                }
            } else if (t.type === TransactionType.SAVINGS) {
                dailySavingsTotal += t.amount;
                if (t.paymentMethod === 'Cash') {
                    dailySavingsBreakdown.cash += t.amount;
                } else {
                    dailySavingsBreakdown.transfer += t.amount;
                }
            } else if (t.type === TransactionType.WITHDRAWAL) {
                dailySavingsTotal -= t.amount;
                 if (t.paymentMethod === 'Cash') {
                    dailySavingsBreakdown.cash -= t.amount;
                } else {
                    dailySavingsBreakdown.transfer -= t.amount;
                }
            }
        });

        const totalUangTotal = dailyRepaymentsTotal + dailySavingsTotal;
        const totalUangBreakdown = {
            cash: dailyRepaymentsBreakdown.cash + dailySavingsBreakdown.cash,
            transfer: dailyRepaymentsBreakdown.transfer + dailySavingsBreakdown.transfer,
        };
        
        return { 
            totalUang: totalUangTotal,
            dailyRepayments: dailyRepaymentsTotal,
            dailySavings: dailySavingsTotal,
            breakdowns: {
                totalUang: totalUangBreakdown,
                dailyRepayments: dailyRepaymentsBreakdown,
                dailySavings: dailySavingsBreakdown,
            }
        };
    }, [dailyTransactions]);
  
    const sortedDailyTransactions = useMemo(() => {
        return [...dailyTransactions]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [dailyTransactions]);

    // Logic for Missed Payments (Bolong)
    const missedActivities = useMemo(() => {
        const missed = [];
        const activeBorrowers = customers.filter(c => c.status === 'aktif' && c.role === 'borrower');
        
        // Helper to format YYYY-MM-DD locally
        const toLocalYMD = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        // Iterate through each day in the selected range
        let current = new Date(dateRange.start);
        current.setHours(0,0,0,0);
        const end = new Date(dateRange.end);
        end.setHours(0,0,0,0);
        
        while (current <= end) {
            const dayNum = current.getDay();
            const dateString = toLocalYMD(current);
            
            // Skip Sundays (0), Saturdays (6), and Holidays
            const isHoliday = holidays.includes(dateString);
            const isWeekend = dayNum === 0 || dayNum === 6;
            
            if (!isHoliday && !isWeekend) {
                const dateObj = new Date(current); // capture current state

                // Check each customer
                activeBorrowers.forEach(customer => {
                    // Must be after loan date (usually payment starts D+1)
                    const loanDate = new Date(customer.loanDate);
                    loanDate.setHours(0,0,0,0);

                    if (dateObj > loanDate) {
                        const hasPaid = dailyTransactions.some(t => 
                            t.customerId === customer.id && 
                            t.type === TransactionType.REPAYMENT &&
                            toLocalYMD(new Date(t.date)) === dateString
                        );

                        if (!hasPaid) {
                             const installment = customer.installments > 0 
                                ? (customer.loanAmount * (1 + customer.interestRate/100)) / customer.installments 
                                : 0;

                             missed.push({
                                 id: `missed-${customer.id}-${dateString}`,
                                 customer,
                                 date: dateObj,
                                 expectedAmount: installment
                             });
                        }
                    }
                });
            }
            current.setDate(current.getDate() + 1);
        }
        return missed.sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [customers, dailyTransactions, dateRange]);


    const getTransactionTitle = (t: Transaction) => {
        return customerMap.get(t.customerId)?.name || 'N/A';
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

    // Helper for dynamic font sizes
    const totalUangStr = formatCurrency(totalUang);
    const dailyRepaymentsStr = formatCurrency(dailyRepayments);
    const dailySavingsStr = formatCurrency(dailySavings);

    const headerFontSize = useMemo(() => {
        const len = totalUangStr.length;
        if (len > 16) return 'text-2xl'; 
        if (len > 13) return 'text-3xl'; 
        if (len > 10) return 'text-4xl'; 
        return 'text-5xl'; 
    }, [totalUangStr]);

    const getCardFontSize = (len: number) => {
        if (len > 16) return 'text-xl';
        if (len > 13) return 'text-2xl';
        if (len > 10) return 'text-3xl'; 
        return 'text-4xl';
    };

    const repaymentsFontSize = getCardFontSize(dailyRepaymentsStr.length);
    const savingsFontSize = getCardFontSize(dailySavingsStr.length);

    return (
        <div className="pb-24">
            {/* Header Section with Overlap Capability */}
            <div className="bg-black -mx-3 -mt-3 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8 px-6 pt-14 pb-28 relative z-0 shadow-2xl">
                <div className="flex justify-between items-start gap-6 mb-6">
                    <div className="flex flex-col flex-1">
                        <h1 className={`${headerFontSize} font-bold text-white tracking-tighter mb-2 transition-all duration-300`}>
                            {totalUangStr}
                        </h1>
                        <p className="text-white/80 text-xs font-bold tracking-widest uppercase">UANG MASUK</p>
                    </div>
                    
                    {/* Date Picker Button */}
                    <button 
                        onClick={() => setIsDatePickerOpen(true)}
                        className="bg-white rounded-xl w-14 h-14 flex flex-col items-center justify-center text-black hover:bg-gray-200 transition-all active:scale-95 shadow-lg flex-shrink-0"
                    >
                        <span className="text-[9px] uppercase font-bold text-gray-500 leading-none mb-0.5">
                            {dateRange.start.toLocaleDateString('id-ID', { month: 'short' }).toUpperCase()}
                        </span>
                        <span className="text-xl font-bold leading-none">
                            {dateRange.start.getDate()}
                        </span>
                    </button>
                </div>
                
                {/* Breakdown Section (Inside Header) */}
                <div className="text-sm space-y-3 px-1">
                    <div className="flex justify-between items-center border-b border-dashed border-gray-800 pb-3">
                        <span className="text-gray-400 font-medium">Cash</span>
                        <span className="font-bold text-white text-lg">{formatCurrency(breakdowns.totalUang.cash)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400 font-medium">Transfer</span>
                        <span className="font-bold text-white text-lg">{formatCurrency(breakdowns.totalUang.transfer)}</span>
                    </div>
                </div>
            </div>

            {/* Overlapping Cards Container */}
            <div className="px-1 -mt-24 relative z-10 space-y-4">
                
                {/* Uang Tagihan Card (Lime) */}
                <div className="bg-[#C7FF24] rounded-3xl p-5 shadow-[0_20px_40px_-15px_rgba(199,255,36,0.3)]">
                    <div className="flex justify-between items-start mb-2">
                        <p className={`${repaymentsFontSize} font-bold text-black tracking-tight transition-all duration-300`}>
                            {dailyRepaymentsStr}
                        </p>
                        <div className="w-10 h-10 rounded-full bg-black/10 flex items-center justify-center text-black self-start flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                        </div>
                    </div>
                    <h4 className="text-black/70 text-xs font-bold tracking-widest uppercase mb-4">UANG TAGIHAN</h4>
                    <div className="text-sm space-y-2">
                        <div className="flex justify-between items-center border-b border-dashed border-black/10 pb-2">
                            <span className="text-black/60 font-medium">Cash</span>
                            <span className="font-bold text-black text-base">{formatCurrency(breakdowns.dailyRepayments.cash)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-black/60 font-medium">Transfer</span>
                            <span className="font-bold text-black text-base">{formatCurrency(breakdowns.dailyRepayments.transfer)}</span>
                        </div>
                    </div>
                </div>

                {/* Uang Tabungan Card (Dark) */}
                <div className="bg-[#1B1B1B] rounded-3xl p-5 shadow-xl">
                    <div className="flex justify-between items-start mb-2">
                        <p className={`${savingsFontSize} font-bold text-white tracking-tight transition-all duration-300`}>
                            {dailySavingsStr}
                        </p>
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white self-start flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                            </svg>
                        </div>
                    </div>
                    <h4 className="text-gray-400 text-xs font-bold tracking-widest uppercase mb-4">UANG TABUNGAN</h4>
                    <div className="text-sm space-y-2">
                         <div className="flex justify-between items-center border-b border-dashed border-white/20 pb-2">
                            <span className="text-gray-500 font-medium">Cash</span>
                            <span className="font-bold text-white text-base">{formatCurrency(breakdowns.dailySavings.cash)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 font-medium">Transfer</span>
                            <span className="font-bold text-white text-base">{formatCurrency(breakdowns.dailySavings.transfer)}</span>
                        </div>
                    </div>
                </div>

            </div>

            {/* Recent Activity / Missed Payments Section */}
            <div className="pt-6 px-2">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-gray-900">
                            {viewMode === 'transactions' ? 'Aktivitas' : 'Belum Bayar'}
                        </h3>
                        {/* Switch Toggle */}
                        <div className="bg-gray-100 p-1 rounded-full flex items-center">
                            <button 
                                onClick={() => setViewMode('transactions')}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${viewMode === 'transactions' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}
                                title="Riwayat Transaksi"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </button>
                            <button 
                                onClick={() => setViewMode('missed')}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${viewMode === 'missed' ? 'bg-red-50 text-red-600 shadow-sm' : 'text-gray-400'}`}
                                title="Nasabah Bolong"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{activityTitleDate}</span>
                </div>
                
                <div className="bg-card shadow-sm rounded-3xl overflow-hidden border border-gray-100">
                    {viewMode === 'transactions' ? (
                        // EXISTING TRANSACTION LIST
                        sortedDailyTransactions.length > 0 ? (
                            sortedDailyTransactions.map((t, index) => {
                              const amountInfo = getTransactionAmount(t);
                              return (
                                <div key={t.id} className={`p-5 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors ${index !== sortedDailyTransactions.length - 1 ? 'border-b border-gray-100' : ''}`}>
                                    <div className="flex items-center flex-1 min-w-0">
                                        <TransactionIcon type={t.type} />
                                        <div className="ml-4 flex-1 min-w-0">
                                            <p className="font-bold text-gray-900 truncate">{getTransactionTitle(t)}</p>
                                            <p className="text-sm text-gray-500">
                                                {new Date(t.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} · {t.paymentMethod}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="font-light text-lg text-black">
                                        {formatCurrency(amountInfo.value, true)}
                                    </p>
                                </div>
                              );
                            })
                        ) : (
                            <div className="p-8 text-center text-gray-400 flex flex-col items-center justify-center space-y-4 min-h-[150px]">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <p>Tidak ada aktivitas.</p>
                            </div>
                        )
                    ) : (
                        // MISSED PAYMENTS LIST
                        missedActivities.length > 0 ? (
                            missedActivities.map((item, index) => (
                                <div key={item.id} className={`p-5 flex items-center justify-between gap-4 hover:bg-red-50/30 transition-colors ${index !== missedActivities.length - 1 ? 'border-b border-gray-100' : ''}`}>
                                    <div className="flex items-center flex-1 min-w-0">
                                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </div>
                                        <div className="ml-4 flex-1 min-w-0">
                                            <p className="font-bold text-gray-900 truncate">{item.customer.name}</p>
                                            <p className="text-xs font-medium text-gray-500">{item.customer.location}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-light text-lg text-red-600">
                                            {item.expectedAmount > 0 ? formatCurrency(item.expectedAmount) : 'Rp 0'}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {item.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-gray-400 flex flex-col items-center justify-center space-y-4 min-h-[150px]">
                                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <p>Semua nasabah aktif sudah bayar!</p>
                            </div>
                        )
                    )}
                </div>
            </div>

            <Modal isOpen={isTransactionModalOpen} onClose={() => setIsTransactionModalOpen(false)} title="Tambah Transaksi Baru">
                <TransactionForm customers={customers} onSubmit={handleAddTransaction} onCancel={() => setIsTransactionModalOpen(false)} />
            </Modal>
            
            <DateRangePickerModal
                isOpen={isDatePickerOpen}
                onClose={() => setIsDatePickerOpen(false)}
                currentRange={dateRange}
                onApply={setDateRange}
            />
        </div>
    );
};

export default Dashboard;
