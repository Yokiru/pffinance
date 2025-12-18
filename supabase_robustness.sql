-- ============================================================================
-- PJFINANCE ROBUSTNESS UPGRADE
-- Run this script in the Supabase SQL Editor to guarantee Data Integrity.
-- ============================================================================

-- 1. Create a function to recalculate customer status and balance automatically
CREATE OR REPLACE FUNCTION public.recalculate_customer_status()
RETURNS TRIGGER AS $$
DECLARE
    target_customer_id TEXT;
    total_repayments NUMERIC;
    total_loan_with_interest NUMERIC;
    cust_record RECORD;
BEGIN
    -- Determine which customer to update
    IF (TG_OP = 'DELETE') THEN
        target_customer_id := OLD.customer_id;
    ELSE
        target_customer_id := NEW.customer_id;
    END IF;

    -- Fetch customer details
    SELECT * INTO cust_record FROM public.customers WHERE id = target_customer_id;
    
    -- If customer not found (or already deleted), exit
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Ignore if customer is just a saver (loan_amount = 0)
    IF cust_record.loan_amount = 0 THEN
        RETURN NULL;
    END IF;

    -- Calculate total REPAYMENT transactions for this customer
    SELECT COALESCE(SUM(amount), 0) INTO total_repayments
    FROM public.transactions
    WHERE customer_id = target_customer_id
    AND type = 'Pembayaran'; -- Matches TransactionType.REPAYMENT in types.ts

    -- Calculate target loan amount
    total_loan_with_interest := cust_record.loan_amount * (1 + cust_record.interest_rate / 100.0);

    -- Determine new status
    IF total_repayments >= total_loan_with_interest THEN
        -- Check if already lunas to avoid redundant updates? Postgres optimizes this usually.
        UPDATE public.customers SET status = 'lunas' WHERE id = target_customer_id;
    ELSE
        -- Only revert to 'aktif' if it was 'lunas'. If it's 'arsip', maybe keep it?
        -- Logic: If balance is not paid, it MUST be aktif (unless explicitly archived).
        -- Let's be safe: If it was 'lunas' and now isn't, go back to 'aktif'.
        IF cust_record.status = 'lunas' THEN
            UPDATE public.customers SET status = 'aktif' WHERE id = target_customer_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Create the Trigger to run this function after every Transaction change
DROP TRIGGER IF EXISTS trigger_recalc_status ON public.transactions;

CREATE TRIGGER trigger_recalc_status
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_customer_status();

-- 3. Atomic Delete Function (Optional but safer)
-- Use this via RPC call: supabase.rpc('delete_customer_cascade', { target_id: '...' })
CREATE OR REPLACE FUNCTION delete_customer_cascade(target_id TEXT)
RETURNS VOID AS $$
BEGIN
    DELETE FROM public.transactions WHERE customer_id = target_id;
    DELETE FROM public.customers WHERE id = target_id;
END;
$$ LANGUAGE plpgsql;
