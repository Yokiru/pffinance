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

const normalizeWeekday = (value: number | null | undefined, fallback: number) => {
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
    let slotDate = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
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

  let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
  while (dueDates.length < loan.installments) {
    if (isWorkingDay(cursor)) {
      dueDates.push(startOfDay(cursor));
    }
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
  }

  return dueDates;
};

const countDueByToday = (dueDates: Date[]) => {
  const today = startOfDay(new Date());
  return dueDates.filter((date) => startOfDay(date).getTime() <= today.getTime()).length;
};

const buildInstallmentSlots = (loan: PublicLoan, recentRepayments: PublicRepayment[]) => {
  const dueDates = generateDueDates(loan);
  const paidInstallments = Math.max(
    0,
    Math.min(
      loan.installments,
      Math.floor((loan.totalRepaidAmount || 0) / Math.max(loan.installmentAmount || 1, 1))
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
    return `Mingguan • ${weekday}`;
  }
  return 'Harian';
};

const getSlotColor = (status: InstallmentVisualStatus) => {
  switch (status) {
    case 'paid':
      return 'bg-[#2f6bff] text-white border-[#2f6bff]';
    case 'missed':
      return 'bg-[#351615] text-[#ff8f78] border-[#6b2926]';
    default:
      return 'bg-white/[0.04] text-white/55 border-white/8';
  }
};

const getLegendColor = (status: InstallmentVisualStatus) => {
  switch (status) {
    case 'paid':
      return 'bg-[#2f6bff]';
    case 'missed':
      return 'bg-[#ff8f78]';
    default:
      return 'bg-white/20';
  }
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

  const primaryLoan = data?.activeLoans[0] ?? null;
  const slots = useMemo(
    () =>
      primaryLoan && data
        ? buildInstallmentSlots(primaryLoan, data.recentRepayments)
        : [],
    [primaryLoan, data]
  );

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

  const { profile, activeLoans } = data;
  const maskedPhone = maskPhone(profile.phone);
  const progress = primaryLoan ? getProgress(primaryLoan) : 0;
  const paidCount = slots.filter((slot) => slot.status === 'paid').length;
  const missedCount = slots.filter((slot) => slot.status === 'missed').length;
  const upcomingCount = slots.filter((slot) => slot.status === 'upcoming').length;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-md pb-10">
        <section className="relative min-h-[430px] overflow-hidden rounded-b-[34px] bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.35),_rgba(12,22,38,0.94)_54%,_#040506_100%)]">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02)_0%,rgba(0,0,0,0.08)_42%,rgba(0,0,0,0.58)_74%,rgba(0,0,0,0.92)_100%)]" />

          {profile.photoUrl ? (
            <img
              src={profile.photoUrl}
              alt={profile.fullName}
              className="absolute inset-0 h-full w-full object-cover mix-blend-luminosity opacity-25"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[10rem] font-bold text-white/10">
              {getInitial(profile.fullName)}
            </div>
          )}

          <div className="relative px-6 pb-8 pt-8">
            <div className="mx-auto mb-10 h-1.5 w-16 rounded-full bg-white/15" />

            <div className="mt-28">
              <h1 className="max-w-[85%] text-[2.3rem] font-bold leading-[0.95] tracking-[-0.04em]">
                {profile.fullName}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.95rem] text-white/78">
                {profile.location ? <span>{profile.location}</span> : null}
                {profile.location && maskedPhone ? (
                  <span className="text-white/35">•</span>
                ) : null}
                {maskedPhone ? <span>{maskedPhone}</span> : null}
              </div>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-3 rounded-[26px] bg-black/18 px-4 py-5 backdrop-blur-[6px]">
              <div className="text-center">
                <p className="text-[2rem] font-bold leading-none">{activeLoans.length}</p>
                <p className="mt-2 text-xs text-white/60">Pinjaman Aktif</p>
              </div>
              <div className="border-x border-white/10 px-2 text-center">
                <p className="text-[2rem] font-bold leading-none">
                  {primaryLoan ? `${Math.round(progress)}%` : '0%'}
                </p>
                <p className="mt-2 text-xs text-white/60">Progres</p>
              </div>
              <div className="text-center">
                <p className="text-[2rem] font-bold leading-none">{missedCount}</p>
                <p className="mt-2 text-xs text-white/60">Bolong</p>
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-4 px-4 pt-4">
          {primaryLoan ? (
            <>
              <section className="rounded-[30px] bg-[#111315] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-white/38">
                      Pinjaman Berjalan
                    </p>
                    <h2 className="mt-2 truncate text-[1.9rem] font-bold leading-tight tracking-[-0.03em]">
                      {primaryLoan.loanCode?.trim() || 'Pinjaman Aktif'}
                    </h2>
                    <p className="mt-2 text-sm text-white/58">
                      {getRepaymentLabel(primaryLoan)}
                    </p>
                  </div>
                  <div className="rounded-full bg-white/[0.06] px-3 py-2 text-xs font-semibold text-white/70">
                    Aktif
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <InfoCard
                    label="Pinjaman Awal"
                    value={formatCurrency(primaryLoan.principalAmount)}
                  />
                  <InfoCard
                    label="Total + Bunga"
                    value={formatCurrency(primaryLoan.totalTargetAmount)}
                  />
                  <InfoCard
                    label="Sudah Dibayar"
                    value={formatCurrency(primaryLoan.totalRepaidAmount)}
                  />
                  <InfoCard
                    label="Sisa Tagihan"
                    value={formatCurrency(primaryLoan.remainingAmount)}
                  />
                </div>

                <div className="mt-5 rounded-[24px] bg-black/25 p-4">
                  <div className="mb-3 flex items-center justify-between text-sm text-white/65">
                    <span>Tertagih</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-white/[0.07]">
                    <div
                      className="h-full rounded-full bg-[#2f6bff] transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-[30px] bg-[#111315] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[1.35rem] font-bold tracking-[-0.02em]">
                      Status Setoran
                    </h3>
                    <p className="mt-1 text-sm text-white/55">
                      Kotak biru sudah bayar, merah bolong, abu belum jatuh tempo.
                    </p>
                  </div>
                  <div className="rounded-[18px] bg-white/[0.04] px-3 py-2 text-right">
                    <p className="text-xs text-white/45">Cicilan</p>
                    <p className="mt-1 text-lg font-bold">{primaryLoan.installments}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-white/60">
                  <Legend label="Sudah bayar" status="paid" />
                  <Legend label="Bolong" status="missed" />
                  <Legend label="Belum jatuh tempo" status="upcoming" />
                </div>

                <div className="mt-5 grid grid-cols-5 gap-2">
                  {slots.map((slot) => (
                    <div
                      key={slot.index}
                      className={`rounded-[18px] border px-2 py-3 text-center ${getSlotColor(
                        slot.status
                      )}`}
                      title={`Cicilan ${slot.index} • ${formatDate(slot.dueDate)}`}
                    >
                      <p className="text-[0.68rem] font-medium opacity-80">#{slot.index}</p>
                      <p className="mt-1 text-[1.05rem] font-bold leading-none">
                        {slot.status === 'paid'
                          ? '✓'
                          : slot.status === 'missed'
                          ? '!'
                          : '•'}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <MiniStat label="Lunas" value={`${paidCount}`} accent="text-[#2f6bff]" />
                  <MiniStat label="Bolong" value={`${missedCount}`} accent="text-[#ff8f78]" />
                  <MiniStat
                    label="Sisa Slot"
                    value={`${upcomingCount}`}
                    accent="text-white"
                  />
                </div>
              </section>
            </>
          ) : (
            <section className="rounded-[30px] bg-[#111315] p-6 text-center">
              <p className="text-xl font-semibold">Tidak ada pinjaman aktif</p>
              <p className="mt-2 text-sm leading-6 text-white/60">
                Saat ini profile ini belum memiliki pinjaman yang sedang berjalan.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

const InfoCard: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-[24px] bg-black/25 px-4 py-4">
    <p className="text-xs text-white/42">{label}</p>
    <p className="mt-2 text-lg font-bold leading-tight">{value}</p>
  </div>
);

const MiniStat: React.FC<{ label: string; value: string; accent: string }> = ({
  label,
  value,
  accent,
}) => (
  <div className="rounded-[22px] bg-black/22 px-4 py-4 text-center">
    <p className={`text-[1.7rem] font-bold leading-none ${accent}`}>{value}</p>
    <p className="mt-2 text-xs text-white/60">{label}</p>
  </div>
);

const Legend: React.FC<{ label: string; status: InstallmentVisualStatus }> = ({
  label,
  status,
}) => (
  <div className="inline-flex items-center gap-2">
    <span className={`h-2.5 w-2.5 rounded-full ${getLegendColor(status)}`} />
    <span>{label}</span>
  </div>
);

export default PublicProfileStatusPage;
