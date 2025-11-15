
import React, { useState, useEffect } from 'react';
import { Customer, Transaction, TransactionType } from '../types';

interface TransactionFormProps {
  customers: Customer[];
  onSubmit: (transaction: Omit<Transaction, 'id'>) => void;
  onCancel: () => void;
  initialData?: Transaction;
  defaultType?: TransactionType;
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

const TransactionForm: React.FC<TransactionFormProps> = ({ customers, onSubmit, onCancel, initialData, defaultType }) => {
  const [customerId, setCustomerId] = useState(initialData?.customerId || customers[0]?.id || '');
  const [type, setType] = useState<TransactionType>(initialData?.type || defaultType || TransactionType.REPAYMENT);
  const [amount, setAmount] = useState(initialData ? formatNumberInput(String(initialData.amount)) : '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Transfer'>(initialData?.paymentMethod || 'Cash');
  const [date, setDate] = useState(initialData ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!initialData;

  useEffect(() => {
    if (initialData) {
      setCustomerId(initialData.customerId);
      setType(initialData.type);
      setAmount(formatNumberInput(String(initialData.amount)));
      setDescription(initialData.description);
      setPaymentMethod(initialData.paymentMethod);
      setDate(new Date(initialData.date).toISOString().split('T')[0]);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customerId && type && amount && !isSubmitting) {
      setIsSubmitting(true);
      setTimeout(() => {
        const transactionDate = new Date(date);
        const originalTime = initialData ? new Date(initialData.date) : new Date();
        transactionDate.setHours(originalTime.getHours(), originalTime.getMinutes(), originalTime.getSeconds());

        onSubmit({ 
          ...initialData,
          customerId, 
          type, 
          amount: parseFormattedNumber(amount),
          description,
          paymentMethod,
          date: transactionDate.toISOString(),
        });
      }, 500);
    }
  };
  
  const inputClasses = "mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 transition";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="customer" className="block text-sm font-medium text-gray-700">Nasabah</label>
        <select
          id="customer"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className={inputClasses}
          required
          disabled={isEditMode}
        >
          {customers.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isEditMode ? (
            <div>
              <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700">Metode Pembayaran</label>
              <select
                id="paymentMethod"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as 'Cash' | 'Transfer')}
                className={inputClasses}
                required
              >
                <option value="Cash">Cash</option>
                <option value="Transfer">Transfer</option>
              </select>
            </div>
        ) : !defaultType ? (
            <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700">Tipe</label>
                <select
                  id="type"
                  value={type}
                  onChange={(e) => setType(e.target.value as TransactionType)}
                  className={inputClasses}
                  required
                >
                  {Object.values(TransactionType).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
            </div>
        ) : null}
        <div className={!isEditMode && defaultType ? 'md:col-span-2' : ''}>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700">Tanggal</label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClasses + ' appearance-none'}
              required
            />
        </div>
      </div>
      {!isEditMode && (
        <div>
          <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700">Metode Pembayaran</label>
          <select
            id="paymentMethod"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as 'Cash' | 'Transfer')}
            className={inputClasses}
            required
          >
            <option value="Cash">Cash</option>
            <option value="Transfer">Transfer</option>
          </select>
        </div>
      )}
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Jumlah (IDR)</label>
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
      {!isEditMode && (
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Keterangan (Opsional)</label>
          <input
            type="text"
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClasses}
          />
        </div>
      )}
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
             isEditMode ? 'Simpan' : (defaultType === TransactionType.SAVINGS ? 'Simpan Tabungan' : 'Simpan Transaksi')
          )}
        </button>
      </div>
    </form>
  );
};

export default TransactionForm;
