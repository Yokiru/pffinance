
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Customer, Transaction, TransactionType } from '../types';
import { formatCurrency } from '../utils/formatters';

interface CustomersProps {
  customers: Customer[];
  transactions: Transaction[];
  onCustomerSelect: (customer: Customer) => void;
}

const sortOptions = [
    { id: 'name-asc', label: 'Nama (A-Z)' },
    { id: 'name-desc', label: 'Nama (Z-A)' },
    { id: 'loan-desc', label: 'Total Pinjaman (Terbesar)' },
    { id: 'loan-asc', label: 'Total Pinjaman (Terkecil)' },
    { id: 'remaining-desc', label: 'Sisa Tagihan (Terbesar)' },
    { id: 'remaining-asc', label: 'Sisa Tagihan (Terkecil)' },
];

const Customers: React.FC<CustomersProps> = ({ customers, transactions, onCustomerSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('Semua');
  const [sortOption, setSortOption] = useState('name-asc');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  const locations = ['Semua', 'Depan', 'Belakang', 'Kiri', 'Kanan', 'Luar'];
  
  const customersWithLoanInfo = useMemo(() => {
    const transactionsByCustomer = new Map<string, number>();
    const paidTodayAmountByCustomer = new Map<string, number>();
    
    // Helper to ensure accurate local date comparison (YYYY-MM-DD)
    const toLocalYMD = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    
    const todayStr = toLocalYMD(new Date());
    const checkIsToday = (dateStr: string) => {
        return toLocalYMD(new Date(dateStr)) === todayStr;
    };

    const paidTodayIds = new Set<string>();
    const loanedTodayIds = new Set<string>();

    transactions.forEach(t => {
      if (t.type === TransactionType.REPAYMENT) {
        transactionsByCustomer.set(t.customerId, (transactionsByCustomer.get(t.customerId) || 0) + t.amount);
        
        if (checkIsToday(t.date)) {
            paidTodayIds.add(t.customerId);
            paidTodayAmountByCustomer.set(t.customerId, (paidTodayAmountByCustomer.get(t.customerId) || 0) + t.amount);
        }
      } else if (t.type === TransactionType.LOAN) {
        if (checkIsToday(t.date)) {
            loanedTodayIds.add(t.customerId);
        }
      }
    });

    return customers.map(customer => {
      const totalRepayments = transactionsByCustomer.get(customer.id) || 0;
      const totalLoanWithInterest = customer.loanAmount * (1 + customer.interestRate / 100);
      const remainingLoan = totalLoanWithInterest - totalRepayments;

      const isPaidOff = remainingLoan <= 0;

      // Check if they have a LOAN transaction today OR if their profile loanDate is today (for new customers)
      const hasLoanedToday = loanedTodayIds.has(customer.id) || customer.loanDate === todayStr;

      return {
        ...customer,
        status: (isPaidOff ? 'lunas' : 'aktif') as Customer['status'],
        remainingLoan: Math.max(0, remainingLoan),
        totalLoanWithInterest,
        hasPaidToday: paidTodayIds.has(customer.id),
        amountPaidToday: paidTodayAmountByCustomer.get(customer.id) || 0,
        hasLoanedToday: hasLoanedToday
      };
    });
  }, [customers, transactions]);


  const filteredCustomers = useMemo(() => {
    let filtered = [...customersWithLoanInfo]; // Create a mutable copy

    if (searchQuery) {
      filtered = filtered.filter(customer =>
        customer.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedLocation !== 'Semua') {
      filtered = filtered.filter(customer =>
        customer.location.toLowerCase() === selectedLocation.toLowerCase()
      );
    }
    
    // Sorting logic
    filtered.sort((a, b) => {
        switch (sortOption) {
            case 'name-asc':
                return a.name.localeCompare(b.name);
            case 'name-desc':
                return b.name.localeCompare(a.name);
            case 'loan-asc':
                return a.totalLoanWithInterest - b.totalLoanWithInterest;
            case 'loan-desc':
                return b.totalLoanWithInterest - a.totalLoanWithInterest;
            case 'remaining-asc':
                return a.remainingLoan - b.remainingLoan;
            case 'remaining-desc':
                return b.remainingLoan - a.remainingLoan;
            default:
                return 0;
        }
    });

    return filtered;
  }, [customersWithLoanInfo, searchQuery, selectedLocation, sortOption]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setIsSortMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [sortMenuRef]);


  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Cari nama nasabah..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card shadow-sm border border-gray-100 rounded-full py-3 pl-11 pr-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
          <div className="relative" ref={sortMenuRef}>
            <button 
                onClick={() => setIsSortMenuOpen(prev => !prev)}
                className="w-12 h-12 flex-shrink-0 bg-card shadow-sm border border-gray-100 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors"
                aria-label="Urutkan nasabah"
                title="Urutkan"
            >
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" className="h-6 w-6 text-gray-700">
                    <path d="M120-240v-80h240v80H120Zm0-200v-80h480v80H120Zm0-200v-80h720v80H120Z"/>
                </svg>
            </button>
            {isSortMenuOpen && (
                <div className="absolute right-0 top-14 mt-1 w-56 bg-card border border-gray-100 rounded-xl shadow-xl z-20 overflow-hidden animate-fadeInUp" style={{animationDuration: '200ms'}}>
                    <div className="p-1">
                        {sortOptions.map(option => (
                            <button
                                key={option.id}
                                onClick={() => {
                                    setSortOption(option.id);
                                    setIsSortMenuOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-sm transition-colors rounded-lg ${
                                    sortOption === option.id 
                                    ? 'bg-[#C7FF24] text-black' 
                                    : 'text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
          {locations.map(location => (
            <button
              key={location}
              onClick={() => setSelectedLocation(location)}
              className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-300 border flex-shrink-0 ${
                selectedLocation === location
                  ? 'bg-[#C7FF24] text-black border-transparent shadow-md'
                  : 'bg-card border-gray-100 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {location}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredCustomers.length > 0 ? (
          filteredCustomers.map(customer => (
            <button key={customer.id} onClick={() => onCustomerSelect(customer)} className="relative w-full text-left bg-card shadow-sm border border-gray-100 rounded-2xl p-3 flex items-center gap-3 transition-all hover:shadow-md hover:-translate-y-0.5">
              
              {/* Status Indicators: Top Right Corner */}
              <div className="absolute top-2 right-2 flex gap-1">
                {/* Green: New Loan Today (Checked via transaction OR profile date) */}
                {customer.hasLoanedToday && (
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full ring-2 ring-white shadow-sm z-10" title="Peminjaman baru hari ini"></div>
                )}
                
                {/* Yellow: Active but Has Not Paid Today AND Not a new loan today */}
                {customer.status === 'aktif' && !customer.hasPaidToday && !customer.hasLoanedToday && (
                    <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full ring-2 ring-white shadow-sm z-10" title="Belum bayar hari ini"></div>
                )}
              </div>
              
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 flex-shrink-0">
                <span className="text-xl font-bold text-gray-700">{customer.name[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base text-gray-900 truncate">{customer.name}</p>
                <p className="text-xs font-medium text-gray-500">{customer.location}</p>
                {customer.phone && (
                     <p className="text-xs font-medium text-gray-400">{customer.phone}</p>
                )}
              </div>
              <div className="text-right flex flex-col items-end">
                <p className="font-normal text-lg text-gray-900">{formatCurrency(customer.totalLoanWithInterest)}</p>
                {customer.amountPaidToday > 0 && (
                    <p className="text-xs font-bold text-green-600 mt-0.5">
                        + {formatCurrency(customer.amountPaidToday)}
                    </p>
                )}
              </div>
            </button>
          ))
        ) : (
          <div className="bg-card shadow-sm border border-gray-100 rounded-2xl p-6 text-center text-gray-400">
            <p>{searchQuery || selectedLocation !== 'Semua' ? 'Nasabah tidak ditemukan.' : 'Belum ada nasabah terdaftar.'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Customers;
