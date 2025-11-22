
import React, { useState, useEffect } from 'react';
import { Customer } from '../types';

export interface CustomerFormData extends Omit<Customer, 'id' | 'status'> {
  disbursementMethod?: 'Potong Tagihan' | 'Ambil Kas' | 'Transfer';
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
  const [disbursementMethod, setDisbursementMethod] = useState<'Potong Tagihan' | 'Ambil Kas' | 'Transfer'>('Potong Tagihan');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State to prevent accidental submit when switching steps quickly (e.g. hitting Enter)
  const [isTransitioning, setIsTransitioning] = useState(false);

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

  const handleNext = () => {
    if (name && location) {
      setIsTransitioning(true);
      setStep(2);
      // Lock submission for 500ms to prevent "Enter" key bounce/repeat from submitting step 2 immediately
      setTimeout(() => setIsTransitioning(false), 500);
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
    e.stopPropagation();
    
    // Prevent submission on step 1, act as Next
    if (step === 1) {
      handleNext();
      return;
    }

    // Block submission if we just transitioned (prevents accidental double Enter)
    if (isTransitioning) {
      return;
    }

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
              <input
                type="text"
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={inputClasses}
                required
                placeholder="e.g., Depan, Belakang, Luar"
              />
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

            {/* Disbursement Method (Only in Add Mode) - UPDATED */}
            {!isEditMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sumber Dana Pencairan</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDisbursementMethod('Potong Tagihan')}
                    className={`relative flex flex-col items-start gap-1 px-4 py-3 rounded-xl border text-left transition-all h-full ${
                      disbursementMethod === 'Potong Tagihan' 
                        ? 'bg-yellow-50 border-yellow-400 text-yellow-900 shadow-sm' 
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${disbursementMethod === 'Potong Tagihan' ? 'bg-yellow-200' : 'bg-gray-100'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" /></svg>
                    </div>
                    <span className="block text-sm font-bold leading-tight">Potong Tagihan</span>
                    <span className="block text-[10px] opacity-70">Uang setoran hari ini</span>
                    
                    {disbursementMethod === 'Potong Tagihan' && <div className="absolute top-2 right-2 text-yellow-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg></div>}
                  </button>

                  <button
                    type="button"
                    onClick={() => setDisbursementMethod('Ambil Kas')}
                    className={`relative flex flex-col items-start gap-1 px-4 py-3 rounded-xl border text-left transition-all h-full ${
                      disbursementMethod === 'Ambil Kas' 
                        ? 'bg-purple-50 border-purple-400 text-purple-900 shadow-sm' 
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${disbursementMethod === 'Ambil Kas' ? 'bg-purple-200' : 'bg-gray-100'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                    </div>
                     <span className="block text-sm font-bold leading-tight">Ambil Kas</span>
                     <span className="block text-[10px] opacity-70">Kas Besar / Transfer</span>
                    
                    {disbursementMethod === 'Ambil Kas' && <div className="absolute top-2 right-2 text-purple-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg></div>}
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
            disabled={isSubmitting || isTransitioning}
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
