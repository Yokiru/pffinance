// Import script for PJFinance backup data (ESM)
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(
    'https://ewkcqsjuptygmekxnwzi.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3a2Nxc2p1cHR5Z21la3hud3ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMDQyODQsImV4cCI6MjA3ODY4MDI4NH0.zJByMDK9qlc2k-NYNfqfDfDFWimI-chQktzguo_xLcI'
);

// Mappers
const mapCustomerToDB = (c) => ({
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

const mapTransactionToDB = (t) => ({
    id: t.id,
    customer_id: t.customerId,
    type: t.type,
    amount: t.amount,
    date: t.date,
    description: t.description,
    payment_method: t.paymentMethod,
    is_edited: t.isEdited || false,
});

async function importData() {
    console.log('📂 Reading backup file...');
    const backupPath = path.join(__dirname, 'pjfinance-backup-2025-12-17.json');
    const data = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

    console.log(`📊 Found ${data.customers.length} customers and ${data.transactions.length} transactions`);

    // Count savers and savings transactions
    const savers = data.customers.filter(c => c.role === 'saver');
    const savingsTransactions = data.transactions.filter(t => t.type === 'Tabungan');
    const withdrawalTransactions = data.transactions.filter(t => t.type === 'Penarikan');

    console.log(`👥 Savers: ${savers.length}`);
    console.log(`💰 Savings transactions: ${savingsTransactions.length}`);
    console.log(`💸 Withdrawal transactions: ${withdrawalTransactions.length}`);

    // Import customers first
    console.log('\n📤 Importing customers...');
    const dbCustomers = data.customers.map(mapCustomerToDB);

    // Import in batches of 100
    const customerBatchSize = 100;
    let customerSuccess = 0;
    for (let i = 0; i < dbCustomers.length; i += customerBatchSize) {
        const batch = dbCustomers.slice(i, i + customerBatchSize);
        const { error } = await supabase.from('customers').upsert(batch, { onConflict: 'id' });
        if (error) {
            console.error(`❌ Error importing customers batch ${i}-${i + batch.length}:`, error.message);
        } else {
            customerSuccess += batch.length;
            console.log(`✅ Imported customers ${i + 1}-${i + batch.length}`);
        }
    }
    console.log(`✅ Customers import complete: ${customerSuccess}/${data.customers.length}`);

    // Import transactions
    console.log('\n📤 Importing transactions...');
    const dbTransactions = data.transactions.map(mapTransactionToDB);

    // Import in batches of 100
    const txBatchSize = 100;
    let txSuccess = 0;
    for (let i = 0; i < dbTransactions.length; i += txBatchSize) {
        const batch = dbTransactions.slice(i, i + txBatchSize);
        const { error } = await supabase.from('transactions').upsert(batch, { onConflict: 'id' });
        if (error) {
            console.error(`❌ Error importing transactions batch ${i}-${i + batch.length}:`, error.message);
        } else {
            txSuccess += batch.length;
            console.log(`✅ Imported transactions ${i + 1}-${i + batch.length}`);
        }
    }
    console.log(`✅ Transactions import complete: ${txSuccess}/${data.transactions.length}`);

    // Verify
    console.log('\n🔍 Verifying import...');
    const { data: verifyCustomers } = await supabase.from('customers').select('role').eq('role', 'saver');
    const { data: verifySavings } = await supabase.from('transactions').select('type').eq('type', 'Tabungan');

    console.log(`\n✅ IMPORT COMPLETE!`);
    console.log(`   Savers in DB: ${verifyCustomers?.length || 0}`);
    console.log(`   Savings transactions in DB: ${verifySavings?.length || 0}`);
}

importData().catch(console.error);
