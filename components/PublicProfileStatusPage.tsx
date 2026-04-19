import React, { useEffect, useState } from 'react';
import { publicStatusSupabase } from '../publicStatusSupabaseClient';

type PublicLoan = {
  loanId: string;
  loanCode: string | null;
  principalAmount: number;
  interestRate: number;
  installments: number;
  installmentAmount: number;
  startDate: string;
  status: string;
  repaymentFrequency: 'daily' | 'weekly';
  weeklyDueWeekday: number | null;
  totalTargetAmount: number;
  totalRepaidAmount: number;
  remainingAmount: number;
};

type PublicRepayment = {
  transactionId: string;
  loanId: string;
  amount: number;
  paymentMethod: string;
  description: string | null;
  transactionDate: string;
};

type PublicProfilePayload = {
  profile: {
    profileId: string;
    fullName: string;
    phone: string | null;
    location: string | null;
    photoUrl: string | null;
    status: string;
  };
  activeLoans: PublicLoan[];
  recentRepayments: PublicRepayment[];
};

type Props = {
  shareToken: string;
};

const currency = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const relativeDateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
});

const weekdayLabels: Record<number, string> = {
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu',
  7: 'Minggu',
};

const formatCurrency = (value: number) => currency.format(Number(value || 0));
const formatDate = (value: string) => dateFormatter.format(new Date(value));
const formatShortDate = (value: string) =>
  relativeDateFormatter.format(new Date(value));

const maskPhone = (value: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length <= 6) return trimmed;
  return `${trimmed.slice(0, 4)}****${trimmed.slice(-3)}`;
};

const getInitial = (fullName: string) =>
  fullName.trim().charAt(0).toUpperCase() || '?';

const getProgress = (loan: PublicLoan) => {
  if (!loan.totalTargetAmount || loan.totalTargetAmount <= 0) return 0;
  return Math.max(
    0,
    Math.min(100, (loan.totalRepaidAmount / loan.totalTargetAmount) * 100)
  );
};

const getRepaymentLabel = (loan: PublicLoan) => {
  if (loan.repaymentFrequency === 'weekly') {
    const weekday = loan.weeklyDueWeekday
      ? weekdayLabels[loan.weeklyDueWeekday]
      : 'Mingguan';
    return `Mingguan • ${weekday}`;
  }
  return 'Harian';
};

const PublicProfileStatusPage: React.FC<Props> = ({ shareToken }) => {
  const [data, setData] = useState<PublicProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      const { data: payload, error } = await publicStatusSupabase.rpc(
        'get_public_profile_status',
        {
          p_share_token: shareToken,
        }
      );

      if (!mounted) return;

      if (error) {
        setError(error.message);
        setData(null);
        setLoading(false);
        return;
      }

      if (!payload) {
        setError('Link tidak valid atau sudah tidak aktif.');
        setData(null);
        setLoading(false);
        return;
      }

      setData(payload as PublicProfilePayload);
      setLoading(false);
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [shareToken]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-6">
          <div className="w-full rounded-[28px] border border-white/10 bg-white/[0.04] p-6 text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            <p className="text-lg font-semibold">Memuat status nasabah</p>
            <p className="mt-2 text-sm text-white/60">
              Tunggu sebentar, data sedang diambil.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-6">
          <div className="w-full rounded-[28px] border border-[#ff8b6b]/20 bg-[#181212] p-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#ff8b6b]/30 bg-[#ff8b6b]/10 text-[#ff8b6b]">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 8V13"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="17" r="1.2" fill="currentColor" />
                <path
                  d="M12 3.5C7.30558 3.5 3.5 7.30558 3.5 12C3.5 16.6944 7.30558 20.5 12 20.5C16.6944 20.5 20.5 16.6944 20.5 12C20.5 7.30558 16.6944 3.5 12 3.5Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </div>
            <p className="text-xl font-bold">Link tidak bisa dibuka</p>
            <p className="mt-3 text-sm leading-6 text-white/65">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const { profile, activeLoans, recentRepayments } = data;
  const primaryLoan = activeLoans[0] ?? null;
  const maskedPhone = maskPhone(profile.phone);
  const progress = primaryLoan ? getProgress(primaryLoan) : 0;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-md px-4 pb-10 pt-6">
        <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#101214]">
          <div className="relative h-[280px] overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.35),_rgba(7,11,18,0.92)_56%,_#050607_100%)]">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02)_0%,rgba(0,0,0,0.08)_50%,rgba(0,0,0,0.55)_100%)]" />
            <div className="absolute inset-x-0 top-0 flex justify-center px-5 pt-5">
              <div className="inline-flex rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-semibold tracking-[0.16em] text-white/70 uppercase">
                Status Nasabah
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 px-6 pb-6">
              <div className="flex items-end gap-4">
                {profile.photoUrl ? (
                  <img
                    src={profile.photoUrl}
                    alt={profile.fullName}
                    className="h-20 w-20 rounded-[24px] object-cover ring-1 ring-white/10"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-white/[0.08] text-4xl font-bold text-white/92 ring-1 ring-white/10">
                    {getInitial(profile.fullName)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-[2rem] font-bold leading-none tracking-[-0.03em]">
                    {profile.fullName}
                  </h1>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/75">
                    {profile.location ? <span>{profile.location}</span> : null}
                    {profile.location && maskedPhone ? (
                      <span className="text-white/35">•</span>
                    ) : null}
                    {maskedPhone ? <span>{maskedPhone}</span> : null}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 px-4 pb-4 pt-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-[22px] bg-white/[0.04] px-4 py-4">
                <p className="text-[1.6rem] font-bold leading-none">
                  {activeLoans.length}
                </p>
                <p className="mt-2 text-xs text-white/60">Pinjaman Aktif</p>
              </div>
              <div className="rounded-[22px] bg-white/[0.04] px-4 py-4">
                <p className="truncate text-[1.2rem] font-bold leading-none">
                  {primaryLoan
                    ? formatCurrency(primaryLoan.remainingAmount)
                    : formatCurrency(0)}
                </p>
                <p className="mt-2 text-xs text-white/60">Sisa Tagihan</p>
              </div>
              <div className="rounded-[22px] bg-white/[0.04] px-4 py-4">
                <p className="text-[1.6rem] font-bold leading-none">
                  {Math.round(progress)}%
                </p>
                <p className="mt-2 text-xs text-white/60">Progres</p>
              </div>
            </div>

            {primaryLoan ? (
              <section className="rounded-[28px] bg-white/[0.04] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                      Pinjaman Berjalan
                    </p>
                    <h2 className="mt-2 truncate text-2xl font-bold leading-tight">
                      {primaryLoan.loanCode?.trim() || 'Pinjaman Aktif'}
                    </h2>
                    <p className="mt-2 text-sm text-white/65">
                      {getRepaymentLabel(primaryLoan)} •{' '}
                      {formatDate(primaryLoan.startDate)}
                    </p>
                  </div>
                  <div className="rounded-full bg-white/[0.06] px-3 py-2 text-xs font-semibold text-white/70">
                    {primaryLoan.status}
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between text-sm text-white/65">
                    <span>Tertagih</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-white/[0.08]">
                    <div
                      className="h-full rounded-full bg-[#2f6bff] transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-[22px] bg-black/20 px-4 py-4">
                    <p className="text-xs text-white/45">Pinjaman Awal</p>
                    <p className="mt-2 text-lg font-bold">
                      {formatCurrency(primaryLoan.principalAmount)}
                    </p>
                  </div>
                  <div className="rounded-[22px] bg-black/20 px-4 py-4">
                    <p className="text-xs text-white/45">Total + Bunga</p>
                    <p className="mt-2 text-lg font-bold">
                      {formatCurrency(primaryLoan.totalTargetAmount)}
                    </p>
                  </div>
                  <div className="rounded-[22px] bg-black/20 px-4 py-4">
                    <p className="text-xs text-white/45">Sudah Dibayar</p>
                    <p className="mt-2 text-lg font-bold">
                      {formatCurrency(primaryLoan.totalRepaidAmount)}
                    </p>
                  </div>
                  <div className="rounded-[22px] bg-black/20 px-4 py-4">
                    <p className="text-xs text-white/45">Sisa Tagihan</p>
                    <p className="mt-2 text-lg font-bold">
                      {formatCurrency(primaryLoan.remainingAmount)}
                    </p>
                  </div>
                </div>
              </section>
            ) : (
              <section className="rounded-[28px] bg-white/[0.04] p-6 text-center">
                <p className="text-lg font-semibold">Tidak ada pinjaman aktif</p>
                <p className="mt-2 text-sm leading-6 text-white/60">
                  Saat ini profile ini belum memiliki pinjaman yang sedang
                  berjalan.
                </p>
              </section>
            )}

            <section className="rounded-[28px] bg-white/[0.04] p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Riwayat Pembayaran</h3>
                <span className="text-xs text-white/45">
                  {recentRepayments.length} terbaru
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {recentRepayments.length === 0 ? (
                  <div className="rounded-[22px] bg-black/20 px-4 py-4 text-sm text-white/60">
                    Belum ada pembayaran yang tercatat.
                  </div>
                ) : (
                  recentRepayments.map((item) => (
                    <div
                      key={item.transactionId}
                      className="flex items-center gap-3 rounded-[22px] bg-black/20 px-4 py-4"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.07] text-[#2f6bff]">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M7 12H17"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                          <path
                            d="M12 7L17 12L12 17"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          Bayar • {item.paymentMethod}
                        </p>
                        <p className="mt-1 text-xs text-white/55">
                          {formatDate(item.transactionDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold text-[#2f6bff]">
                          {formatCurrency(item.amount)}
                        </p>
                        <p className="mt-1 text-xs text-white/45">
                          {formatShortDate(item.transactionDate)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicProfileStatusPage;
