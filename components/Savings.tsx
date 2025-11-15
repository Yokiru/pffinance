
import React, { useMemo } from 'react';
import { Customer, Transaction, TransactionType } from '../types';
import { formatCurrency } from '../utils/formatters';

interface SavingsProps {
  transactions: Transaction[];
  customerMap: Map<string, Customer>;
  onSaverSelect: (customer: Customer) => void;
}

const Savings: React.FC<SavingsProps> = ({ transactions, customerMap, onSaverSelect }) => {
  const { totalSavings, savers } = useMemo(() => {
    const savingsByCustomer = new Map<string, number>();
    
    // Calculate balance based on transactions
    transactions.forEach(t => {
        const currentBalance = savingsByCustomer.get(t.customerId) || 0;
        if (t.type === TransactionType.SAVINGS) {
            savingsByCustomer.set(t.customerId, currentBalance + t.amount);
        } else if (t.type === TransactionType.WITHDRAWAL) {
            savingsByCustomer.set(t.customerId, currentBalance - t.amount);
        }
    });

    // Create list but ONLY include customers who are explicitly 'savers' or have specific saving activity
    const saverList = Array.from(savingsByCustomer.entries()).map(([customerId, totalAmount]) => {
        return {
            customer: customerMap.get(customerId)!,
            totalSavings: totalAmount,
        };
    }).filter(item => 
        item.customer && 
        item.customer.role === 'saver' && // Only show explicit savers
        item.totalSavings >= 0 // Show even if 0 balance, but not negative (sanity check)
    ).sort((a, b) => a.customer.name.localeCompare(b.customer.name)); 

    // Calculate total of displayed savers only
    const total = saverList.reduce((sum, item) => sum + item.totalSavings, 0);

    return {
      totalSavings: total,
      savers: saverList
    };
  }, [transactions, customerMap]);


  return (
    <div className="space-y-6">
      <div className="bg-[#C7FF24] shadow-sm rounded-2xl p-6 text-center">
        <h4 className="text-black text-sm font-medium mb-2">Total Semua Tabungan</h4>
        <p className="text-4xl font-bold text-black">{formatCurrency(totalSavings)}</p>
      </div>

      <div className="space-y-3">
        {savers.length > 0 ? (
          savers.map(saver => (
            <button key={saver.customer.id} onClick={() => onSaverSelect(saver.customer)} className="w-full text-left bg-card shadow-sm border border-gray-100 rounded-2xl p-3 flex items-center gap-3 transition-all hover:shadow-md hover:-translate-y-0.5">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 flex-shrink-0">
                <span className="text-xl font-bold text-gray-700">{saver.customer.name[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base text-gray-900 truncate">{saver.customer.name}</p>
                {saver.customer.phone && (
                     <p className="text-xs font-medium text-gray-400">{saver.customer.phone}</p>
                )}
              </div>
              <div className="text-right flex flex-col items-end">
                <p className="font-normal text-lg text-gray-900">{formatCurrency(saver.totalSavings)}</p>
                <p className="text-xs font-medium text-gray-500">{saver.customer.location}</p>
              </div>
            </button>
          ))
        ) : (
          <div className="bg-card shadow-sm border border-gray-100 rounded-2xl p-6 text-center text-gray-400 flex flex-col items-center justify-center space-y-4 min-h-[150px]">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5v9a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 16.5v-9A2.25 2.25 0 015.25 5.25h13.5A2.25 2.25 0 0121 7.5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5h4.5a1.5 1.5 0 011.5 1.5v.75a1.5 1.5 0 01-1.5 1.5H15V10.5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12a.75.75 0 110 1.5.75.75 0 010-1.5z" />
             </svg>
            <p>Belum ada penabung.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Savings;
