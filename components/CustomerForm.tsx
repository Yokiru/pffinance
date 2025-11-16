
import React, { useState, useEffect } from 'react';
import { Customer } from '../types';

export interface CustomerFormData extends Omit<Customer, 'id' | 'status'> {
  disbursementMethod?: 'Cash' | 'Transfer';
}

interface CustomerFormProps {
  onSubmit: (customer: CustomerFormData) => void;
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
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [loanDate, setLoanDate] = useState(new Date().toISOString().split('T')[0]);
  const [loanAmount, setLoanAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [installments, setInstallments] = useState('');
  const [disbursementMethod, setDisbursementMethod] = useState<'Cash' | 'Transfer'>('Cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!initialData;
  const locations = ['Depan', 'Belakang', 'Kiri', 'Kanan', 'Luar'];
  
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

  const handleNext = () => {
    if (name && location) {
      setStep(2);
    } else {
      const form = document.getElementById('customer-form') as HTMLFormElement;
      if (form) form.reportValidity();
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && location && loanDate && loanAmount && interestRate && installments && !isSubmitting) {
      setIsSubmitting(true);
      setTimeout(() => {
        onSubmit({ 
          name, 
          phone, 
          location,
          loanDate,
          loanAmount: parseFormattedNumber(loanAmount),
          interestRate: parseFloat(interestRate),
          installments: parseInt(installments, 10),
          role: initialData?.role || 'borrower',
          disbursementMethod: isEditMode ? undefined : disbursementMethod,
        });
      }, 500);
    }
  };
  
  const inputClasses = "mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 transition";

  // Calculate summary for preview
  const numericLoanAmount = parseFormattedNumber(loanAmount);
  const numericInterest = parseFloat(interestRate);
  const numericInstallments = parseInt(installments || '1', 10);
  const totalReturn = numericLoanAmount * (1 + (numericInterest || 0)/100);
  const installmentValue = totalReturn / numericInstallments;

  return (
    <form id="customer-form" onSubmit={handleSubmit} className="space-y-5">
      
      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex space-x-2">
          <div className={`h-2 w-12 rounded-full transition-all duration-300 ${step >= 1 ? 'bg-black' : 'bg-gray-200'}`}></div>
          <div className={`h-2 w-12 rounded-full transition-all duration-300 ${step >= 2 ? 'bg-black' : 'bg-gray-200'}`}></div>
        </div>
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Langkah {step} / 2</span>
      </div>

      <div>
        {step === 1 && (
          <div className="space-y-4 animate-fadeInUp">
            <h3 className="text-lg font-bold text-gray-900">Informasi Nasabah</h3>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nama Lengkap</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClasses}
                required
                placeholder="Masukkan nama nasabah"
                autoFocus
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
                placeholder="08xxx"
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
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fadeInUp">
             {/* Summary of Step 1 */}
             <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-gray-200 text-gray-500 font-bold">
                  {name[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{name}</p>
                  <p className="text-xs text-gray-500">{location} {phone ? `• ${phone}` : ''}</p>
                </div>
                <button type="button" onClick={handleBack} className="ml-auto text-xs font-bold text-blue-600 hover:underline">Ubah</button>
             </div>

            <h3 className="text-lg font-bold text-gray-900">Detail Pinjaman</h3>
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
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="interestRate" className="block text-sm font-medium text-gray-700">Bunga (%)</label>
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

            {/* New Field: Disbursement Method (Only in Add Mode) */}
            {!isEditMode && (
              <div>
                <label htmlFor="disbursementMethod" className="block text-sm font-medium text-gray-700">Metode Pencairan</label>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => setDisbursementMethod('Cash')}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                      disbursementMethod === 'Cash' 
                        ? 'bg-green-50 border-green-200 text-green-700 shadow-sm' 
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    <span className="text-sm font-bold">Cash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisbursementMethod('Transfer')}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                      disbursementMethod === 'Transfer' 
                        ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                    <span className="text-sm font-bold">Transfer</span>
                  </button>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="installments" className="block text-sm font-medium text-gray-700">Jumlah Cicilan (Hari/Kali)</label>
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
             {/* Review Summary */}
             {numericLoanAmount > 0 && interestRate !== '' && installments !== '' && (
                <div className="bg-[#C7FF24]/10 p-4 rounded-xl border border-[#C7FF24]/50 mt-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-600">Total Kembali</span>
                    <span className="font-bold text-gray-900">Rp {new Intl.NumberFormat('id-ID').format(totalReturn)}</span>
                  </div>
                   <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Per Cicilan</span>
                    <span className="font-bold text-gray-900">Rp {new Intl.NumberFormat('id-ID').format(installmentValue)}</span>
                  </div>
                </div>
             )}
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-6">
        {step === 1 ? (
           <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 px-4 rounded-xl hover:bg-gray-200 transition-all"
          >
            Batal
          </button>
        ) : (
          <button
            type="button"
            onClick={handleBack}
            className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 px-4 rounded-xl hover:bg-gray-200 transition-all"
          >
            Kembali
          </button>
        )}

        {step === 1 ? (
          <button
            type="button"
            onClick={handleNext}
            className="flex-1 bg-black text-white font-bold py-3 px-4 rounded-xl hover:bg-gray-800 transition-all shadow-lg"
          >
            Lanjut
          </button>
        ) : (
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-[#C7FF24] text-black font-bold py-3 px-4 rounded-xl hover:brightness-90 transition-all disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed flex justify-center items-center shadow-lg shadow-lime-200"
          >
            {isSubmitting ? (
              <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              'Simpan'
            )}
          </button>
        )}
      </div>
    </form>
  );
};

export default CustomerForm;
