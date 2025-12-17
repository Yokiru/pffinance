import React, { useState } from 'react';
import { Customer, Transaction } from '../types';
import { supabase } from '../supabaseClient';

interface ExportImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    customers: Customer[];
    transactions: Transaction[];
    onImportComplete: () => void;
}

interface ExportData {
    version: string;
    exportedAt: string;
    customers: Customer[];
    transactions: Transaction[];
}

// Mappers for Supabase format
const mapCustomerToDB = (c: Customer) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    location: c.location,
    loan_date: c.loanDate,
    loan_amount: c.loanAmount,
    interest_rate: c.interestRate,
    installments: c.installments,
    status: c.status,
    role: c.role,
});

const mapTransactionToDB = (t: Transaction) => ({
    id: t.id,
    customer_id: t.customerId,
    type: t.type,
    amount: t.amount,
    date: t.date,
    description: t.description,
    payment_method: t.paymentMethod,
    is_edited: t.isEdited || false,
});

const ExportImportModal: React.FC<ExportImportModalProps> = ({
    isOpen,
    onClose,
    customers,
    transactions,
    onImportComplete,
}) => {
    const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
    const [importData, setImportData] = useState('');
    const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
    const [importMessage, setImportMessage] = useState('');
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

    if (!isOpen) return null;

    const exportData: ExportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        customers,
        transactions,
    };

    const exportJson = JSON.stringify(exportData, null, 2);

    const handleCopyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(exportJson);
            alert('Data berhasil di-copy ke clipboard!');
        } catch (err) {
            // Fallback for mobile
            const textArea = document.createElement('textarea');
            textArea.value = exportJson;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('Data berhasil di-copy ke clipboard!');
        }
    };

    const handleDownload = () => {
        const blob = new Blob([exportJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pjfinance-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImport = async () => {
        if (!importData.trim()) {
            setImportMessage('Paste data JSON terlebih dahulu');
            setImportStatus('error');
            return;
        }

        setImportStatus('importing');
        setImportMessage('Memvalidasi data...');

        try {
            const data: ExportData = JSON.parse(importData);

            if (!data.version || !data.customers || !data.transactions) {
                throw new Error('Format data tidak valid');
            }

            const totalItems = data.customers.length + data.transactions.length;
            setImportProgress({ current: 0, total: totalItems });

            // Import customers
            setImportMessage(`Mengimport ${data.customers.length} customers...`);
            let current = 0;

            for (const customer of data.customers) {
                const dbCustomer = mapCustomerToDB(customer);
                const { error } = await supabase
                    .from('customers')
                    .upsert([dbCustomer], { onConflict: 'id' });

                if (error) {
                    console.error('Error importing customer:', customer.name, error);
                }

                current++;
                setImportProgress({ current, total: totalItems });
            }

            // Import transactions
            setImportMessage(`Mengimport ${data.transactions.length} transactions...`);

            // Import in batches of 50 to avoid timeout
            const batchSize = 50;
            for (let i = 0; i < data.transactions.length; i += batchSize) {
                const batch = data.transactions.slice(i, i + batchSize);
                const dbTransactions = batch.map(mapTransactionToDB);

                const { error } = await supabase
                    .from('transactions')
                    .upsert(dbTransactions, { onConflict: 'id' });

                if (error) {
                    console.error('Error importing transaction batch:', error);
                }

                current += batch.length;
                setImportProgress({ current, total: totalItems });
            }

            setImportStatus('success');
            setImportMessage(`Berhasil import ${data.customers.length} customers dan ${data.transactions.length} transactions!`);

            // Clear localStorage and refresh data
            setTimeout(() => {
                localStorage.clear();
                onImportComplete();
                onClose();
            }, 2000);

        } catch (err) {
            console.error('Import error:', err);
            setImportStatus('error');
            setImportMessage(err instanceof Error ? err.message : 'Gagal import data');
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 z-[70] flex justify-center items-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
                    <h3 className="text-xl font-bold text-gray-900">Export / Import Data</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100">
                    <button
                        onClick={() => setActiveTab('export')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'export'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        📤 Export
                    </button>
                    <button
                        onClick={() => setActiveTab('import')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'import'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        📥 Import
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto flex-1">
                    {activeTab === 'export' ? (
                        <div className="space-y-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-sm text-blue-800">
                                    <strong>Instruksi:</strong> Buka app di HP kamu, tekan tombol Export, lalu copy data JSON dan paste di tab Import di device lain.
                                </p>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-3">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-700">Data Summary:</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="bg-white rounded p-2 border border-gray-200">
                                        <span className="text-gray-500">Customers:</span>
                                        <span className="font-bold ml-2">{customers.length}</span>
                                    </div>
                                    <div className="bg-white rounded p-2 border border-gray-200">
                                        <span className="text-gray-500">Transactions:</span>
                                        <span className="font-bold ml-2">{transactions.length}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleCopyToClipboard}
                                    className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
                                >
                                    📋 Copy ke Clipboard
                                </button>
                                <button
                                    onClick={handleDownload}
                                    className="flex-1 bg-gray-600 text-white py-3 rounded-xl font-medium hover:bg-gray-700 transition-colors"
                                >
                                    💾 Download File
                                </button>
                            </div>

                            <div className="relative">
                                <textarea
                                    readOnly
                                    value={exportJson}
                                    className="w-full h-48 p-3 text-xs font-mono bg-gray-900 text-green-400 rounded-lg resize-none"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <p className="text-sm text-yellow-800">
                                    <strong>⚠️ Perhatian:</strong> Import akan menggabungkan data baru dengan data yang sudah ada di server. Data dengan ID yang sama akan di-update.
                                </p>
                            </div>

                            <textarea
                                value={importData}
                                onChange={(e) => setImportData(e.target.value)}
                                placeholder="Paste data JSON di sini..."
                                className="w-full h-48 p-3 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={importStatus === 'importing'}
                            />

                            {importStatus !== 'idle' && (
                                <div
                                    className={`p-3 rounded-lg ${importStatus === 'importing'
                                            ? 'bg-blue-50 border border-blue-200'
                                            : importStatus === 'success'
                                                ? 'bg-green-50 border border-green-200'
                                                : 'bg-red-50 border border-red-200'
                                        }`}
                                >
                                    <p
                                        className={`text-sm ${importStatus === 'importing'
                                                ? 'text-blue-800'
                                                : importStatus === 'success'
                                                    ? 'text-green-800'
                                                    : 'text-red-800'
                                            }`}
                                    >
                                        {importMessage}
                                    </p>
                                    {importStatus === 'importing' && importProgress.total > 0 && (
                                        <div className="mt-2">
                                            <div className="bg-blue-200 rounded-full h-2">
                                                <div
                                                    className="bg-blue-600 h-2 rounded-full transition-all"
                                                    style={{
                                                        width: `${(importProgress.current / importProgress.total) * 100}%`,
                                                    }}
                                                />
                                            </div>
                                            <p className="text-xs text-blue-600 mt-1">
                                                {importProgress.current} / {importProgress.total}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                onClick={handleImport}
                                disabled={importStatus === 'importing' || !importData.trim()}
                                className={`w-full py-3 rounded-xl font-medium transition-colors ${importStatus === 'importing' || !importData.trim()
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-green-600 text-white hover:bg-green-700'
                                    }`}
                            >
                                {importStatus === 'importing' ? '⏳ Importing...' : '📥 Import ke Supabase'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExportImportModal;
