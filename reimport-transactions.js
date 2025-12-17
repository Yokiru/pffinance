// Re-import ALL transactions from backup to Supabase (ESM)
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

async function reimportTransactions() {
    console.log('📂 Reading backup file...');
    const backupPath = path.join(__dirname, 'pjfinance-backup-2025-12-17.json');
    const data = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

    console.log(`📊 Backup has ${data.transactions.length} transactions`);

    // Get existing transaction IDs from Supabase (with pagination to get ALL)
    console.log('🔍 Fetching existing transactions from Supabase...');
    let allExisting = [];
    let from = 0;
    const pageSize = 1000;

    while (true) {
        const { data: page, error } = await supabase
            .from('transactions')
            .select('id')
            .range(from, from + pageSize - 1);

        if (error) throw error;
        if (!page || page.length === 0) break;

        allExisting = allExisting.concat(page);
        from += pageSize;

        if (page.length < pageSize) break;
    }

    const existingIds = new Set(allExisting.map(t => t.id));
    console.log(`📊 Supabase currently has ${existingIds.size} transactions`);

    // Find missing transactions
    const missingTransactions = data.transactions.filter(t => !existingIds.has(t.id));
    console.log(`❗ Missing transactions: ${missingTransactions.length}`);

    if (missingTransactions.length === 0) {
        console.log('✅ All transactions already imported!');
        return;
    }

    // Import missing transactions in batches
    console.log('📤 Importing missing transactions...');
    const batchSize = 50;
    let imported = 0;

    for (let i = 0; i < missingTransactions.length; i += batchSize) {
        const batch = missingTransactions.slice(i, i + batchSize);
        const dbTransactions = batch.map(mapTransactionToDB);

        const { error } = await supabase.from('transactions').upsert(dbTransactions, { onConflict: 'id' });

        if (error) {
            console.error(`❌ Error importing batch ${i}-${i + batch.length}:`, error.message);
        } else {
            imported += batch.length;
            console.log(`✅ Imported ${imported}/${missingTransactions.length}`);
        }
    }

    // Verify final count
    const { count } = await supabase.from('transactions').select('*', { count: 'exact', head: true });
    console.log(`\n✅ COMPLETE! Supabase now has ${count} transactions`);
}

reimportTransactions().catch(console.error);
