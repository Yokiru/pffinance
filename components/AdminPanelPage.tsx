import React, { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpDownIcon,
  BadgePlusIcon,
  BanknoteIcon,
  CopyIcon,
  FileTextIcon,
  GiftIcon,
  HouseIcon,
  LoaderCircleIcon,
  LogOutIcon,
  MoreHorizontalIcon,
  PencilLineIcon,
  PlusIcon,
  RefreshCwIcon,
  Settings2Icon,
  ShieldCheckIcon,
  SquareMinusIcon,
  SquarePlusIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  UsersIcon,
  WalletCardsIcon,
  WalletIcon,
} from "lucide-react";

import { adminSupabase } from "@/adminSupabaseClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import PointSystemDocsPage from "@/components/PointSystemDocsPage";

type ProfileRecord = {
  id: string;
  full_name: string;
  phone: string | null;
  location: string | null;
  business_category: string | null;
  religion: string | null;
  status: string;
  photo_url?: string | null;
  created_at: string;
};

type LoanRecord = {
  id: string;
  profile_id: string;
  principal_amount: number;
  installment_amount_snapshot: number;
  installments: number;
  start_date: string;
  status: string;
};

type SavingsAccountRecord = {
  id: string;
  profile_id: string;
  account_name: string;
  status: string;
};

type PointLedgerRecord = {
  id: string;
  profile_id: string;
  loan_id: string | null;
  event_type: string;
  points_delta: number;
  event_date: string;
  notes: string | null;
};

type ShareLinkRecord = {
  id: string;
  profile_id: string;
  share_token: string;
  is_active: boolean;
  created_at: string;
};

type LoanTransactionRecord = {
  id: string;
  profile_id: string;
  loan_id: string | null;
  amount: number;
  transaction_date: string;
  type: string;
  payment_method?: string | null;
};

type SavingsTransactionRecord = {
  id: string;
  profile_id: string;
  savings_account_id?: string | null;
  amount: number;
  transaction_date: string;
  type: string;
  payment_method?: string | null;
};

type BusinessCashLedgerRecord = {
  id: string;
  direction: "in" | "out";
  amount: number;
  note: string | null;
  event_date: string;
  created_at: string;
};

type RewardRecord = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  point_source: "profile" | "active_loan";
  points_cost: number;
  is_active: boolean;
  is_repeatable: boolean;
  sort_order: number;
  created_at: string;
};

type ProfileViewModel = {
  profile: ProfileRecord;
  activeLoans: LoanRecord[];
  archivedLoans: LoanRecord[];
  activeSavings: SavingsAccountRecord[];
  profilePoints: number;
  activeLoanPoints: number;
  level: number;
  latestShareLink: ShareLinkRecord | null;
};

type AnalyticsRow = {
  date: string;
  label: string;
  repayments: number;
  loanOut: number;
  savingsIn: number;
  savingsOut: number;
};

type MoneyActivity = {
  id: string;
  title: string;
  detail: string;
  amount: number;
  direction: "in" | "out";
  kind: "repayment" | "loan_out" | "savings_in" | "savings_out" | "cash";
  date: string;
  method?: string | null;
};

type PriorityCustomer = {
  id: string;
  name: string;
  detail: string;
  outstanding: number;
  paid: number;
  activeLoans: number;
  savingsAccounts: number;
  points: number;
  level: number;
};

type CustomerInsight = {
  item: ProfileViewModel;
  outstanding: number;
  paid: number;
  savingsBalance: number;
  totalPoints: number;
  risk: "Aman" | "Pantau" | "Prioritas";
  valueScore: number;
};

type ProfileFormState = {
  fullName: string;
  phone: string;
  location: string;
  businessCategory: string;
  religion: string;
  status: string;
};

type PointAdjustmentState = {
  mode: "profile" | "active_loan";
  loanId: string;
  amount: string;
  note: string;
};

type RewardFormState = {
  title: string;
  description: string;
  pointSource: "profile" | "active_loan";
  pointsCost: string;
  sortOrder: string;
  isActive: boolean;
};

const formatAdminError = (error: unknown) => {
  if (!error) return "Terjadi kendala yang belum diketahui.";

  const sanitizeMessage = (message: string) => {
    const trimmed = message.trim();
    if (
      trimmed.includes("Failed to fetch") ||
      trimmed.includes("NetworkError") ||
      trimmed.includes("Load failed")
    ) {
      return "Tidak bisa terhubung ke database admin. Cek koneksi internet, URL Supabase admin, atau izin akses browser.";
    }

    return trimmed
      .split("\n")[0]
      .split(" at ")[0]
      .trim();
  };

  if (typeof error === "string") return sanitizeMessage(error);
  if (error instanceof Error) return sanitizeMessage(error.message);
  if (typeof error === "object") {
    const maybeError = error as {
      message?: string;
      details?: string | null;
      hint?: string | null;
      code?: string;
    };
    if (maybeError.message) {
      const message = sanitizeMessage(maybeError.message);
      const details =
        maybeError.details && !maybeError.details.includes(" at ")
          ? maybeError.details.trim()
          : null;
      return details ? `${message} (${details})` : message;
    }
    if (maybeError.hint) return maybeError.hint;
    if (maybeError.code) return `Kode error: ${maybeError.code}`;
  }
  return sanitizeMessage(String(error));
};

const isMissingProfileExtraFieldsError = (error: unknown) => {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : String(error ?? "");

  const normalized = message.toLowerCase();
  return (
    normalized.includes("business_category") ||
    normalized.includes("religion") ||
    normalized.includes(
      "column customer_profiles.business_category does not exist"
    ) ||
    normalized.includes("column customer_profiles.religion does not exist")
  );
};

const ADMIN_PAGE_SIZE = 1000;

type AdminPagedResponse<T> = {
  data: T[] | null;
  error: unknown;
};

const fetchAdminPagedRows = async <T,>(
  queryPage: (from: number, to: number) => PromiseLike<AdminPagedResponse<T>>
) => {
  const rows: T[] = [];

  for (let page = 0; ; page += 1) {
    const from = page * ADMIN_PAGE_SIZE;
    const to = from + ADMIN_PAGE_SIZE - 1;
    const response = await queryPage(from, to);

    if (response.error) throw response.error;

    const chunk = response.data ?? [];
    rows.push(...chunk);

    if (chunk.length < ADMIN_PAGE_SIZE) break;
  }

  return rows;
};

const chartConfig = {
  repayments: {
    label: "Tagihan Masuk",
    color: "var(--pf-cash)",
  },
  loanOut: {
    label: "Pinjaman Keluar",
    color: "var(--pf-danger)",
  },
  savingsIn: {
    label: "Tabungan Masuk",
    color: "var(--pf-bank)",
  },
  savingsOut: {
    label: "Tabungan Keluar",
    color: "var(--pf-warning)",
  },
} satisfies ChartConfig;

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const formatCurrency = (value: number) => currency.format(value || 0);

const parseCurrencyInput = (value: string) => {
  const normalized = value.replace(/[^\d]/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
};

const formatDateTime = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
      }).format(new Date(value))
    : new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value));

const isRepaymentTransaction = (type: string | null | undefined) =>
  (type ?? "").toLowerCase() === "repayment";

const isSavingsDeposit = (type: string | null | undefined) =>
  (type ?? "").toLowerCase() === "deposit";

const isSavingsWithdrawal = (type: string | null | undefined) =>
  (type ?? "").toLowerCase() === "withdrawal";

const isLoanDisbursement = (type: string | null | undefined) =>
  (type ?? "").toLowerCase() === "disbursement";

const paymentGroup = (method: string | null | undefined) => {
  const normalized = (method ?? "").toLowerCase();
  if (normalized === "transfer" || normalized === "bank") return "bank";
  if (normalized === "bill_offset" || normalized === "offset") return "nonCash";
  return "cash";
};

const paymentLabel = (method: string | null | undefined) => {
  const normalized = (method ?? "").toLowerCase();
  if (normalized === "transfer" || normalized === "bank") return "Bank";
  if (normalized === "bill_offset" || normalized === "offset") return "Non-Cash";
  return "Cash";
};

const sumAmount = <T extends { amount: number }>(items: T[]) =>
  items.reduce((sum, item) => sum + (item.amount ?? 0), 0);

const formatCompactCurrency = (value: number) => {
  const sign = value < 0 ? "- " : "";
  const absolute = Math.abs(value || 0);
  return `${sign}${currency.format(absolute)}`;
};

const chartPillClass = (
  key: keyof typeof chartConfig,
  active: boolean
) => {
  const colors: Record<keyof typeof chartConfig, string> = {
    repayments: "border-[var(--pf-cash)]/45 bg-[var(--pf-cash)]/12 text-[var(--pf-cash)]",
    loanOut: "border-[var(--pf-danger)]/45 bg-[var(--pf-danger)]/12 text-[var(--pf-danger)]",
    savingsIn: "border-[var(--pf-bank)]/45 bg-[var(--pf-bank)]/12 text-[var(--pf-bank)]",
    savingsOut: "border-[var(--pf-warning)]/45 bg-[var(--pf-warning)]/12 text-[var(--pf-warning)]",
  };

  return active
    ? colors[key]
    : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground";
};

const levelFromPoints = (points: number) => {
  if (points >= 100) return 3;
  if (points >= 50) return 2;
  return 1;
};

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const getRangeStartDate = (timeRange: string) => {
  const referenceDate = startOfDay(new Date());
  const startDate = new Date(referenceDate);

  if (timeRange === "today") {
    return startDate;
  }

  const daysToSubtract = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
  startDate.setDate(startDate.getDate() - (daysToSubtract - 1));
  return startDate;
};

const getDefaultSummaryStartDate = () => {
  const date = startOfDay(new Date());
  date.setDate(date.getDate() - 89);
  return date;
};

const toDateInputValue = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

const parseDateInput = (value: string) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const getInclusiveEndDate = (date: Date) => {
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);
  return endDate;
};

const toDayKey = (value: string | Date) => {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
};

const formatDayLabel = (value: string) => {
  const date = new Date(value);
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
  }).format(date);
};

const getAdminModeFromLocation = () => {
  const { pathname, search, hash } = window.location;
  if (pathname.startsWith("/admin")) return true;

  const params = new URLSearchParams(search);
  if (params.get("admin") === "1") return true;

  if (hash.match(/#\/admin/i)) return true;

  return false;
};

const getInitials = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

const statusBadgeVariant = (status: string) => {
  if (status === "active") return "secondary" as const;
  if (status === "archived" || status === "paid_off" || status === "closed") {
    return "outline" as const;
  }
  return "secondary" as const;
};

const emptyRewardForm = (): RewardFormState => ({
  title: "",
  description: "",
  pointSource: "profile",
  pointsCost: "0",
  sortOrder: "0",
  isActive: true,
});

const adminSidebarItems = [
  {
    key: "overview",
    label: "Overview",
    title: "Overview",
    subtitle: "Ringkasan uang dan aktivitas utama.",
    icon: HouseIcon,
  },
  {
    key: "loans",
    label: "Pinjaman",
    title: "Portfolio Pinjaman",
    subtitle: "Prioritas tagih dan sisa pinjaman.",
    icon: TrendingDownIcon,
  },
  {
    key: "savings",
    label: "Tabungan",
    title: "Portfolio Tabungan",
    subtitle: "Saldo tabungan dan aktivitas akun.",
    icon: WalletCardsIcon,
  },
  {
    key: "customers",
    label: "Nasabah",
    title: "Nasabah",
    subtitle: "Nilai bisnis, risiko, dan loyalitas.",
    icon: UsersIcon,
  },
  {
    key: "rewards",
    label: "Poin & Hadiah",
    title: "Poin & Hadiah",
    subtitle: "Katalog hadiah dan nasabah siap klaim.",
    icon: GiftIcon,
  },
  {
    key: "point-docs",
    label: "Dokumen Poin",
    title: "Dokumen Poin",
    subtitle: "Aturan dan referensi sistem poin.",
    icon: FileTextIcon,
  },
] as const;

type AdminPanelPageProps = {
  adminEmail?: string | null;
  onRequestSignOut?: () => Promise<void> | void;
};

const AdminPanelPage: React.FC<AdminPanelPageProps> = ({
  adminEmail,
  onRequestSignOut,
}) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [savingsAccounts, setSavingsAccounts] = useState<SavingsAccountRecord[]>(
    []
  );
  const [pointLedger, setPointLedger] = useState<PointLedgerRecord[]>([]);
  const [shareLinks, setShareLinks] = useState<ShareLinkRecord[]>([]);
  const [loanTransactions, setLoanTransactions] = useState<LoanTransactionRecord[]>(
    []
  );
  const [savingsTransactions, setSavingsTransactions] = useState<
    SavingsTransactionRecord[]
  >([]);
  const [businessCashLedger, setBusinessCashLedger] = useState<
    BusinessCashLedgerRecord[]
  >([]);
  const [businessCashReady, setBusinessCashReady] = useState(true);
  const [profileExtraFieldsReady, setProfileExtraFieldsReady] = useState(true);
  const [rewards, setRewards] = useState<RewardRecord[]>([]);
  const [rewardCatalogReady, setRewardCatalogReady] = useState(true);
  const [notice, setNotice] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [customerSegment, setCustomerSegment] = useState<
    "all" | "priority" | "points" | "savings" | "outstanding" | "risk"
  >("all");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null
  );
  const [activeTab, setActiveTab] = useState("overview");
  const [timeRange, setTimeRange] = useState("90d");
  const [visibleChartSeries, setVisibleChartSeries] = useState<
    Record<keyof typeof chartConfig, boolean>
  >({
    repayments: true,
    loanOut: true,
    savingsIn: true,
    savingsOut: true,
  });
  const [summaryStartDate, setSummaryStartDate] = useState(() =>
    toDateInputValue(getDefaultSummaryStartDate())
  );
  const [summaryEndDate, setSummaryEndDate] = useState(() =>
    toDateInputValue(new Date())
  );
  const [businessCashAmount, setBusinessCashAmount] = useState("");
  const [businessCashNote, setBusinessCashNote] = useState("");
  const [editingProfile, setEditingProfile] = useState<ProfileViewModel | null>(
    null
  );
  const [profileForm, setProfileForm] = useState<ProfileFormState | null>(null);
  const [adjustingProfile, setAdjustingProfile] =
    useState<ProfileViewModel | null>(null);
  const [pointAdjustment, setPointAdjustment] =
    useState<PointAdjustmentState | null>(null);
  const [editingReward, setEditingReward] = useState<RewardRecord | null>(null);
  const [rewardForm, setRewardForm] = useState<RewardFormState | null>(null);
  const [shareLinkPreview, setShareLinkPreview] = useState<{
    name: string;
    link: string;
  } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAdjustment, setSavingAdjustment] = useState(false);
  const [savingReward, setSavingReward] = useState(false);
  const [savingBusinessCash, setSavingBusinessCash] = useState(false);

  const loadAdminData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      let profilesData: ProfileRecord[] = [];
      const profilesRes = await adminSupabase
        .from("customer_profiles")
        .select(
          "id, full_name, phone, location, business_category, religion, status, photo_url, created_at"
        )
        .order("created_at", { ascending: false });

      if (profilesRes.error) {
        if (isMissingProfileExtraFieldsError(profilesRes.error)) {
          const fallbackProfilesRes = await adminSupabase
            .from("customer_profiles")
            .select("id, full_name, phone, location, status, photo_url, created_at")
            .order("created_at", { ascending: false });

          if (fallbackProfilesRes.error) throw fallbackProfilesRes.error;

          profilesData = ((fallbackProfilesRes.data ?? []) as Array<
            Omit<ProfileRecord, "business_category" | "religion">
          >).map((item) => ({
            ...item,
            business_category: null,
            religion: null,
          }));
          setProfileExtraFieldsReady(false);
        } else {
          throw profilesRes.error;
        }
      } else {
        profilesData = (profilesRes.data ?? []) as ProfileRecord[];
        setProfileExtraFieldsReady(true);
      }

      const [
        loansRes,
        savingsRes,
        pointsRes,
        shareRes,
        loanTransactionsData,
        savingsTransactionsData,
        businessCashRes,
        rewardsRes,
      ] = await Promise.all([
        adminSupabase
          .from("loans")
          .select(
            "id, profile_id, principal_amount, installment_amount_snapshot, installments, start_date, status"
          )
          .order("start_date", { ascending: false }),
        adminSupabase
          .from("savings_accounts")
          .select("id, profile_id, account_name, status")
          .order("created_at", { ascending: false }),
        adminSupabase
          .from("profile_point_ledger")
          .select("id, profile_id, loan_id, event_type, points_delta, event_date, notes")
          .order("event_date", { ascending: false }),
        adminSupabase
          .from("profile_share_links")
          .select("id, profile_id, share_token, is_active, created_at")
          .order("created_at", { ascending: false }),
        fetchAdminPagedRows<LoanTransactionRecord>((from, to) =>
          adminSupabase
            .from("loan_transactions")
            .select("id, profile_id, loan_id, amount, transaction_date, type, payment_method")
            .order("transaction_date", { ascending: false })
            .range(from, to)
        ),
        fetchAdminPagedRows<SavingsTransactionRecord>((from, to) =>
          adminSupabase
            .from("savings_transactions")
            .select("id, savings_account_id, profile_id, amount, transaction_date, type, payment_method")
            .order("transaction_date", { ascending: false })
            .range(from, to)
        ),
        adminSupabase
          .from("business_cash_ledger")
          .select("id, direction, amount, note, event_date, created_at")
          .order("event_date", { ascending: false })
          .limit(500),
        adminSupabase
          .from("reward_catalog")
          .select(
            "id, title, description, category, point_source, points_cost, is_active, is_repeatable, sort_order, created_at"
          )
          .order("sort_order", { ascending: true }),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (loansRes.error) throw loansRes.error;
      if (savingsRes.error) throw savingsRes.error;
      if (pointsRes.error) throw pointsRes.error;
      if (shareRes.error) throw shareRes.error;

      setProfiles(profilesData);
      setLoans((loansRes.data ?? []) as LoanRecord[]);
      setSavingsAccounts((savingsRes.data ?? []) as SavingsAccountRecord[]);
      setPointLedger((pointsRes.data ?? []) as PointLedgerRecord[]);
      setShareLinks((shareRes.data ?? []) as ShareLinkRecord[]);
      setLoanTransactions(loanTransactionsData);
      setSavingsTransactions(savingsTransactionsData);

      if (businessCashRes.error) {
        const cashErrorCode = (businessCashRes.error as { code?: string }).code;
        if (cashErrorCode === "42P01" || cashErrorCode === "PGRST205") {
          setBusinessCashReady(false);
          setBusinessCashLedger([]);
        } else {
          throw businessCashRes.error;
        }
      } else {
        setBusinessCashReady(true);
        setBusinessCashLedger(
          (businessCashRes.data ?? []) as BusinessCashLedgerRecord[]
        );
      }

        if (rewardsRes.error) {
          const rewardErrorCode = (rewardsRes.error as { code?: string }).code;
          if (rewardErrorCode === "42P01" || rewardErrorCode === "PGRST205") {
            setRewardCatalogReady(false);
            setRewards([]);
          } else {
            throw rewardsRes.error;
          }
      } else {
        setRewardCatalogReady(true);
        setRewards((rewardsRes.data ?? []) as RewardRecord[]);
      }
    } catch (error) {
      setNotice({
        type: "error",
        text: `Gagal memuat admin panel: ${formatAdminError(error)}`,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.body.classList.add("dark");

    return () => {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    };
  }, []);

  useEffect(() => {
    const tabStillExists = adminSidebarItems.some((item) => item.key === activeTab);
    if (!tabStillExists) setActiveTab("overview");
  }, [activeTab]);

  const activePageMeta =
    adminSidebarItems.find((item) => item.key === activeTab) ??
    adminSidebarItems[0];

  const profileViewModels = useMemo<ProfileViewModel[]>(() => {
    const activeLoanIds = new Set(
      loans.filter((loan) => loan.status === "active").map((loan) => loan.id)
    );

    const latestShareLinkByProfile = new Map<string, ShareLinkRecord>();
    shareLinks.forEach((link) => {
      if (!latestShareLinkByProfile.has(link.profile_id) && link.is_active) {
        latestShareLinkByProfile.set(link.profile_id, link);
      }
    });

    return profiles.map((profile) => {
      const profileLoans = loans.filter((loan) => loan.profile_id === profile.id);
      const profileSavings = savingsAccounts.filter(
        (account) => account.profile_id === profile.id
      );
      const profilePoints = pointLedger
        .filter((entry) => entry.profile_id === profile.id)
        .reduce((sum, entry) => sum + entry.points_delta, 0);
      const activeLoanPoints = pointLedger
        .filter(
          (entry) =>
            entry.profile_id === profile.id &&
            entry.loan_id &&
            activeLoanIds.has(entry.loan_id)
        )
        .reduce((sum, entry) => sum + entry.points_delta, 0);

      return {
        profile,
        activeLoans: profileLoans.filter((loan) => loan.status === "active"),
        archivedLoans: profileLoans.filter((loan) => loan.status !== "active"),
        activeSavings: profileSavings.filter((account) => account.status === "active"),
        profilePoints,
        activeLoanPoints,
        level: levelFromPoints(profilePoints),
        latestShareLink: latestShareLinkByProfile.get(profile.id) ?? null,
      };
    });
  }, [loans, pointLedger, profiles, savingsAccounts, shareLinks]);

  const customerInsights = useMemo<CustomerInsight[]>(() => {
    return profileViewModels.map((item) => {
      const outstanding = item.activeLoans.reduce((sum, loan) => {
        const target =
          (loan.installment_amount_snapshot ?? 0) * (loan.installments ?? 0);
        const paid = loanTransactions
          .filter(
            (transaction) =>
              transaction.loan_id === loan.id &&
              isRepaymentTransaction(transaction.type)
          )
          .reduce((total, transaction) => total + transaction.amount, 0);
        return sum + Math.max(target - paid, 0);
      }, 0);
      const paid = item.activeLoans.reduce((sum, loan) => {
        return (
          sum +
          loanTransactions
            .filter(
              (transaction) =>
                transaction.loan_id === loan.id &&
                isRepaymentTransaction(transaction.type)
            )
            .reduce((total, transaction) => total + transaction.amount, 0)
        );
      }, 0);
      const profileSavingsAccountIds = new Set(
        item.activeSavings.map((account) => account.id)
      );
      const savingsBalance = savingsTransactions
        .filter((transaction) => {
          const accountId = (transaction as SavingsTransactionRecord & {
            savings_account_id?: string | null;
          }).savings_account_id;
          return (
            transaction.profile_id === item.profile.id ||
            (accountId ? profileSavingsAccountIds.has(accountId) : false)
          );
        })
        .reduce((sum, transaction) => {
          if (isSavingsWithdrawal(transaction.type)) return sum - transaction.amount;
          if (isSavingsDeposit(transaction.type)) return sum + transaction.amount;
          return sum;
        }, 0);
      const totalPoints = item.profilePoints + item.activeLoanPoints;
      const risk: CustomerInsight["risk"] =
        outstanding >= 10000000
          ? "Prioritas"
          : outstanding > 0 && paid === 0
          ? "Pantau"
          : "Aman";

      return {
        item,
        outstanding,
        paid,
        savingsBalance,
        totalPoints,
        risk,
        valueScore: outstanding + savingsBalance + totalPoints * 10000,
      };
    });
  }, [loanTransactions, profileViewModels, savingsTransactions]);

  const filteredCustomerInsights = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const searched = keyword
      ? customerInsights.filter(({ item }) =>
          [
            item.profile.full_name,
            item.profile.phone ?? "",
            item.profile.location ?? "",
            item.profile.business_category ?? "",
            item.profile.religion ?? "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(keyword)
        )
      : customerInsights;

    const segmented = searched.filter((insight) => {
      if (customerSegment === "priority") return insight.outstanding > 0;
      if (customerSegment === "risk") return insight.risk !== "Aman";
      return true;
    });

    return [...segmented].sort((left, right) => {
      if (customerSegment === "points") return right.totalPoints - left.totalPoints;
      if (customerSegment === "savings") return right.savingsBalance - left.savingsBalance;
      if (customerSegment === "outstanding" || customerSegment === "priority") {
        return right.outstanding - left.outstanding;
      }
      if (customerSegment === "risk") {
        return right.outstanding - left.outstanding;
      }
      return right.valueScore - left.valueScore;
    });
  }, [customerInsights, customerSegment, search]);

  const selectedCustomerInsight = useMemo(
    () =>
      selectedCustomerId
        ? customerInsights.find(
            (insight) => insight.item.profile.id === selectedCustomerId
          ) ?? null
        : null,
    [customerInsights, selectedCustomerId]
  );

  const selectedCustomerActivities = useMemo<MoneyActivity[]>(() => {
    if (!selectedCustomerInsight) return [];

    const profileId = selectedCustomerInsight.item.profile.id;
    const savingsAccountIds = new Set(
      selectedCustomerInsight.item.activeSavings.map((account) => account.id)
    );
    const activities: MoneyActivity[] = [];

    loanTransactions
      .filter((transaction) => transaction.profile_id === profileId)
      .forEach((transaction) => {
        if (
          !isRepaymentTransaction(transaction.type) &&
          !isLoanDisbursement(transaction.type)
        ) {
          return;
        }

        activities.push({
          id: `loan-detail-${transaction.id}`,
          title: isLoanDisbursement(transaction.type)
            ? "Pinjaman Keluar"
            : "Tagihan Masuk",
          detail: paymentLabel(transaction.payment_method),
          amount: transaction.amount,
          direction: isLoanDisbursement(transaction.type) ? "out" : "in",
          kind: isLoanDisbursement(transaction.type) ? "loan_out" : "repayment",
          date: transaction.transaction_date,
          method: transaction.payment_method,
        });
      });

    savingsTransactions
      .filter((transaction) => {
        const accountId = transaction.savings_account_id;
        return (
          transaction.profile_id === profileId ||
          (accountId ? savingsAccountIds.has(accountId) : false)
        );
      })
      .forEach((transaction) => {
        const isOut = isSavingsWithdrawal(transaction.type);
        activities.push({
          id: `savings-detail-${transaction.id}`,
          title: isOut ? "Tarik Tabungan" : "Tabungan Masuk",
          detail: paymentLabel(transaction.payment_method),
          amount: transaction.amount,
          direction: isOut ? "out" : "in",
          kind: isOut ? "savings_out" : "savings_in",
          date: transaction.transaction_date,
          method: transaction.payment_method,
        });
      });

    return activities
      .sort(
        (left, right) =>
          new Date(right.date).getTime() - new Date(left.date).getTime()
      )
      .slice(0, 8);
  }, [loanTransactions, savingsTransactions, selectedCustomerInsight]);

  const loanPortfolio = useMemo(() => {
    const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

    return loans
      .map((loan) => {
        const target =
          (loan.installment_amount_snapshot ?? 0) * (loan.installments ?? 0);
        const repayments = loanTransactions.filter(
          (transaction) =>
            transaction.loan_id === loan.id &&
            isRepaymentTransaction(transaction.type)
        );
        const paid = sumAmount(repayments);
        const outstanding = Math.max(target - paid, 0);
        const expectedProfit = Math.max(target - (loan.principal_amount ?? 0), 0);
        const progress = target > 0 ? paid / target : 0;
        const profile = profileById.get(loan.profile_id);

        return {
          loan,
          profile,
          target,
          paid,
          outstanding,
          expectedProfit,
          progress,
          risk:
            loan.status === "active" && outstanding > 0 && paid === 0
              ? "Pantau"
              : loan.status === "active" && outstanding >= 10000000
              ? "Prioritas"
              : "Aman",
        };
      })
      .sort((left, right) => {
        if (left.loan.status !== right.loan.status) {
          return left.loan.status === "active" ? -1 : 1;
        }
        return right.outstanding - left.outstanding;
      });
  }, [loanTransactions, loans, profiles]);

  const savingsPortfolio = useMemo(() => {
    const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

    return savingsAccounts
      .map((account) => {
        const transactions = savingsTransactions.filter(
          (transaction) =>
            transaction.savings_account_id === account.id ||
            (!transaction.savings_account_id &&
              transaction.profile_id === account.profile_id)
        );
        const deposits = transactions
          .filter((transaction) => isSavingsDeposit(transaction.type))
          .reduce((sum, transaction) => sum + transaction.amount, 0);
        const withdrawals = transactions
          .filter((transaction) => isSavingsWithdrawal(transaction.type))
          .reduce((sum, transaction) => sum + transaction.amount, 0);

        return {
          account,
          profile: profileById.get(account.profile_id),
          deposits,
          withdrawals,
          balance: deposits - withdrawals,
          transactions: transactions.length,
        };
      })
      .sort((left, right) => right.balance - left.balance);
  }, [profiles, savingsAccounts, savingsTransactions]);

  const rewardCandidates = useMemo(() => {
    const activeRewards = rewards
      .filter((reward) => reward.is_active)
      .sort((left, right) => left.points_cost - right.points_cost);

    return customerInsights
      .map((insight) => {
        const availableRewards = activeRewards.filter((reward) => {
          const points =
            reward.point_source === "profile"
              ? insight.item.profilePoints
              : insight.item.activeLoanPoints;
          return points >= reward.points_cost;
        });

        return {
          insight,
          availableRewards,
        };
      })
      .filter((item) => item.availableRewards.length > 0)
      .sort((left, right) => right.insight.totalPoints - left.insight.totalPoints);
  }, [customerInsights, rewards]);

  const analyticsData = useMemo<AnalyticsRow[]>(() => {
    const rows = new Map<string, AnalyticsRow>();
    for (let offset = 89; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      const key = toDayKey(date);
      rows.set(key, {
        date: key,
        label: formatDayLabel(key),
        repayments: 0,
        loanOut: 0,
        savingsIn: 0,
        savingsOut: 0,
      });
    }

    loanTransactions.forEach((item) => {
      const key = toDayKey(item.transaction_date);
      const row = rows.get(key);
      if (!row) return;
      if (isLoanDisbursement(item.type)) {
        row.loanOut += item.amount ?? 0;
        return;
      }
      if (isRepaymentTransaction(item.type)) {
        row.repayments += item.amount ?? 0;
      }
    });

    savingsTransactions.forEach((item) => {
      const key = toDayKey(item.transaction_date);
      const row = rows.get(key);
      if (!row) return;
      if (isSavingsWithdrawal(item.type)) {
        row.savingsOut += item.amount ?? 0;
        return;
      }
      row.savingsIn += item.amount ?? 0;
    });

    return Array.from(rows.values());
  }, [loanTransactions, savingsTransactions]);

  const filteredAnalyticsData = useMemo(() => {
    const startDate = getRangeStartDate(timeRange);
    return analyticsData.filter((item) => new Date(item.date) >= startDate);
  }, [analyticsData, timeRange]);

  const summary = useMemo(() => {
    const parsedStartDate = parseDateInput(summaryStartDate);
    const parsedEndDate = parseDateInput(summaryEndDate);
    const rangeStartDate = parsedStartDate ?? parsedEndDate ?? null;
    const rangeEndDate = parsedEndDate
      ? getInclusiveEndDate(parsedEndDate)
      : parsedStartDate
      ? getInclusiveEndDate(parsedStartDate)
      : null;
    const isWithinSummaryRange = (value: string) => {
      const date = new Date(value);
      if (rangeStartDate && date < rangeStartDate) return false;
      if (rangeEndDate && date > rangeEndDate) return false;
      return true;
    };
    const activeLoans = loans.filter((loan) => loan.status === "active");
    const loanById = new Map<string, LoanRecord>(
      loans.map((loan) => [loan.id, loan])
    );
    const rangeLoans = loans.filter((loan) => isWithinSummaryRange(loan.start_date));
    const rangeLoanTransactions = loanTransactions.filter(
      (item) => isWithinSummaryRange(item.transaction_date)
    );
    const rangeSavingsTransactions = savingsTransactions.filter(
      (item) => isWithinSummaryRange(item.transaction_date)
    );
    const rangeRepayments = rangeLoanTransactions.filter((item) =>
      isRepaymentTransaction(item.type)
    );
    const rangeDisbursements = rangeLoanTransactions.filter((item) =>
      isLoanDisbursement(item.type)
    );
    const rangeSavingsDeposits = rangeSavingsTransactions.filter((item) =>
      isSavingsDeposit(item.type)
    );
    const rangeSavingsWithdrawals = rangeSavingsTransactions.filter((item) =>
      isSavingsWithdrawal(item.type)
    );
    const ledgerIn = businessCashLedger.filter(
      (item) => item.direction === "in" && isWithinSummaryRange(item.event_date)
    );
    const ledgerOut = businessCashLedger.filter(
      (item) => item.direction === "out" && isWithinSummaryRange(item.event_date)
    );
    const fallbackLoanOut = rangeLoans.reduce(
      (sum, loan) => sum + (loan.principal_amount ?? 0),
      0
    );
    const totalLoanOut =
      rangeDisbursements.length > 0 ? sumAmount(rangeDisbursements) : fallbackLoanOut;
    const totalRepayments = sumAmount(rangeRepayments);
    const totalSavingsIn = sumAmount(rangeSavingsDeposits);
    const totalSavingsOut = sumAmount(rangeSavingsWithdrawals);
    const allSavingsIn = savingsTransactions
      .filter((item) => isSavingsDeposit(item.type))
      .reduce((sum, item) => sum + item.amount, 0);
    const allSavingsOut = savingsTransactions
      .filter((item) => isSavingsWithdrawal(item.type))
      .reduce((sum, item) => sum + item.amount, 0);
    const cashRepayments = rangeRepayments.filter(
      (item) => paymentGroup(item.payment_method) === "cash"
    );
    const bankRepayments = rangeRepayments.filter(
      (item) => paymentGroup(item.payment_method) === "bank"
    );
    const nonCashRepayments = rangeRepayments.filter(
      (item) => paymentGroup(item.payment_method) === "nonCash"
    );
    const cashSavingsIn = rangeSavingsDeposits.filter(
      (item) => paymentGroup(item.payment_method) === "cash"
    );
    const bankSavingsIn = rangeSavingsDeposits.filter(
      (item) => paymentGroup(item.payment_method) === "bank"
    );
    const nonCashSavingsIn = rangeSavingsDeposits.filter(
      (item) => paymentGroup(item.payment_method) === "nonCash"
    );
    const cashLoanOut = rangeDisbursements.filter(
      (item) => paymentGroup(item.payment_method) === "cash"
    );
    const bankLoanOut = rangeDisbursements.filter(
      (item) => paymentGroup(item.payment_method) === "bank"
    );
    const nonCashLoanOut = rangeDisbursements.filter(
      (item) => paymentGroup(item.payment_method) === "nonCash"
    );
    const cashSavingsOut = rangeSavingsWithdrawals.filter(
      (item) => paymentGroup(item.payment_method) === "cash"
    );
    const bankSavingsOut = rangeSavingsWithdrawals.filter(
      (item) => paymentGroup(item.payment_method) === "bank"
    );
    const nonCashSavingsOut = rangeSavingsWithdrawals.filter(
      (item) => paymentGroup(item.payment_method) === "nonCash"
    );
    const cashIn =
      sumAmount(cashRepayments) + sumAmount(cashSavingsIn) + sumAmount(ledgerIn);
    const bankIn = sumAmount(bankRepayments) + sumAmount(bankSavingsIn);
    const nonCashIn = sumAmount(nonCashRepayments) + sumAmount(nonCashSavingsIn);
    const cashOut =
      sumAmount(cashLoanOut) + sumAmount(cashSavingsOut) + sumAmount(ledgerOut);
    const bankOut = sumAmount(bankLoanOut) + sumAmount(bankSavingsOut);
    const nonCashOut = sumAmount(nonCashLoanOut) + sumAmount(nonCashSavingsOut);
    const fallbackUnclassifiedLoanOut =
      rangeDisbursements.length > 0 ? 0 : fallbackLoanOut;
    const allRepayments = loanTransactions
      .filter((item) => isRepaymentTransaction(item.type))
      .reduce((sum, item) => sum + item.amount, 0);
    const allLedgerIn = businessCashLedger
      .filter((item) => item.direction === "in")
      .reduce((sum, item) => sum + item.amount, 0);
    const allLedgerOut = businessCashLedger
      .filter((item) => item.direction === "out")
      .reduce((sum, item) => sum + item.amount, 0);
    const allLoanDisbursements = loanTransactions.filter((item) =>
      isLoanDisbursement(item.type)
    );
    const allLoanOut =
      allLoanDisbursements.length > 0
        ? sumAmount(allLoanDisbursements)
        : loans.reduce((sum, loan) => sum + (loan.principal_amount ?? 0), 0);
    const totalOutstanding = activeLoans.reduce((sum, loan) => {
      const totalTarget =
        (loan.installment_amount_snapshot ?? 0) * (loan.installments ?? 0);
      const paid = loanTransactions
        .filter(
          (item) =>
            item.loan_id === loan.id && isRepaymentTransaction(item.type)
        )
        .reduce((total, item) => total + item.amount, 0);
      return sum + Math.max(totalTarget - paid, 0);
    }, 0);
    const profitFromRepayments = rangeRepayments.reduce((sum, transaction) => {
      if (!transaction.loan_id) return sum;
      const loan = loanById.get(transaction.loan_id);
      if (!loan) return sum;
      const target =
        (loan.installment_amount_snapshot ?? 0) * (loan.installments ?? 0);
      if (target <= 0) return sum;
      const expectedProfit = Math.max(target - (loan.principal_amount ?? 0), 0);
      return sum + transaction.amount * (expectedProfit / target);
    }, 0);
    const principalRecovered = rangeRepayments.reduce((sum, transaction) => {
      if (!transaction.loan_id) return sum;
      const loan = loanById.get(transaction.loan_id);
      if (!loan) return sum;
      const target =
        (loan.installment_amount_snapshot ?? 0) * (loan.installments ?? 0);
      if (target <= 0) return sum;
      return sum + transaction.amount * ((loan.principal_amount ?? 0) / target);
    }, 0);
    const expectedActiveProfit = activeLoans.reduce((sum, loan) => {
      const target =
        (loan.installment_amount_snapshot ?? 0) * (loan.installments ?? 0);
      return sum + Math.max(target - (loan.principal_amount ?? 0), 0);
    }, 0);
    const activePrincipal = activeLoans.reduce(
      (sum, loan) => sum + (loan.principal_amount ?? 0),
      0
    );

    return {
      totalLoanOut,
      totalRepayments,
      totalSavingsIn,
      totalSavingsOut,
      savingsBalance: allSavingsIn - allSavingsOut,
      businessCashBalance:
        allRepayments + allSavingsIn + allLedgerIn - allLoanOut - allSavingsOut - allLedgerOut,
      totalOutstanding,
      realizedProfit: profitFromRepayments,
      principalRecovered,
      expectedActiveProfit,
      activePrincipal,
      collectionRate:
        totalOutstanding + totalRepayments > 0
          ? totalRepayments / (totalOutstanding + totalRepayments)
          : 0,
      cashIn,
      bankIn,
      nonCashIn,
      cashOut: cashOut + fallbackUnclassifiedLoanOut,
      bankOut,
      nonCashOut,
      cashBalance: cashIn - cashOut - fallbackUnclassifiedLoanOut,
      bankBalance: bankIn - bankOut,
      netMovement: cashIn + bankIn - cashOut - bankOut - fallbackUnclassifiedLoanOut,
      nonCashMovement: nonCashIn - nonCashOut,
      readyToRotate:
        cashIn + bankIn - cashOut - bankOut - fallbackUnclassifiedLoanOut - (allSavingsIn - allSavingsOut),
      activeLoansCount: activeLoans.length,
      activeSavingsCount: savingsAccounts.filter(
        (account) => account.status === "active"
      ).length,
    };
  }, [
    businessCashLedger,
    loanTransactions,
    loans,
    savingsAccounts,
    savingsTransactions,
    summaryEndDate,
    summaryStartDate,
  ]);

  const recentMoneyActivities = useMemo<MoneyActivity[]>(() => {
    const profileNameById = new Map<string, string>(
      profiles.map((profile) => [profile.id, profile.full_name])
    );
    const activities: MoneyActivity[] = [];

    const loanDisbursementTransactions = loanTransactions.filter((item) =>
      isLoanDisbursement(item.type)
    );

    if (loanDisbursementTransactions.length === 0) loans.forEach((loan) => {
      activities.push({
        id: `loan-${loan.id}`,
        title: "Pinjaman Keluar",
        detail: profileNameById.get(loan.profile_id) ?? "Nasabah tidak ditemukan",
        amount: loan.principal_amount ?? 0,
        direction: "out",
        kind: "loan_out",
        date: loan.start_date,
        method: null,
      });
    });

    loanTransactions.forEach((item) => {
      if (!isRepaymentTransaction(item.type) && !isLoanDisbursement(item.type)) return;
      activities.push({
        id: `loan-tx-${item.id}`,
        title: isLoanDisbursement(item.type) ? "Pinjaman Keluar" : "Tagihan Masuk",
        detail: profileNameById.get(item.profile_id) ?? "Transaksi pinjaman",
        amount: item.amount ?? 0,
        direction: isLoanDisbursement(item.type) ? "out" : "in",
        kind: isLoanDisbursement(item.type) ? "loan_out" : "repayment",
        date: item.transaction_date,
        method: item.payment_method,
      });
    });

    savingsTransactions.forEach((item) => {
      const isOut = isSavingsWithdrawal(item.type);
      activities.push({
        id: `savings-tx-${item.id}`,
        title: isOut ? "Tabungan Keluar" : "Tabungan Masuk",
        detail: profileNameById.get(item.profile_id) ?? "Transaksi tabungan",
        amount: item.amount ?? 0,
        direction: isOut ? "out" : "in",
        kind: isOut ? "savings_out" : "savings_in",
        date: item.transaction_date,
        method: item.payment_method,
      });
    });

    businessCashLedger.forEach((item) => {
      activities.push({
        id: `cash-${item.id}`,
        title: item.direction === "in" ? "Kas Masuk" : "Kas Keluar",
        detail: item.note || "Penyesuaian uang bisnis",
        amount: item.amount ?? 0,
        direction: item.direction,
        kind: "cash",
        date: item.event_date,
        method: "cash",
      });
    });

    return activities
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
      .slice(0, 12);
  }, [businessCashLedger, loanTransactions, loans, profiles, savingsTransactions]);

  const priorityCustomers = useMemo<PriorityCustomer[]>(() => {
    return profileViewModels
      .map((item) => {
        const outstanding = item.activeLoans.reduce((sum, loan) => {
          const target =
            (loan.installment_amount_snapshot ?? 0) * (loan.installments ?? 0);
          const paid = loanTransactions
            .filter(
              (transaction) =>
                transaction.loan_id === loan.id &&
                isRepaymentTransaction(transaction.type)
            )
            .reduce((total, transaction) => total + transaction.amount, 0);
          return sum + Math.max(target - paid, 0);
        }, 0);
        const paid = item.activeLoans.reduce((sum, loan) => {
          return (
            sum +
            loanTransactions
              .filter(
                (transaction) =>
                  transaction.loan_id === loan.id &&
                  isRepaymentTransaction(transaction.type)
              )
              .reduce((total, transaction) => total + transaction.amount, 0)
          );
        }, 0);

        return {
          id: item.profile.id,
          name: item.profile.full_name,
          detail:
            [item.profile.location, item.profile.business_category]
              .filter(Boolean)
              .join(" | ") || "Nasabah",
          outstanding,
          paid,
          activeLoans: item.activeLoans.length,
          savingsAccounts: item.activeSavings.length,
          points: item.profilePoints + item.activeLoanPoints,
          level: item.level,
        };
      })
      .filter((item) => item.outstanding > 0)
      .sort((left, right) => right.outstanding - left.outstanding)
      .slice(0, 6);
  }, [loanTransactions, profileViewModels]);

  const openProfileEditor = (item: ProfileViewModel) => {
    setEditingProfile(item);
    setProfileForm({
      fullName: item.profile.full_name,
      phone: item.profile.phone ?? "",
      location: item.profile.location ?? "",
      businessCategory: item.profile.business_category ?? "",
      religion: item.profile.religion ?? "",
      status: item.profile.status,
    });
  };

  const openPointAdjustment = (item: ProfileViewModel) => {
    setAdjustingProfile(item);
    setPointAdjustment({
      mode: "profile",
      loanId: item.activeLoans[0]?.id ?? "",
      amount: "",
      note: "",
    });
  };

  const openRewardEditor = (reward?: RewardRecord) => {
    setEditingReward(reward ?? null);
    setRewardForm(
      reward
        ? {
            title: reward.title,
            description: reward.description ?? "",
            pointSource: reward.point_source,
            pointsCost: String(reward.points_cost),
            sortOrder: String(reward.sort_order),
            isActive: reward.is_active,
          }
        : emptyRewardForm()
    );
  };

  const handleProfileSave = async () => {
    if (!editingProfile || !profileForm) return;
    setSavingProfile(true);
    try {
      const payload: Record<string, string | null> = {
        full_name: profileForm.fullName.trim(),
        phone: profileForm.phone.trim() || null,
        location: profileForm.location.trim() || null,
        status: profileForm.status,
      };

      if (profileExtraFieldsReady) {
        payload.business_category = profileForm.businessCategory.trim() || null;
        payload.religion = profileForm.religion.trim() || null;
      }

      const { error } = await adminSupabase
        .from("customer_profiles")
        .update(payload)
        .eq("id", editingProfile.profile.id);

      if (error) throw error;

      setNotice({
        type: "success",
        text: profileExtraFieldsReady
          ? "Data nasabah berhasil diperbarui."
          : "Data nasabah berhasil diperbarui. Field kategori usaha dan agama belum aktif di database.",
      });
      setEditingProfile(null);
      setProfileForm(null);
      await loadAdminData(true);
    } catch (error) {
      setNotice({
        type: "error",
        text: `Gagal menyimpan profile: ${String(error)}`,
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePointAdjust = async () => {
    if (!adjustingProfile || !pointAdjustment) return;
    const amount = Number(pointAdjustment.amount);
    if (!Number.isFinite(amount) || amount === 0) {
      setNotice({
        type: "info",
        text: "Masukkan jumlah poin yang valid, bisa plus atau minus.",
      });
      return;
    }

    setSavingAdjustment(true);
    try {
      const payload = {
        profile_id: adjustingProfile.profile.id,
        loan_id:
          pointAdjustment.mode === "active_loan"
            ? pointAdjustment.loanId || null
            : null,
        event_type: "admin_manual_adjustment",
        points_delta: Math.trunc(amount),
        event_date: new Date().toISOString(),
        notes: pointAdjustment.note.trim() || "Penyesuaian dari admin panel",
      };

      const { error } = await adminSupabase
        .from("profile_point_ledger")
        .insert(payload);

      if (error) throw error;

      setNotice({
        type: "success",
        text: "Poin berhasil disesuaikan.",
      });
      setAdjustingProfile(null);
      setPointAdjustment(null);
      await loadAdminData(true);
    } catch (error) {
      setNotice({
        type: "error",
        text: `Gagal menyesuaikan poin: ${String(error)}`,
      });
    } finally {
      setSavingAdjustment(false);
    }
  };

  const handleRewardSave = async () => {
    if (!rewardForm) return;
    const pointsCost = Number(rewardForm.pointsCost);
    const sortOrder = Number(rewardForm.sortOrder);

    if (!rewardForm.title.trim()) {
      setNotice({ type: "info", text: "Nama hadiah wajib diisi." });
      return;
    }

    setSavingReward(true);
    try {
      const payload = {
        title: rewardForm.title.trim(),
        description: rewardForm.description.trim() || null,
        category: editingReward?.category?.trim() || "Umum",
        point_source: rewardForm.pointSource,
        points_cost: Number.isFinite(pointsCost) ? Math.max(0, Math.trunc(pointsCost)) : 0,
        sort_order: Number.isFinite(sortOrder) ? Math.trunc(sortOrder) : 0,
        is_active: rewardForm.isActive,
        is_repeatable: rewardForm.pointSource === "profile",
      };

      const query = editingReward
        ? adminSupabase.from("reward_catalog").update(payload).eq("id", editingReward.id)
        : adminSupabase.from("reward_catalog").insert(payload);

      const { error } = await query;
      if (error) throw error;

      setNotice({
        type: "success",
        text: editingReward
          ? "Hadiah berhasil diperbarui."
          : "Hadiah baru berhasil ditambahkan.",
      });
      setEditingReward(null);
      setRewardForm(null);
      await loadAdminData(true);
    } catch (error) {
      setNotice({
        type: "error",
        text: `Gagal menyimpan hadiah: ${String(error)}`,
      });
    } finally {
      setSavingReward(false);
    }
  };

  const handleBusinessCashAdjust = async (direction: BusinessCashLedgerRecord["direction"]) => {
    if (!businessCashReady) {
      setNotice({
        type: "info",
        text: "Tabel uang kas belum tersedia. Jalankan SQL 010_business_cash_ledger.sql dulu.",
      });
      return;
    }

    const amount = parseCurrencyInput(businessCashAmount);
    if (!amount || amount <= 0) {
      setNotice({ type: "info", text: "Masukkan nominal uang kas yang valid." });
      return;
    }

    setSavingBusinessCash(true);
    try {
      const { error } = await adminSupabase.from("business_cash_ledger").insert({
        direction,
        amount,
        note:
          businessCashNote.trim() ||
          (direction === "in" ? "Tambah uang kas" : "Kurangi uang kas"),
      });

      if (error) throw error;

      setNotice({
        type: "success",
        text: direction === "in" ? "Uang kas berhasil ditambahkan." : "Uang kas berhasil dikurangi.",
      });
      setBusinessCashAmount("");
      setBusinessCashNote("");
      await loadAdminData(true);
    } catch (error) {
      setNotice({
        type: "error",
        text: `Gagal menyimpan uang kas: ${formatAdminError(error)}`,
      });
    } finally {
      setSavingBusinessCash(false);
    }
  };

  const handleShareLink = async (item: ProfileViewModel) => {
    try {
      const { data, error } = await adminSupabase.rpc(
        "get_or_create_profile_share_link",
        {
          p_profile_id: item.profile.id,
          p_label: "Link status nasabah",
        }
      );

      if (error) throw error;

      const token = data?.shareToken as string | undefined;
      if (!token) {
        throw new Error("Token share link tidak ditemukan.");
      }

      const link = `${window.location.origin}/?status=${token}`;
      try {
        await navigator.clipboard.writeText(link);
        setNotice({
          type: "success",
          text: "Share link berhasil disalin.",
        });
      } catch (clipboardError) {
        setShareLinkPreview({
          name: item.profile.full_name,
          link,
        });
        setNotice({
          type: "info",
          text: "Link berhasil dibuat, tapi browser menolak auto-copy. Salin manual dari popup.",
        });
        console.warn("Clipboard write failed", clipboardError);
      }
      await loadAdminData(true);
    } catch (error) {
      setNotice({
        type: "error",
        text: `Gagal membuat share link: ${formatAdminError(error)}`,
      });
    }
  };

  if (loading) {
    return (
      <div className="dark min-h-screen bg-background text-foreground">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-36 w-full rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-[520px] w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            "group hidden border-r border-border/70 bg-card/70 transition-all duration-300 ease-out md:flex md:w-[64px] md:hover:w-[236px]"
          )}
        >
          <div className="flex w-full flex-col gap-3 px-2 py-4">
            <div className="flex flex-col gap-1.5">
              {adminSidebarItems.map((item) => {
                const isActive = activeTab === item.key;
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveTab(item.key)}
                    className={cn(
                      "mx-auto flex h-10 w-10 items-center justify-center gap-0 overflow-hidden rounded-xl px-0 text-left transition-all duration-200 group-hover:mx-0 group-hover:h-11 group-hover:w-full group-hover:justify-start group-hover:gap-3 group-hover:rounded-2xl group-hover:px-3",
                      isActive
                        ? "text-foreground group-hover:bg-secondary group-hover:text-secondary-foreground"
                        : "text-muted-foreground hover:text-foreground group-hover:hover:bg-muted/60",
                    )}
                  >
                    <div className="flex size-5 shrink-0 items-center justify-center">
                      <Icon className="size-4" />
                    </div>
                    <span className="hidden truncate text-sm font-medium opacity-0 transition-opacity duration-200 group-hover:block group-hover:opacity-100">
                      {item.label}
                    </span>
                  </button>
                );
              })}
              {onRequestSignOut && (
                <button
                  type="button"
                  onClick={() => void onRequestSignOut()}
                  className="mx-auto flex h-10 w-10 items-center justify-center gap-0 overflow-hidden rounded-xl px-0 text-left text-muted-foreground transition-all duration-200 hover:text-foreground group-hover:mx-0 group-hover:h-11 group-hover:w-full group-hover:justify-start group-hover:gap-3 group-hover:rounded-2xl group-hover:px-3 group-hover:hover:bg-muted/60"
                >
                  <div className="flex size-5 shrink-0 items-center justify-center">
                    <LogOutIcon className="size-4" />
                  </div>
                  <span className="hidden truncate text-sm font-medium opacity-0 transition-opacity duration-200 group-hover:block group-hover:opacity-100">
                    Logout
                  </span>
                </button>
              )}
            </div>
          </div>
        </aside>

        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold tracking-tight">
                {activePageMeta.title}
              </h1>
              <p className="text-sm text-muted-foreground">
                {activePageMeta.subtitle}
                {adminEmail ? ` | ${adminEmail}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => loadAdminData(true)}
              disabled={refreshing}
            >
              <RefreshCwIcon data-icon="inline-start" />
              {refreshing ? "Memuat..." : "Refresh"}
            </Button>
            </div>
          </div>

        {notice && activeTab !== "point-docs" && (
          <Alert>
            <ShieldCheckIcon />
            <AlertTitle>
              {notice.type === "error"
                ? "Terjadi kendala"
                : notice.type === "success"
                ? "Berhasil"
                : "Info"}
            </AlertTitle>
            <AlertDescription>{notice.text}</AlertDescription>
          </Alert>
        )}

          {activeTab === "overview" && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3 rounded-lg border bg-card px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">Business cockpit</span>
                  <span className="text-xs text-muted-foreground">
                    {summaryStartDate || "Awal"} sampai {summaryEndDate || "hari ini"}
                  </span>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    aria-label="Tanggal mulai"
                    type="date"
                    value={summaryStartDate}
                    onChange={(event) => setSummaryStartDate(event.target.value)}
                    className="h-8 sm:w-[160px]"
                  />
                  <Input
                    aria-label="Tanggal sampai"
                    type="date"
                    value={summaryEndDate}
                    onChange={(event) => setSummaryEndDate(event.target.value)}
                    className="h-8 sm:w-[160px]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSummaryStartDate("");
                      setSummaryEndDate("");
                    }}
                  >
                    Semua
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
                <SummaryCard
                  title="Cash Di Tangan"
                  value={formatCompactCurrency(summary.cashBalance)}
                  description={
                    summary.cashBalance < 0
                      ? "Minus: cek saldo awal cash"
                      : "Cocokkan dengan uang fisik"
                  }
                  icon={WalletIcon}
                  tone="cash"
                />
                <SummaryCard
                  title="Saldo Bank"
                  value={formatCompactCurrency(summary.bankBalance)}
                  description={
                    summary.bankBalance < 0
                      ? "Minus: cek saldo awal bank"
                      : "Cocokkan dengan rekening"
                  }
                  icon={BanknoteIcon}
                  tone="bank"
                />
                <SummaryCard
                  title="Uang Masuk"
                  value={formatCompactCurrency(summary.totalRepayments)}
                  description="Tagihan/cicilan masuk"
                  icon={WalletCardsIcon}
                  tone="cash"
                />
                <SummaryCard
                  title="Uang Keluar"
                  value={formatCompactCurrency(summary.totalLoanOut + summary.totalSavingsOut)}
                  description="Pinjaman + tarik"
                  icon={TrendingDownIcon}
                  tone="danger"
                />
                <SummaryCard
                  title="Sisa Tagihan"
                  value={formatCompactCurrency(summary.totalOutstanding)}
                  description={`Belum tertagih dari ${summary.activeLoansCount} pinjaman`}
                  icon={ArrowUpDownIcon}
                  tone="warning"
                />
                <SummaryCard
                  title="Saldo Tabungan"
                  value={formatCompactCurrency(summary.savingsBalance)}
                  description="Uang titipan nasabah"
                  icon={WalletCardsIcon}
                  tone="warning"
                />
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <Card>
                  <CardHeader className="flex items-center gap-2 space-y-0 border-b py-4 sm:flex-row">
                    <div className="grid flex-1 gap-1">
                      <CardTitle>Cashflow</CardTitle>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {(
                          [
                            ["repayments", "Tagihan"],
                            ["loanOut", "Pinjaman"],
                            ["savingsIn", "Tabungan"],
                            ["savingsOut", "Tarik"],
                          ] as const
                        ).map(([key, label]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() =>
                              setVisibleChartSeries((current) => ({
                                ...current,
                                [key]: !current[key],
                              }))
                            }
                        className={cn(
                              "h-7 rounded-lg border px-2.5 text-xs font-medium transition-colors",
                              chartPillClass(key, visibleChartSeries[key])
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Select value={timeRange} onValueChange={setTimeRange}>
                      <SelectTrigger
                        className="hidden h-8 w-[140px] rounded-lg sm:ml-auto sm:flex"
                        aria-label="Pilih rentang waktu"
                      >
                        <SelectValue placeholder="90 hari" />
                      </SelectTrigger>
                      <SelectContent className="dark rounded-lg border-border bg-popover text-popover-foreground">
                        <SelectGroup>
                          <SelectItem value="90d">90 Hari</SelectItem>
                          <SelectItem value="30d">30 Hari</SelectItem>
                          <SelectItem value="7d">7 Hari</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </CardHeader>
                  <CardContent className="px-2 pt-4 sm:px-4">
                    <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
                      <AreaChart data={filteredAnalyticsData}>
                        <defs>
                          <linearGradient id="fillRepayments" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-repayments)" stopOpacity={0.42} />
                            <stop offset="95%" stopColor="var(--color-repayments)" stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="fillLoanOut" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-loanOut)" stopOpacity={0.24} />
                            <stop offset="95%" stopColor="var(--color-loanOut)" stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="fillSavingsIn" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-savingsIn)" stopOpacity={0.22} />
                            <stop offset="95%" stopColor="var(--color-savingsIn)" stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="fillSavingsOut" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-savingsOut)" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="var(--color-savingsOut)" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          minTickGap={32}
                          tickFormatter={(value) =>
                            new Date(value).toLocaleDateString("id-ID", {
                              month: "short",
                              day: "numeric",
                            })
                          }
                        />
                        <YAxis
                          tickFormatter={(value) =>
                            value >= 1000000
                              ? `${Math.round(value / 1000000)}jt`
                              : `${Math.round(value / 1000)}rb`
                          }
                          tickLine={false}
                          axisLine={false}
                          width={56}
                        />
                        <ChartTooltip
                          cursor={false}
                          content={
                            <ChartTooltipContent
                              labelFormatter={(value) =>
                                new Date(String(value)).toLocaleDateString("id-ID", {
                                  month: "short",
                                  day: "numeric",
                                })
                              }
                              indicator="dot"
                              formatter={(value, name) => (
                                <div className="flex w-full items-center justify-between gap-3">
                                  <span className="text-muted-foreground">
                                    {name === "repayments"
                                      ? "Tagihan"
                                      : name === "loanOut"
                                      ? "Pinjaman"
                                      : name === "savingsIn"
                                      ? "Tabungan"
                                      : "Tarik"}
                                  </span>
                                  <span className="font-medium text-foreground">
                                    {formatCurrency(Number(value))}
                                  </span>
                                </div>
                              )}
                            />
                          }
                        />
                        {visibleChartSeries.repayments && (
                          <Area dataKey="repayments" type="monotone" fill="url(#fillRepayments)" stroke="var(--color-repayments)" strokeWidth={2} />
                        )}
                        {visibleChartSeries.loanOut && (
                          <Area dataKey="loanOut" type="monotone" fill="url(#fillLoanOut)" stroke="var(--color-loanOut)" strokeWidth={2} />
                        )}
                        {visibleChartSeries.savingsIn && (
                          <Area dataKey="savingsIn" type="monotone" fill="url(#fillSavingsIn)" stroke="var(--color-savingsIn)" strokeWidth={2} />
                        )}
                        {visibleChartSeries.savingsOut && (
                          <Area dataKey="savingsOut" type="monotone" fill="url(#fillSavingsOut)" stroke="var(--color-savingsOut)" strokeWidth={2} />
                        )}
                      </AreaChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Rincian Uang</CardTitle>
                    <CardDescription>Masuk dan keluar periode ini.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      <MoneyRow label="Cash masuk" value={formatCurrency(summary.cashIn)} tone="cash" />
                      <MoneyRow label="Cash keluar" value={formatCurrency(summary.cashOut)} tone="danger" />
                      <MoneyRow label="Bank masuk" value={formatCurrency(summary.bankIn)} tone="bank" />
                      <MoneyRow label="Bank keluar" value={formatCurrency(summary.bankOut)} tone="danger" />
                      {summary.nonCashMovement !== 0 && (
                        <MoneyRow label="Non-Cash" value={formatCurrency(summary.nonCashMovement)} tone="neutral" />
                      )}
                      <Separator />
                      <MoneyRow label="Estimasi bunga masuk" value={formatCurrency(summary.realizedProfit)} tone="primary" />
                      <MoneyRow label="Arus bersih" value={formatCurrency(summary.netMovement)} tone={summary.netMovement >= 0 ? "cash" : "danger"} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <BusinessCashCard
                balance={formatCurrency(summary.businessCashBalance)}
                amount={businessCashAmount}
                note={businessCashNote}
                ready={businessCashReady}
                saving={savingBusinessCash}
                onAmountChange={setBusinessCashAmount}
                onNoteChange={setBusinessCashNote}
                onAdjust={handleBusinessCashAdjust}
              />

              <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                <Card>
                  <CardHeader>
                    <CardTitle>Prioritas Nasabah</CardTitle>
                    <CardDescription>Outstanding terbesar.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2">
                      {priorityCustomers.length === 0 ? (
                        <div className="rounded-lg border bg-background px-4 py-6 text-sm text-muted-foreground">
                          Belum ada pinjaman aktif.
                        </div>
                      ) : (
                        priorityCustomers.map((customer) => (
                          <PriorityCustomerRow key={customer.id} customer={customer} />
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Aktivitas Uang</CardTitle>
                    <CardDescription>Transaksi terbaru.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2">
                      {recentMoneyActivities.length === 0 ? (
                        <div className="rounded-lg border bg-background px-4 py-6 text-sm text-muted-foreground">
                          Belum ada aktivitas uang.
                        </div>
                      ) : (
                        recentMoneyActivities.slice(0, 8).map((activity) => (
                          <MoneyActivityRow key={activity.id} activity={activity} />
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

            {false && <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Nasabah Terbaru</CardTitle>
                  <CardDescription>
                    Ringkasan cepat.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-3">
                    {profileViewModels.slice(0, 5).map((item) => (
                      <div
                        key={item.profile.id}
                        className="flex items-center justify-between gap-3 rounded-xl border bg-background px-4 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar>
                            <AvatarImage src={item.profile.photo_url ?? undefined} />
                            <AvatarFallback>
                              {getInitials(item.profile.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex min-w-0 flex-col">
                            <p className="truncate font-medium">
                              {item.profile.full_name}
                            </p>
                            <p className="truncate text-sm text-muted-foreground">
                              {[
                                item.profile.location,
                                item.profile.business_category,
                                item.profile.phone,
                              ]
                                .filter(Boolean)
                                .join(" | ") || "Tanpa detail tambahan"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">LVL {item.level}</Badge>
                          <Badge variant="secondary">{item.profilePoints} poin</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Hadiah Aktif</CardTitle>
                  <CardDescription>
                    Katalog hadiah aktif.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {rewardCatalogReady ? (
                    <div className="flex flex-col gap-3">
                      {rewards.slice(0, 5).map((reward) => (
                        <div
                          key={reward.id}
                          className="flex items-center justify-between rounded-xl border bg-background px-4 py-3"
                        >
                          <div className="flex flex-col">
                            <p className="font-medium">{reward.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {reward.point_source === "profile" ? "Poin Profile" : "Poin Pinjaman"}
                            </p>
                          </div>
                          <Badge variant="secondary">{reward.points_cost} poin</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Alert>
                      <GiftIcon />
                      <AlertTitle>Tabel hadiah belum siap</AlertTitle>
                      <AlertDescription>
                        Jalankan migration <code>009_reward_catalog.sql</code> supaya
                        admin panel bisa mengelola hadiah.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>}
            </div>
          )}

          {activeTab === "loans" && (
            <div className="flex flex-col gap-6">
              <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))]">
                <SummaryCard
                  title="Aktif"
                  value={`${summary.activeLoansCount}`}
                  description="Pinjaman berjalan"
                  icon={TrendingDownIcon}
                  tone="neutral"
                />
                <SummaryCard
                  title="Outstanding"
                  value={formatCompactCurrency(summary.totalOutstanding)}
                  description="Sisa tagihan aktif"
                  icon={ArrowUpDownIcon}
                  tone="warning"
                />
                <SummaryCard
                  title="Modal Aktif"
                  value={formatCompactCurrency(summary.activePrincipal)}
                  description="Principal berjalan"
                  icon={WalletIcon}
                  tone="danger"
                />
                <SummaryCard
                  title="Profit Aktif"
                  value={formatCompactCurrency(summary.expectedActiveProfit)}
                  description="Bunga belum selesai"
                  icon={TrendingUpIcon}
                  tone="primary"
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Portfolio Pinjaman</CardTitle>
                  <CardDescription>Prioritas tagih dan sisa pinjaman.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nasabah</TableHead>
                        <TableHead>Pinjaman</TableHead>
                        <TableHead>Terbayar</TableHead>
                        <TableHead>Sisa</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Risiko</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loanPortfolio.slice(0, 80).map((row) => (
                        <TableRow key={row.loan.id}>
                          <TableCell>
                            <button
                              type="button"
                              onClick={() => setSelectedCustomerId(row.loan.profile_id)}
                              className="text-left"
                            >
                              <span className="block font-medium">
                                {row.profile?.full_name ?? "Nasabah"}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {row.profile?.location ?? "Tanpa lokasi"}
                              </span>
                            </button>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{formatCompactCurrency(row.loan.principal_amount)}</span>
                              <span className="text-sm text-muted-foreground">
                                Target {formatCompactCurrency(row.target)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{formatCompactCurrency(row.paid)}</TableCell>
                          <TableCell>
                            <span className={row.outstanding > 0 ? "font-semibold text-[var(--pf-warning)]" : "text-muted-foreground"}>
                              {formatCompactCurrency(row.outstanding)}
                            </span>
                          </TableCell>
                          <TableCell>{Math.round(row.progress * 100)}%</TableCell>
                          <TableCell>
                            <Badge variant={row.risk === "Aman" ? "outline" : "destructive"}>
                              {row.risk}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "savings" && (
            <div className="flex flex-col gap-6">
              <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))]">
                <SummaryCard
                  title="Akun Aktif"
                  value={`${summary.activeSavingsCount}`}
                  description="Rekening tabungan"
                  icon={WalletCardsIcon}
                  tone="neutral"
                />
                <SummaryCard
                  title="Saldo"
                  value={formatCompactCurrency(summary.savingsBalance)}
                  description="Kewajiban tabungan"
                  icon={BanknoteIcon}
                  tone="warning"
                />
                <SummaryCard
                  title="Masuk"
                  value={formatCompactCurrency(summary.totalSavingsIn)}
                  description="Periode ini"
                  icon={TrendingUpIcon}
                  tone="bank"
                />
                <SummaryCard
                  title="Keluar"
                  value={formatCompactCurrency(summary.totalSavingsOut)}
                  description="Tarik periode ini"
                  icon={TrendingDownIcon}
                  tone="danger"
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Portfolio Tabungan</CardTitle>
                  <CardDescription>Saldo dan aktivitas akun nasabah.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nasabah</TableHead>
                        <TableHead>Akun</TableHead>
                        <TableHead>Masuk</TableHead>
                        <TableHead>Keluar</TableHead>
                        <TableHead>Saldo</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {savingsPortfolio.slice(0, 80).map((row) => (
                        <TableRow key={row.account.id}>
                          <TableCell>
                            <button
                              type="button"
                              onClick={() => setSelectedCustomerId(row.account.profile_id)}
                              className="text-left"
                            >
                              <span className="block font-medium">
                                {row.profile?.full_name ?? "Nasabah"}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {row.profile?.location ?? "Tanpa lokasi"}
                              </span>
                            </button>
                          </TableCell>
                          <TableCell>{row.account.account_name}</TableCell>
                          <TableCell className="text-[var(--pf-bank)]">
                            {formatCompactCurrency(row.deposits)}
                          </TableCell>
                          <TableCell className="text-[var(--pf-danger)]">
                            {formatCompactCurrency(row.withdrawals)}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCompactCurrency(row.balance)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusBadgeVariant(row.account.status)}>
                              {row.account.status === "active" ? "Aktif" : row.account.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "customers" && (
            <div className="flex flex-col gap-6">
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))]">
              <SummaryCard
                title="Nasabah"
                value={`${customerInsights.length}`}
                description="Profile aktif"
                icon={UsersIcon}
                tone="neutral"
              />
              <SummaryCard
                title="Outstanding"
                value={formatCompactCurrency(
                  customerInsights.reduce((sum, item) => sum + item.outstanding, 0)
                )}
                description="Sisa tagihan"
                icon={ArrowUpDownIcon}
                tone="warning"
              />
              <SummaryCard
                title="Tabungan"
                value={formatCompactCurrency(
                  customerInsights.reduce((sum, item) => sum + item.savingsBalance, 0)
                )}
                description="Saldo nasabah"
                icon={WalletCardsIcon}
                tone="bank"
              />
              <SummaryCard
                title="Poin"
                value={`${customerInsights.reduce((sum, item) => sum + item.totalPoints, 0)}`}
                description="Total poin"
                icon={GiftIcon}
                tone="primary"
              />
            </div>

            <Card>
              <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex flex-col gap-1">
                  <CardTitle>Nasabah</CardTitle>
                  <CardDescription>
                    Nilai bisnis, risiko, dan loyalitas.
                  </CardDescription>
                </div>
                <div className="w-full max-w-sm">
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Cari nama, nomor, atau lokasi"
                  />
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["all", "Semua"],
                      ["priority", "Prioritas Tagih"],
                      ["points", "Poin Tertinggi"],
                      ["savings", "Tabungan Tertinggi"],
                      ["outstanding", "Outstanding"],
                      ["risk", "Risiko"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCustomerSegment(key)}
                      className={cn(
                        "h-7 rounded-lg border px-2.5 text-xs font-medium transition-colors",
                        customerSegment === key
                          ? "border-border bg-secondary text-foreground"
                          : "border-border bg-background text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nasabah</TableHead>
                      <TableHead>Pinjaman</TableHead>
                      <TableHead>Tabungan</TableHead>
                      <TableHead>Outstanding</TableHead>
                      <TableHead>Poin</TableHead>
                      <TableHead>Risiko</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomerInsights.map((insight) => {
                      const item = insight.item;
                      return (
                      <TableRow key={item.profile.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={item.profile.photo_url ?? undefined} />
                              <AvatarFallback>
                                {getInitials(item.profile.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <p className="font-medium">{item.profile.full_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {[
                                  item.profile.location,
                                  item.profile.business_category,
                                  item.profile.phone,
                                ]
                                  .filter(Boolean)
                                  .join(" | ") || "Tanpa info tambahan"}
                              </p>
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                <Badge variant="outline">LVL {item.level}</Badge>
                                <Badge variant={statusBadgeVariant(item.profile.status)}>
                                  {item.profile.status === "active" ? "Aktif" : item.profile.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{item.activeLoans.length} aktif</span>
                            <span className="text-sm text-muted-foreground">
                              {item.archivedLoans.length} arsip
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{formatCompactCurrency(insight.savingsBalance)}</span>
                            <span className="text-sm text-muted-foreground">
                              {item.activeSavings.length} akun
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "font-semibold",
                            insight.outstanding > 0 ? "text-[var(--pf-warning)]" : "text-muted-foreground"
                          )}>
                            {formatCompactCurrency(insight.outstanding)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {insight.totalPoints} poin
                            </span>
                            <span className="text-sm text-muted-foreground">
                              Profile {item.profilePoints} | Loan {item.activeLoanPoints}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={insight.risk === "Aman" ? "outline" : "destructive"}
                          >
                            {insight.risk}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="icon">
                                <MoreHorizontalIcon />
                                <span className="sr-only">Aksi nasabah</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuGroup>
                                <DropdownMenuItem
                                  onClick={() => setSelectedCustomerId(item.profile.id)}
                                >
                                  <FileTextIcon />
                                  Lihat Detail
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openProfileEditor(item)}>
                                  <PencilLineIcon />
                                  Edit Nasabah
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openPointAdjustment(item)}>
                                  <ArrowUpDownIcon />
                                  Ubah Poin
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleShareLink(item)}>
                                  <CopyIcon />
                                  Share Link
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            </div>
          )}

          {activeTab === "rewards" && (
            <div className="flex flex-col gap-6">
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))]">
              <SummaryCard
                title="Hadiah"
                value={`${rewards.filter((reward) => reward.is_active).length}`}
                description="Katalog aktif"
                icon={GiftIcon}
                tone="warning"
              />
              <SummaryCard
                title="Siap Klaim"
                value={`${rewardCandidates.length}`}
                description="Nasabah memenuhi poin"
                icon={UsersIcon}
                tone="primary"
              />
              <SummaryCard
                title="Poin"
                value={`${customerInsights.reduce((sum, item) => sum + item.totalPoints, 0)}`}
                description="Total beredar"
                icon={BadgePlusIcon}
                tone="cash"
              />
            </div>

            <Card>
              <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex flex-col gap-1">
                  <CardTitle>Kelola Hadiah</CardTitle>
                  <CardDescription>
                    Tambah dan edit hadiah.
                  </CardDescription>
                </div>
                <Button onClick={() => openRewardEditor()} disabled={!rewardCatalogReady}>
                  <GiftIcon data-icon="inline-start" />
                  Tambah Hadiah
                </Button>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {!rewardCatalogReady && (
                  <Alert>
                    <GiftIcon />
                    <AlertTitle>Section hadiah belum aktif</AlertTitle>
                    <AlertDescription>
                      Jalankan <code>009_reward_catalog.sql</code> di Supabase baru
                      untuk menghidupkan manajemen hadiah.
                    </AlertDescription>
                  </Alert>
                )}

                {rewardCatalogReady && (
                  rewards.length === 0 ? (
                    <Alert>
                      <GiftIcon />
                      <AlertTitle>Hadiah masih kosong</AlertTitle>
                      <AlertDescription>
                        Tabel <code>reward_catalog</code> sudah ada, tapi belum ada
                        isinya. Jalankan <code>011_seed_default_rewards.sql</code>
                        kalau mau isi 3 hadiah default seperti di app.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Hadiah</TableHead>
                          <TableHead>Sumber Poin</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Poin</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rewards.map((reward) => (
                          <TableRow key={reward.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{reward.title}</span>
                                <span className="text-sm text-muted-foreground">
                                  {reward.description || "Tanpa deskripsi"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {reward.point_source === "profile"
                                ? "Poin Profile"
                                : "Poin Pinjaman"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={reward.is_active ? "secondary" : "outline"}
                                >
                                  {reward.is_active ? "Aktif" : "Nonaktif"}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>{reward.points_cost}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openRewardEditor(reward)}
                              >
                                <PencilLineIcon data-icon="inline-start" />
                                Edit
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Nasabah Siap Klaim</CardTitle>
                <CardDescription>Retensi dari poin yang sudah cukup.</CardDescription>
              </CardHeader>
              <CardContent>
                {rewardCandidates.length === 0 ? (
                  <div className="rounded-lg border bg-background px-4 py-6 text-sm text-muted-foreground">
                    Belum ada nasabah yang memenuhi hadiah aktif.
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {rewardCandidates.slice(0, 12).map(({ insight, availableRewards }) => (
                      <div
                        key={insight.item.profile.id}
                        className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-3"
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedCustomerId(insight.item.profile.id)}
                          className="min-w-0 text-left"
                        >
                          <p className="truncate text-sm font-semibold">
                            {insight.item.profile.full_name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {insight.totalPoints} poin | LVL {insight.item.level}
                          </p>
                        </button>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {availableRewards.slice(0, 3).map((reward) => (
                            <Badge key={reward.id} variant="secondary">
                              {reward.title}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
          )}

          {activeTab === "point-docs" && <PointSystemDocsPage />}

        </div>
      </div>

      <Dialog
        open={!!selectedCustomerInsight}
        onOpenChange={(open) => !open && setSelectedCustomerId(null)}
      >
        <DialogContent className="sm:max-w-4xl">
          {selectedCustomerInsight && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selectedCustomerInsight.item.profile.full_name}
                </DialogTitle>
                <DialogDescription>
                  {[
                    selectedCustomerInsight.item.profile.location,
                    selectedCustomerInsight.item.profile.business_category,
                  ]
                    .filter(Boolean)
                    .join(" | ") || "Ringkasan operasional nasabah"}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 md:grid-cols-4">
                <MoneyRow
                  label="Outstanding"
                  value={formatCompactCurrency(selectedCustomerInsight.outstanding)}
                  tone="warning"
                />
                <MoneyRow
                  label="Terbayar"
                  value={formatCompactCurrency(selectedCustomerInsight.paid)}
                  tone="cash"
                />
                <MoneyRow
                  label="Tabungan"
                  value={formatCompactCurrency(selectedCustomerInsight.savingsBalance)}
                  tone="bank"
                />
                <MoneyRow
                  label="Poin"
                  value={`${selectedCustomerInsight.totalPoints} poin`}
                  tone="primary"
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Pinjaman</CardTitle>
                    <CardDescription>
                      Aktif dan arsip pinjaman nasabah.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex max-h-[320px] flex-col gap-3 overflow-auto">
                    {[
                      ...selectedCustomerInsight.item.activeLoans,
                      ...selectedCustomerInsight.item.archivedLoans,
                    ].length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Belum ada pinjaman.
                      </p>
                    ) : (
                      [
                        ...selectedCustomerInsight.item.activeLoans,
                        ...selectedCustomerInsight.item.archivedLoans,
                      ].map((loan) => {
                        const target =
                          (loan.installment_amount_snapshot ?? 0) *
                          (loan.installments ?? 0);
                        const paid = loanTransactions
                          .filter(
                            (transaction) =>
                              transaction.loan_id === loan.id &&
                              isRepaymentTransaction(transaction.type)
                          )
                          .reduce(
                            (total, transaction) => total + transaction.amount,
                            0
                          );
                        const remaining = Math.max(target - paid, 0);

                        return (
                          <div
                            key={loan.id}
                            className="rounded-lg border bg-background/60 px-3 py-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium">
                                  {formatCompactCurrency(loan.principal_amount)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDateTime(loan.start_date)} | {loan.installments} cicilan
                                </p>
                              </div>
                              <Badge
                                variant={
                                  loan.status === "active"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {loan.status === "active" ? "Aktif" : "Arsip"}
                              </Badge>
                            </div>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                              <MoneyRow
                                label="Sisa"
                                value={formatCompactCurrency(remaining)}
                                tone={remaining > 0 ? "warning" : "neutral"}
                              />
                              <MoneyRow
                                label="Bayar"
                                value={formatCompactCurrency(paid)}
                                tone="cash"
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Tabungan & Aktivitas</CardTitle>
                    <CardDescription>
                      Saldo akun dan uang terbaru.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex max-h-[320px] flex-col gap-3 overflow-auto">
                    {selectedCustomerInsight.item.activeSavings.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Belum ada rekening tabungan aktif.
                      </p>
                    ) : (
                      selectedCustomerInsight.item.activeSavings.map((account) => {
                        const accountBalance = savingsTransactions
                          .filter(
                            (transaction) =>
                              transaction.savings_account_id === account.id
                          )
                          .reduce((total, transaction) => {
                            if (isSavingsWithdrawal(transaction.type)) {
                              return total - transaction.amount;
                            }
                            if (isSavingsDeposit(transaction.type)) {
                              return total + transaction.amount;
                            }
                            return total;
                          }, 0);

                        return (
                          <MoneyRow
                            key={account.id}
                            label={account.account_name}
                            value={formatCompactCurrency(accountBalance)}
                            tone="bank"
                          />
                        );
                      })
                    )}

                    <Separator />

                    {selectedCustomerActivities.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Belum ada aktivitas uang.
                      </p>
                    ) : (
                      selectedCustomerActivities.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-start justify-between gap-3 rounded-lg border bg-background/60 px-3 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {activity.title}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {formatDateTime(activity.date)} | {activity.detail}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "shrink-0 text-sm font-semibold",
                              activity.direction === "in"
                                ? "text-[var(--pf-cash)]"
                                : "text-[var(--pf-danger)]"
                            )}
                          >
                            {activity.direction === "in" ? "+" : "-"}{" "}
                            {formatCompactCurrency(activity.amount)}
                          </span>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              <DialogFooter showCloseButton>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => openProfileEditor(selectedCustomerInsight.item)}
                >
                  <PencilLineIcon data-icon="inline-start" />
                  Edit Nasabah
                </Button>
                <Button
                  type="button"
                  onClick={() => openPointAdjustment(selectedCustomerInsight.item)}
                >
                  <ArrowUpDownIcon data-icon="inline-start" />
                  Ubah Poin
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingProfile} onOpenChange={(open) => !open && setEditingProfile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Nasabah</DialogTitle>
            <DialogDescription>
              Ubah data dasar profile tanpa menyentuh web lama.
            </DialogDescription>
          </DialogHeader>
          {profileForm && (
            <FieldGroup>
              {!profileExtraFieldsReady && (
                <Field>
                  <FieldDescription>
                    Field Kategori Usaha dan Agama belum aktif di database. Jalankan
                    SQL `013_customer_profile_business_category_religion.sql` untuk
                    mengaktifkannya.
                  </FieldDescription>
                </Field>
              )}
              <Field>
                <FieldLabel htmlFor="profile-name">Nama</FieldLabel>
                <FieldContent>
                  <Input
                    id="profile-name"
                    value={profileForm.fullName}
                    onChange={(event) =>
                      setProfileForm((current) =>
                        current
                          ? { ...current, fullName: event.target.value }
                          : current
                      )
                    }
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="profile-phone">Nomor HP</FieldLabel>
                <FieldContent>
                  <Input
                    id="profile-phone"
                    value={profileForm.phone}
                    onChange={(event) =>
                      setProfileForm((current) =>
                        current ? { ...current, phone: event.target.value } : current
                      )
                    }
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="profile-location">Lokasi</FieldLabel>
                <FieldContent>
                  <Input
                    id="profile-location"
                    value={profileForm.location}
                    onChange={(event) =>
                      setProfileForm((current) =>
                        current
                          ? { ...current, location: event.target.value }
                          : current
                      )
                    }
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="profile-business-category">Kategori Usaha</FieldLabel>
                <FieldContent>
                  <Input
                    id="profile-business-category"
                    value={profileForm.businessCategory}
                    onChange={(event) =>
                      setProfileForm((current) =>
                        current
                          ? { ...current, businessCategory: event.target.value }
                          : current
                      )
                    }
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="profile-religion">Agama</FieldLabel>
                <FieldContent>
                  <Input
                    id="profile-religion"
                    value={profileForm.religion}
                    onChange={(event) =>
                      setProfileForm((current) =>
                        current ? { ...current, religion: event.target.value } : current
                      )
                    }
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Status</FieldLabel>
                <FieldContent>
                  <Select
                    value={profileForm.status}
                    onValueChange={(value) =>
                      setProfileForm((current) =>
                        current ? { ...current, status: value } : current
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>
            </FieldGroup>
          )}
          <DialogFooter showCloseButton>
            <Button onClick={handleProfileSave} disabled={savingProfile}>
              {savingProfile && <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!adjustingProfile}
        onOpenChange={(open) => !open && setAdjustingProfile(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah / Kurangi Poin</DialogTitle>
            <DialogDescription>
              Poin akan masuk ke ledger sebagai penyesuaian manual.
            </DialogDescription>
          </DialogHeader>
          {adjustingProfile && pointAdjustment && (
            <FieldGroup>
              <Field>
                <FieldLabel>Target poin</FieldLabel>
                <FieldContent>
                  <Select
                    value={pointAdjustment.mode}
                    onValueChange={(value: "profile" | "active_loan") =>
                      setPointAdjustment((current) =>
                        current ? { ...current, mode: value } : current
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="profile">Poin Profile</SelectItem>
                        <SelectItem value="active_loan">Poin Pinjaman Aktif</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>

              {pointAdjustment.mode === "active_loan" && (
                <Field>
                  <FieldLabel>Pinjaman aktif</FieldLabel>
                  <FieldContent>
                    <Select
                      value={pointAdjustment.loanId}
                      onValueChange={(value) =>
                        setPointAdjustment((current) =>
                          current ? { ...current, loanId: value } : current
                        )
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih pinjaman" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {adjustingProfile.activeLoans.map((loan) => (
                            <SelectItem key={loan.id} value={loan.id}>
                              {formatCurrency(loan.principal_amount)} • {loan.start_date}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      Pilih pinjaman yang poin aktifnya ingin diubah.
                    </FieldDescription>
                  </FieldContent>
                </Field>
              )}

              <Field>
                <FieldLabel htmlFor="point-amount">Jumlah poin</FieldLabel>
                <FieldContent>
                  <Input
                    id="point-amount"
                    value={pointAdjustment.amount}
                    onChange={(event) =>
                      setPointAdjustment((current) =>
                        current ? { ...current, amount: event.target.value } : current
                      )
                    }
                    placeholder="Contoh: 20 atau -10"
                  />
                  <FieldDescription>
                    Gunakan angka plus untuk tambah, minus untuk kurangi.
                  </FieldDescription>
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="point-note">Catatan</FieldLabel>
                <FieldContent>
                  <Textarea
                    id="point-note"
                    value={pointAdjustment.note}
                    onChange={(event) =>
                      setPointAdjustment((current) =>
                        current ? { ...current, note: event.target.value } : current
                      )
                    }
                    placeholder="Alasan penyesuaian"
                  />
                </FieldContent>
              </Field>
            </FieldGroup>
          )}
          <DialogFooter showCloseButton>
            <Button onClick={handlePointAdjust} disabled={savingAdjustment}>
              {savingAdjustment && (
                <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
              )}
              Simpan Penyesuaian
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rewardForm} onOpenChange={(open) => !open && setRewardForm(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingReward ? "Edit Hadiah" : "Tambah Hadiah"}
            </DialogTitle>
            <DialogDescription>
              Katalog hadiah dikelola dari panel ini supaya mobile tinggal baca.
            </DialogDescription>
          </DialogHeader>
          {rewardForm && (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="reward-title">Nama hadiah</FieldLabel>
                <FieldContent>
                  <Input
                    id="reward-title"
                    value={rewardForm.title}
                    onChange={(event) =>
                      setRewardForm((current) =>
                        current ? { ...current, title: event.target.value } : current
                      )
                    }
                  />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="reward-description">Deskripsi</FieldLabel>
                <FieldContent>
                  <Textarea
                    id="reward-description"
                    value={rewardForm.description}
                    onChange={(event) =>
                      setRewardForm((current) =>
                        current
                          ? { ...current, description: event.target.value }
                          : current
                      )
                    }
                  />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel>Sumber poin</FieldLabel>
                <FieldContent>
                  <Select
                    value={rewardForm.pointSource}
                    onValueChange={(value: RewardFormState["pointSource"]) =>
                      setRewardForm((current) =>
                        current ? { ...current, pointSource: value } : current
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="profile">Poin Profile</SelectItem>
                        <SelectItem value="active_loan">Poin Pinjaman</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="reward-points">Harga poin</FieldLabel>
                  <FieldContent>
                    <Input
                      id="reward-points"
                      value={rewardForm.pointsCost}
                      onChange={(event) =>
                        setRewardForm((current) =>
                          current
                            ? { ...current, pointsCost: event.target.value }
                            : current
                        )
                      }
                    />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel htmlFor="reward-order">Urutan</FieldLabel>
                  <FieldContent>
                    <Input
                      id="reward-order"
                      value={rewardForm.sortOrder}
                      onChange={(event) =>
                        setRewardForm((current) =>
                          current
                            ? { ...current, sortOrder: event.target.value }
                            : current
                        )
                      }
                    />
                  </FieldContent>
                </Field>
              </div>

              <Field>
                <FieldLabel>Status</FieldLabel>
                <FieldContent>
                  <Select
                    value={rewardForm.isActive ? "active" : "inactive"}
                    onValueChange={(value) =>
                      setRewardForm((current) =>
                        current
                          ? { ...current, isActive: value === "active" }
                          : current
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="active">Aktif</SelectItem>
                        <SelectItem value="inactive">Nonaktif</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>
            </FieldGroup>
          )}
          <DialogFooter showCloseButton>
            <Button onClick={handleRewardSave} disabled={savingReward}>
              {savingReward && (
                <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
              )}
              Simpan Hadiah
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!shareLinkPreview}
        onOpenChange={(open) => !open && setShareLinkPreview(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Share Link Nasabah</DialogTitle>
            <DialogDescription>
              Browser ini menolak auto-copy. Salin link manual untuk{" "}
              {shareLinkPreview?.name ?? "nasabah"}.
            </DialogDescription>
          </DialogHeader>
          {shareLinkPreview && (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="share-link-preview">Link</FieldLabel>
                <FieldContent>
                  <Input
                    id="share-link-preview"
                    readOnly
                    value={shareLinkPreview.link}
                    onFocus={(event) => event.currentTarget.select()}
                  />
                </FieldContent>
              </Field>
            </FieldGroup>
          )}
          <DialogFooter showCloseButton>
            {shareLinkPreview && (
              <Button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shareLinkPreview.link);
                    setNotice({
                      type: "success",
                      text: "Share link berhasil disalin.",
                    });
                    setShareLinkPreview(null);
                  } catch (error) {
                    setNotice({
                      type: "info",
                      text: "Clipboard masih ditolak. Tekan dan salin link secara manual.",
                    });
                  }
                }}
              >
                <CopyIcon data-icon="inline-start" />
                Coba Copy Lagi
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const SummaryCard: React.FC<{
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<React.ComponentProps<"svg">>;
  tone?: "cash" | "bank" | "danger" | "warning" | "primary" | "neutral";
}> = ({ title, value, description, icon: Icon, tone = "neutral" }) => (
  <Card className="min-h-[132px] justify-between">
    <CardHeader className="flex flex-row items-start justify-between gap-3 pb-0">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <CardDescription className="text-[11px] uppercase tracking-[0.18em]">
          {title}
        </CardDescription>
        <CardTitle className="whitespace-nowrap text-[clamp(1.45rem,2vw,1.9rem)] font-semibold leading-tight tracking-[-0.04em]">
          {value}
        </CardTitle>
      </div>
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground"
      >
        <Icon className="size-4" />
      </div>
    </CardHeader>
    <CardContent className="pt-1">
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

const BusinessCashCard: React.FC<{
  balance: string;
  amount: string;
  note: string;
  ready: boolean;
  saving: boolean;
  onAmountChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onAdjust: (direction: BusinessCashLedgerRecord["direction"]) => void;
}> = ({
  balance,
  amount,
  note,
  ready,
  saving,
  onAmountChange,
  onNoteChange,
  onAdjust,
}) => (
  <Card>
    <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex flex-col gap-2">
        <CardDescription className="text-[11px] uppercase tracking-[0.18em]">
          Koreksi Manual
        </CardDescription>
        <CardTitle className="text-2xl">{balance}</CardTitle>
        <p className="text-xs text-muted-foreground">
          Dipakai hanya kalau ada selisih catatan.
        </p>
      </div>
      <Button variant="secondary" size="icon" className="pointer-events-none">
        <BanknoteIcon />
      </Button>
    </CardHeader>
    <CardContent className="flex flex-col gap-3">
      {!ready && (
        <Alert>
          <ShieldCheckIcon />
          <AlertTitle>Tabel kas belum siap</AlertTitle>
          <AlertDescription>
            Jalankan SQL <code>010_business_cash_ledger.sql</code> supaya uang kas
            bisa disimpan.
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
        <Input
          inputMode="numeric"
          value={amount}
          onChange={(event) => onAmountChange(event.target.value)}
          placeholder="Nominal"
          disabled={!ready || saving}
        />
        <Input
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder="Catatan"
          disabled={!ready || saving}
        />
        <div className="grid grid-cols-2 gap-2 lg:w-[260px]">
          <Button
            type="button"
            onClick={() => onAdjust("in")}
            disabled={!ready || saving}
          >
            <PlusIcon data-icon="inline-start" />
            Tambah
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onAdjust("out")}
            disabled={!ready || saving}
          >
            <TrendingDownIcon data-icon="inline-start" />
            Kurang
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);

const MoneyRow: React.FC<{
  label: string;
  value: string;
  tone?: "cash" | "bank" | "danger" | "warning" | "primary" | "neutral";
}> = ({ label, value, tone = "neutral" }) => (
  <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/60 px-3 py-2.5">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span
      className={cn(
        "text-sm font-semibold text-foreground",
        tone === "cash" && "text-[var(--pf-cash)]",
        tone === "bank" && "text-[var(--pf-bank)]",
        tone === "danger" && "text-[var(--pf-danger)]",
        tone === "warning" && "text-[var(--pf-warning)]",
        tone === "primary" && "text-[var(--pf-focus)]"
      )}
    >
      {value}
    </span>
  </div>
);

const PriorityCustomerRow: React.FC<{ customer: PriorityCustomer }> = ({
  customer,
}) => (
  <div className="rounded-lg border bg-background px-3 py-3 transition-colors hover:bg-secondary/40">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{customer.name}</p>
        <p className="truncate text-xs text-muted-foreground">{customer.detail}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold text-[var(--pf-warning)]">
          {formatCurrency(customer.outstanding)}
        </p>
        <p className="text-xs text-muted-foreground">sisa</p>
      </div>
    </div>
    <div className="mt-3 flex flex-wrap gap-1.5">
      <Badge variant="outline">{customer.activeLoans} pinjaman</Badge>
      <Badge variant="outline">{customer.savingsAccounts} tabungan</Badge>
      <Badge variant="secondary">LVL {customer.level}</Badge>
      <Badge variant="secondary">{customer.points} poin</Badge>
    </div>
  </div>
);

const MoneyActivityRow: React.FC<{ activity: MoneyActivity }> = ({ activity }) => {
  const Icon =
    activity.kind === "repayment"
      ? WalletCardsIcon
      : activity.kind === "loan_out"
      ? ArrowUpDownIcon
      : activity.kind === "savings_in"
      ? SquarePlusIcon
      : activity.kind === "savings_out"
      ? SquareMinusIcon
      : BanknoteIcon;
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border bg-background/70 px-3 py-3 transition-colors hover:bg-secondary/40">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          variant="secondary"
          size="icon"
          className="pointer-events-none shrink-0 rounded-lg"
        >
          <Icon />
        </Button>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold">{activity.title}</span>
          <span className="truncate text-xs text-muted-foreground">
            {activity.detail}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {formatDateTime(activity.date)}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span
          className={cn(
            "text-sm font-semibold",
            activity.direction === "in"
              ? "text-[var(--pf-cash)]"
              : "text-[var(--pf-danger)]"
          )}
        >
          {activity.direction === "in" ? "+" : "-"}
          {formatCurrency(activity.amount)}
        </span>
        <Badge variant="outline">{paymentLabel(activity.method)}</Badge>
      </div>
    </div>
  );
};

export { getAdminModeFromLocation };
export default AdminPanelPage;
