
import React, { useMemo, useState } from 'react';
import { Customer, Transaction, TransactionType } from '../types';
import { DateRange } from '../App';
import Modal from './Modal';
import TransactionForm from './TransactionForm';
import { formatCurrency } from '../utils/formatters';
import { TransactionIcon } from './TransactionIcon';
import DateRangePickerModal from './DateRangePickerModal';

interface DashboardProps {
  customers: Customer[];
  dailyTransactions: Transaction[];
  allTransactions: Transaction[];
  customerMap: Map<string, Customer>;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
}

const StatCard: React.FC<{
    title: string;
    totalAmount: number;
    cashAmount: number;
    transferAmount: number;
    className?: string;
    textColor?: string;
    labelColor?: string;
    subLabelColor?: string;
}> = ({ 
    title, 
    totalAmount, 
    cashAmount, 
    transferAmount, 
    className = "bg-white", 
    textColor = "text-gray-900",
    labelColor,
    subLabelColor,
}) => {
    // Use solid colors for sharpness instead of opacity
    const effectiveLabelColor = labelColor || (textColor === "text-white" ? "text-gray-400" : "text-gray-600");
    const effectiveSubLabelColor = subLabelColor || (textColor === "text-white" ? "text-gray-400" : "text-gray-600");

    return (
        <div className={`${className} shadow-sm rounded-3xl p-6`}>
            <h4 className={`${effectiveLabelColor} text-sm font-light mb-2`}>{title}</h4>
            <p className={`text-3xl font-semibold ${textColor} mb-6`}>{formatCurrency(totalAmount)}</p>
            <div className={`${textColor} text-sm space-y-1`}>
                <div className="flex justify-between">
                    <span className={effectiveSubLabelColor}>Cash</span>
                    <span className="font-semibold">{formatCurrency(cashAmount)}</span>
                </div>
                <div className="flex justify-between">
                    <span className={effectiveSubLabelColor}>Transfer</span>
                    <span className="font-semibold">{formatCurrency(transferAmount)}</span>
                </div>
            </div>
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ customers, dailyTransactions, customerMap, dateRange, setDateRange, addTransaction }) => {
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    const handleAddTransaction = (transactionData: Omit<Transaction, 'id'>) => {
        addTransaction(transactionData);
        setIsTransactionModalOpen(false);
    };
    
    const displayedDate = useMemo(() => {
        const { start, end } = dateRange;
        const today = new Date();
        const isToday = today.toDateString() === start.toDateString() && today.toDateString() === end.toDateString();
        const isSingleDay = start.toDateString() === end.toDateString();

        if (isSingleDay) {
            const prefix = isToday ? 'Hari Ini: ' : '';
            return prefix + start.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        }
        
        return `${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
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
  
    const sortedDailyTransactions = [...dailyTransactions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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

    return (
        <div className="space-y-8">
            <div className="flex justify-center">
                <button 
                    onClick={() => setIsDatePickerOpen(true)}
                    className="flex items-center bg-white shadow-sm py-2 px-5 rounded-full text-gray-900 hover:bg-gray-50 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span className="font-medium">{displayedDate}</span>
                </button>
            </div>
      
            <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-3">
                <StatCard 
                    title="Total Uang" 
                    totalAmount={totalUang} 
                    cashAmount={breakdowns.totalUang.cash} 
                    transferAmount={breakdowns.totalUang.transfer}
                    className="bg-[#C7FF24]"
                    labelColor="text-black"
                    subLabelColor="text-black"
                />
                <StatCard 
                    title="Uang Tagihan" 
                    totalAmount={dailyRepayments} 
                    cashAmount={breakdowns.dailyRepayments.cash} 
                    transferAmount={breakdowns.dailyRepayments.transfer}
                    className="bg-[#1B1B1B]"
                    textColor="text-white"
                    labelColor="text-white"
                />
                <StatCard 
                    title="Uang Tabungan" 
                    totalAmount={dailySavings} 
                    cashAmount={breakdowns.dailySavings.cash} 
                    transferAmount={breakdowns.dailySavings.transfer}
                    className="bg-white"
                    labelColor="text-black"
                    subLabelColor="text-black"
                />
            </div>

            <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Aktivitas pada {activityTitleDate}</h3>
                
                <div className="bg-white shadow-sm rounded-3xl overflow-hidden">
                    {sortedDailyTransactions.length > 0 ? (
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
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p>Tidak ada aktivitas pada tanggal ini.</p>
                        </div>
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
