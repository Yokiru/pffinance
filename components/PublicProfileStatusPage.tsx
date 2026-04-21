import React, { useEffect, useMemo, useState } from 'react';
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
  pointsSummary?: {
    profilePointsTotal: number;
    activeLoanPoints: number;
    level: number;
  };
  activeLoans: PublicLoan[];
  recentRepayments: PublicRepayment[];
};

type Props = {
  shareToken: string;
};

type InstallmentVisualStatus = 'paid' | 'missed' | 'upcoming';

type InstallmentSlot = {
  index: number;
  dueDate: Date;
  status: InstallmentVisualStatus;
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

const weekdayLabels: Record<number, string> = {
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu',
  7: 'Minggu',
};

const staticHolidays = new Set([
  '2025-01-01',
  '2025-01-27',
  '2025-01-29',
  '2025-03-29',
  '2025-04-18',
  '2025-04-20',
  '2025-03-31',
  '2025-04-01',
  '2025-05-01',
  '2025-05-12',
  '2025-05-29',
  '2025-06-01',
  '2025-06-06',
  '2025-06-27',
  '2025-08-17',
  '2025-09-05',
  '2025-12-25',
  '2025-12-26',
  '2026-01-01',
  '2026-02-17',
  '2026-03-17',
  '2026-03-19',
  '2026-04-03',
  '2026-03-20',
  '2026-03-21',
  '2026-05-01',
  '2026-05-14',
  '2026-05-31',
  '2026-06-01',
  '2026-05-27',
  '2026-06-17',
  '2026-08-17',
  '2026-08-27',
  '2026-12-25',
]);

const formatCurrency = (value: number) => currency.format(Number(value || 0));
const formatDate = (value: string | Date) =>
  dateFormatter.format(typeof value === 'string' ? new Date(value) : value);

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

const formatDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const isWorkingDay = (date: Date) =>
  date.getDay() !== 0 && !staticHolidays.has(formatDateKey(date));

const shiftToNextWorkingDay = (date: Date) => {
  let current = startOfDay(date);
  while (!isWorkingDay(current)) {
    current = new Date(
      current.getFullYear(),
      current.getMonth(),
      current.getDate() + 1
    );
  }
  return current;
};

const normalizeWeekday = (
  value: number | null | undefined,
  fallback: number
) => {
  if (value && value >= 1 && value <= 7) return value;
  if (fallback >= 1 && fallback <= 7) return fallback;
  return 1;
};

const getDartWeekday = (date: Date) => {
  const day = date.getDay();
  return day === 0 ? 7 : day;
};

const generateDueDates = (loan: PublicLoan) => {
  const start = startOfDay(new Date(loan.startDate));
  const dueDates: Date[] = [];

  if (loan.installments <= 0) return dueDates;

  if (loan.repaymentFrequency === 'weekly') {
    const targetWeekday = normalizeWeekday(
      loan.weeklyDueWeekday,
      getDartWeekday(start)
    );
    let slotDate = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + 1
    );
    while (getDartWeekday(slotDate) !== targetWeekday) {
      slotDate = new Date(
        slotDate.getFullYear(),
        slotDate.getMonth(),
        slotDate.getDate() + 1
      );
    }

    while (dueDates.length < loan.installments) {
      dueDates.push(shiftToNextWorkingDay(slotDate));
      slotDate = new Date(
        slotDate.getFullYear(),
        slotDate.getMonth(),
        slotDate.getDate() + 7
      );
    }

    return dueDates;
  }

  let cursor = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() + 1
  );
  while (dueDates.length < loan.installments) {
    if (isWorkingDay(cursor)) {
      dueDates.push(startOfDay(cursor));
    }
    cursor = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate() + 1
    );
  }

  return dueDates;
};

const countDueByToday = (dueDates: Date[]) => {
  const today = startOfDay(new Date());
  return dueDates.filter((date) => startOfDay(date).getTime() <= today.getTime())
    .length;
};

const buildInstallmentSlots = (loan: PublicLoan) => {
  const dueDates = generateDueDates(loan);
  const paidInstallments = Math.max(
    0,
    Math.min(
      loan.installments,
      Math.floor(
        (loan.totalRepaidAmount || 0) /
          Math.max(loan.installmentAmount || 1, 1)
      )
    )
  );
  const dueByToday = countDueByToday(dueDates);

  return dueDates.map<InstallmentSlot>((dueDate, index) => {
    let status: InstallmentVisualStatus = 'upcoming';

    if (index < paidInstallments) {
      status = 'paid';
    } else if (index < dueByToday) {
      status = 'missed';
    }

    return {
      index: index + 1,
      dueDate,
      status,
    };
  });
};

const getRepaymentLabel = (loan: PublicLoan) => {
  if (loan.repaymentFrequency === 'weekly') {
    const weekday = loan.weeklyDueWeekday
      ? weekdayLabels[loan.weeklyDueWeekday]
      : 'Mingguan';
    return `Mingguan / ${weekday}`;
  }
  return 'Harian';
};

const getSlotStyles = (status: InstallmentVisualStatus) => {
  switch (status) {
    case 'paid':
      return 'border-[#2f6bff] bg-[#2f6bff] text-white';
    case 'missed':
      return 'border-[#6b2926] bg-[#351615] text-[#ff9c88]';
    default:
      return 'border-white/8 bg-white/[0.03] text-white/52';
  }
};

const getLegendStyles = (status: InstallmentVisualStatus) => {
  switch (status) {
    case 'paid':
      return 'bg-[#2f6bff]';
    case 'missed':
      return 'bg-[#ff9c88]';
    default:
      return 'bg-white/18';
  }
};

const LoadingState = () => (
  <div className="min-h-screen bg-[#050607] text-white">
    <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-5">
      <div className="w-full rounded-[28px] border border-white/8 bg-[#111315] p-6 text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-white" />
        <p className="text-lg font-semibold tracking-[-0.02em]">
          Memuat status nasabah
        </p>
        <p className="mt-2 text-sm text-white/58">
          Tunggu sebentar, data sedang diambil.
        </p>
      </div>
    </div>
  </div>
);

const ErrorState: React.FC<{ error: string }> = ({ error }) => (
  <div className="min-h-screen bg-[#050607] text-white">
    <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-5">
      <div className="w-full rounded-[28px] border border-[#ff8b6b]/18 bg-[#181212] p-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#ff8b6b]/25 bg-[#ff8b6b]/10 text-[#ff8b6b]">
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
        <p className="text-xl font-bold tracking-[-0.02em]">
          Link tidak bisa dibuka
        </p>
        <p className="mt-3 text-sm leading-6 text-white/65">{error}</p>
      </div>
    </div>
  </div>
);

const PublicProfileStatusPage: React.FC<Props> = ({ shareToken }) => {
  const [data, setData] = useState<PublicProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      const [statusResult, pointsResult] = await Promise.all([
        publicStatusSupabase.rpc('get_public_profile_status', {
          p_share_token: shareToken,
        }),
        publicStatusSupabase.rpc('get_public_profile_points_summary', {
          p_share_token: shareToken,
        }),
      ]);

      const payload = statusResult.data;
      const error = statusResult.error;

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

      const mergedPayload: PublicProfilePayload = {
        ...(payload as PublicProfilePayload),
        pointsSummary:
          (pointsResult.data as PublicProfilePayload['pointsSummary']) ?? {
            profilePointsTotal: 0,
            activeLoanPoints: 0,
            level: 1,
          },
      };

      setData(mergedPayload);
      setLoading(false);
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [shareToken]);

  const primaryLoan = data?.activeLoans[0] ?? null;
  const slots = useMemo(
    () => (primaryLoan ? buildInstallmentSlots(primaryLoan) : []),
    [primaryLoan]
  );

  if (loading) {
    return <LoadingState />;
  }

  if (error || !data) {
    return <ErrorState error={error ?? 'Terjadi kesalahan.'} />;
  }

  const { profile, activeLoans } = data;
  const pointsSummary = data.pointsSummary ?? {
    profilePointsTotal: 0,
    activeLoanPoints: 0,
    level: 1,
  };
  const maskedPhone = maskPhone(profile.phone);
  const progress = primaryLoan ? getProgress(primaryLoan) : 0;
  const paidCount = slots.filter((slot) => slot.status === 'paid').length;
  const missedCount = slots.filter((slot) => slot.status === 'missed').length;
  const upcomingCount = slots.filter((slot) => slot.status === 'upcoming').length;

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <div className="mx-auto max-w-md px-4 pb-12 pt-6">
        <div className="mb-6 flex justify-center">
          <div className="h-1.5 w-16 rounded-full bg-white/10" />
        </div>

        <section className="rounded-3xl border border-white/10 bg-[#111214] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.28)]">
          <div className="flex items-start gap-4">
            {profile.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt={profile.fullName}
                className="h-16 w-16 rounded-2xl object-cover ring-1 ring-white/10"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#18181b] text-[1.75rem] font-semibold text-white">
                {getInitial(profile.fullName)}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white/45">Nasabah</p>
                  <h1 className="mt-1 truncate text-[1.9rem] font-semibold leading-none tracking-[-0.04em] text-white">
                    {profile.fullName}
                  </h1>
                </div>
                <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[0.68rem] font-medium text-white/70">
                  Status Live
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-sm text-white/70">
                <IdentityRow label="Lokasi" value={profile.location || '-'} />
                <IdentityRow label="Nomor" value={maskedPhone || '-'} />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-3 gap-3">
          <StatBadge value={`${pointsSummary.level}`} label="Level" />
          <StatBadge
            value={`${pointsSummary.profilePointsTotal}`}
            label="Poin Profile"
          />
          <StatBadge
            value={`${pointsSummary.activeLoanPoints}`}
            label="Poin Pinjaman"
          />
        </section>

        {primaryLoan ? (
          <>
            <section className="mt-4 rounded-3xl border border-white/10 bg-[#111214] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white/45">Tagihan Berjalan</p>
                  <h2 className="mt-1 truncate text-2xl font-semibold tracking-[-0.04em] text-white">
                    {formatCurrency(primaryLoan.remainingAmount)}
                  </h2>
                  <p className="mt-1 text-sm text-white/55">
                    {primaryLoan.loanCode?.trim() || 'Pinjaman aktif'} •{' '}
                    {getRepaymentLabel(primaryLoan)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#18181b] px-3 py-2 text-right">
                  <p className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-white/40">
                    Progres
                  </p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {Math.round(progress)}%
                  </p>
                </div>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-[#2563eb] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <InfoCard
                  label="Pinjaman Awal"
                  value={formatCurrency(primaryLoan.principalAmount)}
                />
                <InfoCard
                  label="Total Tagihan"
                  value={formatCurrency(primaryLoan.totalTargetAmount)}
                />
                <InfoCard
                  label="Sudah Dibayar"
                  value={formatCurrency(primaryLoan.totalRepaidAmount)}
                />
                <InfoCard label="Bolong" value={`${missedCount} Kali`} />
              </div>
            </section>

            <section className="mt-4 rounded-3xl border border-white/10 bg-[#111214] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-white/45">Table Cicilan</p>
                  <h3 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-white">
                    Status {primaryLoan.installments} Kali
                  </h3>
                </div>
                <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[0.72rem] font-medium text-white/62">
                  {paidCount}/{primaryLoan.installments} selesai
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-white/56">
                <Legend label="Sudah bayar" status="paid" />
                <Legend label="Bolong" status="missed" />
                <Legend label="Belum jatuh tempo" status="upcoming" />
              </div>

              <div className="mt-5 grid grid-cols-5 gap-2.5">
                {slots.map((slot) => (
                  <div
                    key={slot.index}
                    className={`rounded-xl border px-2 py-3 text-center ${getSlotStyles(
                      slot.status
                    )}`}
                    title={`Cicilan ${slot.index} • ${formatDate(slot.dueDate)}`}
                  >
                    <p className="text-[0.64rem] font-medium opacity-70">
                      {slot.index}
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-none">
                      {slot.status === 'paid'
                        ? 'OK'
                        : slot.status === 'missed'
                        ? 'X'
                        : '-'}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <section className="mt-4 rounded-3xl border border-white/10 bg-[#111214] px-6 py-8 text-center">
            <p className="text-xs font-medium text-white/45">Tagihan Berjalan</p>
            <p className="mt-2 text-[1.7rem] font-semibold tracking-[-0.04em] text-white">
              Tidak ada pinjaman aktif
            </p>
            <p className="mx-auto mt-3 max-w-[22rem] text-sm leading-6 text-white/58">
              Saat ini belum ada pinjaman yang sedang berjalan untuk nasabah ini.
            </p>
          </section>
        )}
      </div>
    </div>
  );
};

const SummaryCard: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <div className="rounded-[24px] border border-white/8 bg-[#101113] px-4 py-4 text-center">
    <p className="text-[1.85rem] font-bold leading-none tracking-[-0.04em] text-white">
      {value}
    </p>
    <p className="mt-2 text-[0.78rem] text-white/54">{label}</p>
  </div>
);

const IdentityRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-white/40">{label}</span>
    <span className="max-w-[70%] truncate text-right text-white/82">{value}</span>
  </div>
);

const StatBadge: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <div className="rounded-2xl border border-white/10 bg-[#111214] px-4 py-4 text-center">
    <p className="text-[1.45rem] font-semibold leading-none tracking-[-0.04em] text-white">
      {value}
    </p>
    <p className="mt-2 text-[0.72rem] text-white/48">{label}</p>
  </div>
);

const InfoCard: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-2xl border border-white/10 bg-[#18181b] px-4 py-4">
    <p className="text-[0.68rem] uppercase tracking-[0.14em] text-white/38">
      {label}
    </p>
    <p className="mt-2 text-lg font-semibold leading-tight text-white">{value}</p>
  </div>
);

const MiniStat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-[22px] border border-white/8 bg-[#16181b] px-4 py-4 text-center">
    <p className="text-[1.65rem] font-bold leading-none text-white">{value}</p>
    <p className="mt-2 text-xs text-white/58">{label}</p>
  </div>
);

const Legend: React.FC<{ label: string; status: InstallmentVisualStatus }> = ({
  label,
  status,
}) => (
  <div className="inline-flex items-center gap-2">
    <span className={`h-2.5 w-2.5 rounded-full ${getLegendStyles(status)}`} />
    <span>{label}</span>
  </div>
);

export default PublicProfileStatusPage;
