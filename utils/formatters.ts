export const formatCurrency = (amount: number, withSign = false) => {
    const plusSign = withSign && amount > 0 ? '+ ' : '';
    const minusSign = amount < 0 ? '- ' : '';
    const formatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Math.abs(amount));
    return `${minusSign}${plusSign}${formatted}`;
};
