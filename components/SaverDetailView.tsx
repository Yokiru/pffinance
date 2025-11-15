
import React, { useMemo } from 'react';
import { Customer, Transaction, TransactionType } from '../types';
import { formatCurrency } from '../utils/formatters';
import { TransactionIcon } from './TransactionIcon';

interface SaverDetailViewProps {
  customer: Customer;
  transactions: Transaction[];
  onClose: () => void;
  onEditTransactionClick: (transaction: Transaction) => void;
  onDeleteTransactionClick: (transaction: Transaction) => void;
  onWithdrawClick: (customer: Customer) => void;
  onDeleteClick: () => void;
}

const BentoCard: React.FC<{ children: React.ReactNode; className?: string; span?: string; onClick?: () => void }> = ({ children, className = '', span = 'col-span-4', onClick }) => (
    <div 
        onClick={onClick}
        className={`shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100 rounded-2xl p-5 flex flex-col justify-center ${span} ${className.includes('bg-') ? '' : 'bg-card'} ${className} ${onClick ? 'cursor-pointer active:scale-95 transition-transform' : ''}`}
    >
        {children}
    </div>
);

const SaverDetailView: React.FC<SaverDetailViewProps> = ({ customer, transactions, onClose, onEditTransactionClick, onDeleteTransactionClick, onWithdrawClick, onDeleteClick }) => {
    
    const { savingsTransactions, totalSavings, totalWithdrawals, totalDeposits, avgDeposit, firstDate, lastDate } = useMemo(() => {
        const filtered = transactions
            .filter(t => t.customerId === customer.id && (t.type === TransactionType.SAVINGS || t.type === TransactionType.WITHDRAWAL))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        let currentTotal = 0;
        let withdrawalTotal = 0;
        let depositTotal = 0;
        let depositCount = 0;

        filtered.forEach(t => {
            if (t.type === TransactionType.SAVINGS) {
                currentTotal += t.amount;
                depositTotal += t.amount;
                depositCount++;
            } else if (t.type === TransactionType.WITHDRAWAL) {
                currentTotal -= t.amount;
                withdrawalTotal += t.amount;
            }
        });

        return { 
            savingsTransactions: filtered, 
            totalSavings: currentTotal,
            totalWithdrawals: withdrawalTotal,
            totalDeposits: depositTotal,
            avgDeposit: depositCount > 0 ? depositTotal / depositCount : 0,
            firstDate: filtered.length > 0 ? filtered[filtered.length - 1].date : null,
            lastDate: filtered.length > 0 ? filtered[0].date : null
        };
    }, [transactions, customer.id]);

    const getTransactionTitle = (t: Transaction) => {
        return t.type === TransactionType.SAVINGS ? 'Simpanan' : 'Penarikan';
    };

    const getTransactionAmount = (t: Transaction) => {
      return t.type === TransactionType.SAVINGS 
        ? { value: t.amount, color: 'text-accent-green' }
        : { value: -t.amount, color: 'text-accent-red' };
    };
    
    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    return (
        <div className="relative flex flex-col h-full text-gray-900 overflow-hidden bg-app-bg">
             {/* Simple Header */}
            <header className="bg-app-bg/80 backdrop-blur-md p-4 flex items-center justify-center z-10 sticky top-0">
                <h2 className="text-lg font-bold text-center">Detail Penabung</h2>
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
                                            <span>Penabung</span>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={onDeleteClick} 
                                    className="w-10 h-10 flex items-center justify-center rounded-full border border-red-100 bg-red-50 hover:bg-red-100 transition-colors text-red-500"
                                    title="Hapus Penabung"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </BentoCard>

                        {/* Total Savings (Prominent) */}
                        <BentoCard span="col-span-2" className="bg-[#C7FF24] border-none">
                            <p className="text-xs text-black mb-1">Total Tabungan</p>
                            <p className="text-xl font-semibold text-black truncate">{formatCurrency(totalSavings)}</p>
                        </BentoCard>

                        {/* Total Withdrawn */}
                        <BentoCard span="col-span-2" className="bg-[#050505] border-none">
                            <p className="text-xs text-gray-400 mb-1">Total Penarikan</p>
                            <p className="text-xl font-semibold text-white truncate">{formatCurrency(totalWithdrawals)}</p>
                        </BentoCard>

                        {/* Action: Withdraw */}
                        <BentoCard span="col-span-4" onClick={() => onWithdrawClick(customer)} className="group hover:bg-red-50 transition-colors cursor-pointer border-red-100">
                            <div className="flex flex-col items-center justify-center h-full">
                                <div className="flex items-center gap-2 text-red-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <span className="font-bold text-sm">Tarik Tunai</span>
                                </div>
                            </div>
                        </BentoCard>

                        {/* Savings Summary Grid */}
                        <BentoCard span="col-span-4">
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-gray-400">Total Setoran</p>
                                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(totalDeposits)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Rata-rata Setor</p>
                                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(avgDeposit)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Transaksi Terakhir</p>
                                    <p className="text-sm font-semibold text-gray-900">{formatDate(lastDate)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Mulai Menabung</p>
                                    <p className="text-sm font-semibold text-gray-900">{formatDate(firstDate || customer.loanDate)}</p>
                                </div>
                             </div>
                        </BentoCard>

                    </div>

                    {/* History Section */}
                    <div className="pt-2">
                        <div className="bg-card shadow-sm rounded-2xl overflow-hidden border border-gray-100">
                             <div className="p-5 border-b border-gray-100">
                                <h3 className="text-lg font-bold text-gray-900">Riwayat Tabungan</h3>
                            </div>
                        
                            <div>
                                {savingsTransactions.length > 0 ? (
                                    savingsTransactions.map((t, index) => {
                                        const amountInfo = getTransactionAmount(t);
                                        return (
                                            <div key={t.id} className={`group p-5 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors ${index !== savingsTransactions.length - 1 ? 'border-b border-gray-100' : ''}`}>
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
                                                    <p className={`font-light text-lg transition-opacity duration-200 group-hover:opacity-0 ${t.type === TransactionType.WITHDRAWAL ? 'text-red-600' : 'text-black'}`}>
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
                                        <p>Belum ada riwayat tabungan.</p>
                                    </div>
                                )}
                            </div>
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

export default SaverDetailView;
