
import React, { useState } from 'react';

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


interface SaverFormProps {
  onSubmit: (data: { name: string; amount: number; date: string }) => void;
  onCancel: () => void;
}

const SaverForm: React.FC<SaverFormProps> = ({ onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && amount && date && !isSubmitting) {
      setIsSubmitting(true);
      setTimeout(() => {
        onSubmit({
          name,
          amount: parseFormattedNumber(amount),
          date,
        });
      }, 500);
    }
  };
  
  const inputClasses = "mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 transition";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nama Penabung</label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClasses}
          placeholder="Masukkan nama"
          required
        />
      </div>
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Jumlah Tabungan Awal (IDR)</label>
        <input
          type="text"
          inputMode="numeric"
          id="amount"
          value={amount}
          onChange={(e) => setAmount(formatNumberInput(e.target.value))}
          className={inputClasses}
          required
          placeholder="0"
        />
      </div>
      <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-700">Tanggal Mulai Menabung</label>
        <input
          type="date"
          id="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={inputClasses + ' appearance-none'}
          required
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

export default SaverForm;
