import React, { useMemo, useState } from 'react';
import { Customer, Transaction, TransactionType } from '../types';
import { DateRange } from '../App';
import Modal from './Modal';
import TransactionForm from './TransactionForm';
import { formatCurrency } from '../utils/formatters';
import { TransactionIcon } from './TransactionIcon';
import DateRangePickerModal from './DateRangePickerModal';
import HolidayPickerModal from './HolidayPickerModal';
import { isDateHoliday } from '../utils/holidays';

interface DashboardProps {
  customers: Customer[];
  dailyTransactions: Transaction[];
  allTransactions: Transaction[];
  customerMap: Map<string, Customer>;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  customHolidays: string[];
  setCustomHolidays: (holidays: string[]) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ customers, dailyTransactions, customerMap, dateRange, setDateRange, addTransaction, customHolidays, setCustomHolidays }) => {
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [isHolidayPickerOpen, setIsHolidayPickerOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'transactions' | 'missed'>('transactions');

    const handleAddTransaction = (transactionData: Omit<Transaction, 'id'>) => {
        addTransaction(transactionData);
        setIsTransactionModalOpen(false);
    };

    const handleOpenHolidayPicker = () => {
        setIsDatePickerOpen(false);
        // Small delay to allow the first modal to close smoothly before the next opens
        setTimeout(() => setIsHolidayPickerOpen(true), 200);
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

    const { totalUang, dailyRepayments, dailySavings, breakdowns, savingsCardTotal, totalOutflow } = useMemo(() => {
        // 1. Repayments (Uang Tagihan)
        let dailyRepaymentsTotal = 0;
        const dailyRepaymentsBreakdown = { cash: 0, transfer: 0 };

        // 2. Savings (Tabungan)
        // We track Inflow for the card, and Net Flow for the "Total Uang" calculation
        const dailySavingsFlow = {
            inCash: 0,
            inTransfer: 0,
            outCash: 0, // Withdrawals taken from daily collection
            outTransfer: 0 // Withdrawals taken from reserve/transfer
        };

        // 3. Outflow Breakdown (Structured by Type -> Source)
        const outflowBreakdown = {
            loans: {
                potongTagihan: 0, // Reduces daily cash
                ambilKas: 0       // From reserve/transfer (doesn't reduce daily cash)
            },
            withdrawals: {
                potongTagihan: 0, // Reduces daily cash (Cash withdrawal)
                ambilKas: 0       // From reserve/transfer (Transfer withdrawal)
            }
        };

        dailyTransactions.forEach(t => {
            if (t.type === TransactionType.REPAYMENT) {
                dailyRepaymentsTotal += t.amount;
                if (t.paymentMethod === 'Cash') {
                    dailyRepaymentsBreakdown.cash += t.amount;
                } else {
                    dailyRepaymentsBreakdown.transfer += t.amount;
                }
            } 
            else if (t.type === TransactionType.SAVINGS) {
                if (t.paymentMethod === 'Cash') {
                    dailySavingsFlow.inCash += t.amount;
                } else {
                    dailySavingsFlow.inTransfer += t.amount;
                }
            } 
            else if (t.type === TransactionType.WITHDRAWAL) {
                 // Corrected Logic: Withdrawals use 'Potong Tagihan' for daily cash and 'Ambil Kas' for reserve.
                 if (t.paymentMethod === 'Potong Tagihan') {
                    dailySavingsFlow.outCash += t.amount;
                    outflowBreakdown.withdrawals.potongTagihan += t.amount;
                } else { // This handles 'Ambil Kas'
                    dailySavingsFlow.outTransfer += t.amount;
                    outflowBreakdown.withdrawals.ambilKas += t.amount;
                }
            } 
            else if (t.type === TransactionType.LOAN) {
                if (t.paymentMethod === 'Potong Tagihan') {
                    outflowBreakdown.loans.potongTagihan += t.amount;
                } else {
                    // Ambil Kas, Transfer, or generic Cash (treated as Reserve/Capital for loans usually)
                    outflowBreakdown.loans.ambilKas += t.amount;
                }
            }
        });

        // --- CALCULATIONS ---

        // Total Uang Calculation (The big number at the top)
        // Formula: (Repayments Cash + Savings In Cash) - (Loans Potong Tagihan + Withdrawals Potong Tagihan)
        const totalUangCash = 
            (dailyRepaymentsBreakdown.cash + dailySavingsFlow.inCash) - 
            (outflowBreakdown.loans.potongTagihan + outflowBreakdown.withdrawals.potongTagihan);
        
        const totalUangTransfer = 
            (dailyRepaymentsBreakdown.transfer + dailySavingsFlow.inTransfer); 
            // Note: We generally don't subtract outflows from "Total Uang" transfer part 
            // because "Total Uang" usually represents "Cash in Hand" + "Income via Transfer".
            // Expenses via transfer are just recorded, they don't "reduce" the incoming transfer log usually.
            // But strictly speaking, Net Transfer would be In - Out. 
            // For this dashboard, let's keep Transfer as "Income via Transfer" for simplicity, 
            // or Net if requested. Let's stick to Income for Transfer to match "Total Uang" concept.

        const totalUangTotal = totalUangCash + totalUangTransfer;
        
        const totalUangBreakdown = {
            cash: totalUangCash,
            transfer: totalUangTransfer,
        };
        
        // Savings Card Total (Only Inflow)
        const dailySavingsTotal = dailySavingsFlow.inCash + dailySavingsFlow.inTransfer; // Used for "Uang Masuk" logic
        const savingsCardTotal = dailySavingsTotal;
        
        // Total Outflow Card
        const totalLoans = outflowBreakdown.loans.potongTagihan + outflowBreakdown.loans.ambilKas;
        const totalWithdrawals = outflowBreakdown.withdrawals.potongTagihan + outflowBreakdown.withdrawals.ambilKas;
        const totalOutflowVal = totalLoans + totalWithdrawals;

        return { 
            totalUang: totalUangTotal,
            dailyRepayments: dailyRepaymentsTotal,
            dailySavings: dailySavingsTotal, 
            savingsCardTotal,
            totalOutflow: totalOutflowVal,
            breakdowns: {
                totalUang: totalUangBreakdown,
                dailyRepayments: dailyRepaymentsBreakdown,
                dailySavingsFlow: dailySavingsFlow,
                outflow: outflowBreakdown
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
            
            // Skip Sundays (0) and Holidays (Static + Custom). Saturday (6) is now a working day.
            const isHoliday = isDateHoliday(dateString, customHolidays);
            const isWeekend = dayNum === 0;
            
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
    }, [customers, dailyTransactions, dateRange, customHolidays]);


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
    const dailySavingsStr = formatCurrency(savingsCardTotal); 
    const totalOutflowStr = formatCurrency(totalOutflow);

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
    const outflowFontSize = getCardFontSize(totalOutflowStr.length);

    return (
        <div className="pb-24">
            {/* Header Section with Overlap Capability */}
            <div className="bg-black -mx-3 -mt-3 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8 px-6 pt-14 pb-28 relative z-0 shadow-2xl">
                <div className="flex justify-between items-start gap-6 mb-4">
                    <div className="flex flex-col flex-1">
                        <h1 className={`${headerFontSize} font-bold text-white tracking-tight mb-2 transition-all duration-300 leading-none`}>
                            {totalUangStr}
                        </h1>
                        <p className="text-white/80 text-xs font-bold tracking-widest uppercase">TOTAL UANG</p>
                    </div>
                    
                    <div className="flex flex-col gap-2">
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
                </div>
                
                {/* Breakdown Section (Inside Header) */}
                <div className="text-sm space-y-2 px-1 pb-2">
                    <div className="flex justify-between items-center border-b border-dashed border-gray-800 pb-2">
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
                            {/* Standard icon size for cards: w-5 h-5 or w-6 h-6 */}
                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" className="w-6 h-6">
                                <path d="M808.31-407.54 569.69-168.92q-2.97 2.92-6.69 4.38t-7.69 1.46h-12.23q-4.31 0-7.54-3.23-3.23-3.23-3.23-7.54v-12.23q0-3.97 1.46-7.69t4.38-6.69l238.62-238.62 31.54 31.54ZM120-304.62v-350.76q0-26.66 18.98-45.64T184.62-720h590.76q26.66 0 45.64 18.98T840-655.38v13.07q0 17.16-7.77 29.35-7.77 12.19-23 24.5h-1.61q-3.7 0-7.04 1.38-3.35 1.39-5.89 3.93l-144 144q-8.69 8.69-20.71 13.92-12.02 5.23-25.29 5.23H280q-8.5 0-14.25 5.76T260-399.97q0 8.51 5.75 14.24T280-380h272.77q10.86 0 14.74 10.08 3.87 10.07-3.82 17.77l-93 93q-8.69 8.69-20.71 13.92-12.02 5.23-25.29 5.23H184.62q-26.66 0-45.64-18.98T120-304.62ZM280-540h160q8.5 0 14.25-5.76t5.75-14.27q0-8.51-5.75-14.24T440-580H280q-8.5 0-14.25 5.76T260-559.97q0 8.51 5.75 14.24T280-540Zm550.77 108.46-31.54-31.54 31.3-31.27q4.35-4.34 9.56-4.34 5.22 0 9.45 4.23l12.61 12.61q4.23 4.33 4.23 9.51 0 5.19-4.34 9.53l-31.27 31.27Z"/>
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
                <div className="bg-[#1B1B1B] rounded-3xl p-5 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]">
                    <div className="flex justify-between items-start mb-2">
                        <p className={`${savingsFontSize} font-bold text-white tracking-tight transition-all duration-300`}>
                            {dailySavingsStr}
                        </p>
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white self-start flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
                        </div>
                    </div>
                    <h4 className="text-gray-500 text-xs font-bold tracking-widest uppercase mb-4">UANG TABUNGAN (MASUK)</h4>
                    <div className="text-sm space-y-2">
                         <div className="flex justify-between items-center border-b border-dashed border-white/10 pb-2">
                            <span className="text-gray-400 font-medium">Cash</span>
                            <span className="font-bold text-gray-400 text-base">{formatCurrency(breakdowns.dailySavingsFlow.inCash)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400 font-medium">Transfer</span>
                            <span className="font-bold text-gray-400 text-base">{formatCurrency(breakdowns.dailySavingsFlow.inTransfer)}</span>
                        </div>
                    </div>
                </div>

                 {/* Uang Keluar Unified Card (Purple) - UPDATED STRUCTURE */}
                 <div className="bg-[#E0C6FF] rounded-3xl p-5 shadow-[0_20px_40px_-15px_rgba(196,181,253,0.3)]">
                    <div className="flex justify-between items-start mb-2">
                        <p className={`${outflowFontSize} font-bold text-black tracking-tight transition-all duration-300`}>
                            {totalOutflowStr}
                        </p>
                        <div className="w-10 h-10 rounded-full bg-black/10 flex items-center justify-center text-black self-start flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" className="w-6 h-6">
                                <path d="M160-161.85v-652.61q0-5.46 4.46-7.19 4.46-1.73 8.69.96l28.23 21.31q4.47 2.92 9.39 2.92 4.92 0 9.38-2.92l35.08-24.31q4.46-2.93 9.39-2.93 4.92 0 9.38 2.93l35.08 24.31q4.46 2.92 9.38 2.92 4.93 0 9.39-2.92l35.08-24.31q4.46-2.93 9.38-2.93 4.92 0 9.38 2.93l35.08 24.31q4.46 2.92 9.39 2.92 4.92 0 9.38-2.92l35.08-24.31q4.46-2.93 9.38-2.93 4.93 0 9.39 2.93l35.07 24.31q4.47-2.92 9.39-2.92 4.92 0 9.38-2.92L686-823.69q4.46-2.93 9.38-2.93 4.93 0 9.39 2.93l35.08 24.31q4.46 2.92 9.38 2.92 4.92 0 9.39-2.92l28.23-21.31q4.23-2.69 8.69-.96 4.46 1.73 4.46 7.19v652.61q0 10.16-8.54 14.39t-17-1.92l-15.84-11.24q-4.47-2.92-9.39-2.92-4.92 0-9.38 2.92l-35.08 24.31q-4.46 2.93-9.39 2.93-4.92 0-9.38 2.93l-35.08-24.31q-4.46-2.92-9.38-2.92-4.92 0-9.39 2.92l-35.07 24.31q-4.46 2.93-9.39 2.93-4.92 0-9.38-2.92l-35.08-24.31q-4.46-2.92-9.39-2.92-4.92 0-9.38-2.92l-35.08-24.31q-4.46-2.93 9.38-2.93 4.93 0 9.39 2.93l35.07 24.31q4.47-2.92 9.39-2.92 4.92 0 9.38-2.92L274-136.31q-4.46 2.93-9.38 2.93-4.93 0-9.39-2.93l-35.08-24.31q-4.46-2.92-9.38-2.92-4.92 0-9.39 2.92l-15.84 11.24q-8.46 6.15-17 1.92T160-161.85Zm120-162.77h400q8.54 0 14.27-5.73t5.73-14.27q0-8.53-5.73-14.26-5.73-5.74-14.27-5.74H280q-8.54 0-14.27 5.74-5.73 5.73-5.73 14.26 0 8.54 5.73 14.27t14.27 5.73ZM280-460h400q8.54 0 14.27-5.73T700-480q0-8.54-5.73-14.27T680-500H280q-8.54 0-14.27 5.73T260-480q0 8.54 5.73 14.27T280-460Zm0-135.38h400q8.54 0 14.27-5.74 5.73-5.73 5.73-14.26 0-8.54-5.73-14.27T680-635.38H280q-8.54 0-14.27 5.73T260-615.38q0 8.53 5.73 14.26 5.73 5.74 14.27 5.74Z"/>
                            </svg>
                        </div>
                    </div>
                    <h4 className="text-black/70 text-xs font-bold tracking-widest uppercase mb-4">TOTAL UANG KELUAR</h4>
                    
                    <div className="text-sm space-y-4">
                        {/* SECTION 1: PINJAMAN */}
                        <div>
                            <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest mb-1">PINJAMAN</p>
                            <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <span className="text-black/60 font-medium">Potong Tagihan</span>
                                    <span className="font-bold text-black text-base">{formatCurrency(breakdowns.outflow.loans.potongTagihan)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-black/60 font-medium">Ambil Kas</span>
                                    <span className="font-bold text-black text-base">{formatCurrency(breakdowns.outflow.loans.ambilKas)}</span>
                                </div>
                            </div>
                        </div>

                         {/* Divider */}
                        <div className="border-b border-dashed border-black/10"></div>

                        {/* SECTION 2: TARIK TABUNGAN */}
                        <div>
                             <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest mb-1">TARIK TABUNGAN</p>
                             <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <span className="text-black/60 font-medium">Potong Tagihan</span>
                                    <span className="font-bold text-black text-base">{formatCurrency(breakdowns.outflow.withdrawals.potongTagihan)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-black/60 font-medium">Ambil Kas</span>
                                    <span className="font-bold text-black text-base">{formatCurrency(breakdowns.outflow.withdrawals.ambilKas)}</span>
                                </div>
                            </div>
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
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
                                    {/* Enlarged Empty State Icon */}
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
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
                                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center">
                                     {/* Enlarged Empty State Icon */}
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
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
                onManageHolidays={handleOpenHolidayPicker}
            />

            <HolidayPickerModal
                isOpen={isHolidayPickerOpen}
                onClose={() => setIsHolidayPickerOpen(false)}
                customHolidays={customHolidays}
                onUpdateHolidays={setCustomHolidays}
            />
        </div>
    );
};

export default Dashboard;