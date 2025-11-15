
import React, { useState, useEffect } from 'react';
import { Customer } from '../types';

interface CustomerFormProps {
  onSubmit: (customer: Omit<Customer, 'id' | 'status'>) => void;
  onCancel: () => void;
  initialData?: Customer;
}

const formatNumberInput = (value: string): string => {
  if (!value) return '';
  const numberValue = parseInt(value.replace(/[^0-9]/g, ''), 10);
  if (isNaN(numberValue)) return '';
  return new Intl.NumberFormat('id-ID').format(numberValue);
};

const parseFormattedNumber = (value: string): number => {
  if (!value) return 0;
  return parseInt(value.replace(/\./g, ''), 10) || 0;
};

const CustomerForm: React.FC<CustomerFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [loanDate, setLoanDate] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [installments, setInstallments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const locations = ['Depan', 'Belakang', 'Kiri', 'Kanan', 'Luar'];
  const isEditMode = !!initialData;

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setPhone(initialData.phone);
      setLocation(initialData.location);
      setLoanDate(initialData.loanDate);
      setLoanAmount(formatNumberInput(String(initialData.loanAmount)));
      setInterestRate(String(initialData.interestRate));
      setInstallments(String(initialData.installments));
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && location && loanDate && loanAmount && interestRate && installments && !isSubmitting) {
      setIsSubmitting(true);
      // Simulate a brief delay for better UX before the modal closes
      setTimeout(() => {
        onSubmit({ 
          name, 
          phone, 
          location,
          loanDate,
          loanAmount: parseFormattedNumber(loanAmount),
          interestRate: parseFloat(interestRate),
          installments: parseInt(installments, 10),
        });
      }, 500);
    }
  };
  
  const inputClasses = "mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 transition";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nama</label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClasses}
          required
        />
      </div>
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Nomor Telepon (Opsional)</label>
        <input
          type="tel"
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={inputClasses}
        />
      </div>
      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700">Lokasi</label>
        <select
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className={inputClasses}
          required
        >
          <option value="" disabled>Pilih lokasi</option>
          {locations.map(loc => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="loanDate" className="block text-sm font-medium text-gray-700">Tanggal Pinjaman</label>
        <input
          type="date"
          id="loanDate"
          value={loanDate}
          onChange={(e) => setLoanDate(e.target.value)}
          className={inputClasses + ' appearance-none'}
          required
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="loanAmount" className="block text-sm font-medium text-gray-700">Jumlah Pinjaman</label>
          <input
            type="text"
            inputMode="numeric"
            id="loanAmount"
            value={loanAmount}
            onChange={(e) => setLoanAmount(formatNumberInput(e.target.value))}
            className={inputClasses}
            placeholder="0"
            required
          />
        </div>
        <div>
          <label htmlFor="interestRate" className="block text-sm font-medium text-gray-700">Bunga Pinjaman (%)</label>
          <input
            type="number"
            id="interestRate"
            value={interestRate}
            onChange={(e) => setInterestRate(e.target.value)}
            className={inputClasses}
            required
            min="0"
            step="0.1"
            placeholder="0"
          />
        </div>
      </div>
      <div>
        <label htmlFor="installments" className="block text-sm font-medium text-gray-700">Jumlah Cicilan</label>
        <input
          type="number"
          id="installments"
          value={installments}
          onChange={(e) => setInstallments(e.target.value)}
          className={inputClasses}
          required
          min="1"
          placeholder="0"
        />
      </div>
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-100 text-gray-700 font-bold py-2 px-4 rounded-xl hover:bg-gray-200 transition-all"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-black text-white font-bold py-2 px-4 rounded-xl hover:bg-gray-800 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed flex justify-center items-center h-[42px]"
        >
          {isSubmitting ? (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            'Simpan'
          )}
        </button>
      </div>
    </form>
  );
};

export default CustomerForm;
