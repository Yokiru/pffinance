import React from "react";
import {
  AlertCircleIcon,
  BookTextIcon,
  CalendarDaysIcon,
  FileCode2Icon,
  Layers3Icon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const pointRuleRows = [
  {
    rule: "Mulai pinjaman",
    daily: "+10",
    weekly: "+10",
    note: "Masuk sekali saat pinjaman dibuat.",
  },
  {
    rule: "Bayar tepat waktu",
    daily: "+2",
    weekly: "+2",
    note: "Dihitung jika tanggal bayar tidak lewat tanggal jatuh tempo slot.",
  },
  {
    rule: "Bonus lancar 6 slot / 6 minggu",
    daily: "+10",
    weekly: "+20",
    note: "Masuk setelah 6 kali berturut-turut tepat waktu, lalu streak di-reset.",
  },
  {
    rule: "Belum dibayar / lewat due slot",
    daily: "-3",
    weekly: "-3",
    note: "Masuk saat slot sudah lewat jatuh tempo dan belum lunas.",
  },
  {
    rule: "Bayar terlambat",
    daily: "+2",
    weekly: "+2",
    note: "Tetap dapat poin setor, tapi penalti bolong sebelumnya tetap tercatat.",
  },
  {
    rule: "Lewat jatuh tempo akhir tenor",
    daily: "-20",
    weekly: "-40",
    note: "Masuk jika sudah melewati due terakhir dan pinjaman belum lunas.",
  },
  {
    rule: "Early bird lunas lebih cepat",
    daily: "(sisa slot x 2) + 10",
    weekly: "(sisa slot x 10) + 20",
    note: "Hanya saat pinjaman ditutup lebih cepat dari jumlah slot/tenor.",
  },
];

const currentNotes = [
  "Poin profile adalah total seluruh ledger poin milik nasabah. Jadi bonus, penalti, penyesuaian admin, dan tukar hadiah profile semua ikut memengaruhi angka ini.",
  "Poin pinjaman aktif hanya menghitung ledger yang menempel ke loan yang masih aktif. Saat pinjaman selesai, poin loan itu tidak lagi masuk ke stat aktif.",
  "Level profil saat ini hanya dilihat dari poin profile total: Level 1 = 0+, Level 2 = 50+, Level 3 = 100+.",
  "Untuk hadiah berbasis poin profile, saat claim sistem mengurangi poin sesuai biaya hadiah. Untuk hadiah berbasis poin pinjaman aktif, saat claim sistem tidak memotong poin dan umumnya diperlakukan sekali claim per pinjaman aktif.",
  "Poin pembayaran pinjaman maksimal dihitung 20 slot per pinjaman. Slot poin dihitung dari kelipatan nominal cicilan: cicilan 50 ribu lalu setor 60 ribu = 1 slot, 100 ribu = 2 slot, 120 ribu tetap = 2 slot.",
  "Pembayaran terlambat tetap mendapat +2 poin setor. Sistem juga tetap menyimpan penalti -3 untuk hari/slot yang sempat bolong.",
  "Penyesuaian manual dari admin masuk ke profile_point_ledger, jadi akan terlihat juga di riwayat poin pada aplikasi mobile.",
  "Saat ini tidak ada mekanisme freeze poin terpisah di kode. Yang aktif adalah sistem tambah/kurang poin berbasis event ledger.",
];

const implementationSources = [
  "loan_repository.dart: generator bonus dan penalti poin pinjaman.",
  "profile_repository.dart: baca/tulis profile_point_ledger dan reward_catalog.",
  "profile_point_ledger: sumber data utama semua riwayat poin.",
  "reward_catalog: katalog hadiah yang dipakai mobile dan admin.",
];

const PointSystemDocsPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Sistem Poin</Badge>
          <Badge variant="outline">Versi 0.2</Badge>
          <Badge variant="outline">Berlaku 8 Mei 2026</Badge>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Dokumentasi Sistem Poin yang Sedang Dipakai
        </h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Halaman ini adalah acuan internal untuk aturan poin yang aktif di
          sistem saat ini. Fokusnya bukan rencana, tapi perilaku yang memang
          sedang dipakai oleh app, admin panel, dan database sekarang.
        </p>
      </div>

      <Alert>
        <ShieldCheckIcon />
        <AlertTitle>Status dokumen</AlertTitle>
        <AlertDescription>
          Dokumen ini mengikuti implementasi aktif saat ini. Kalau nanti aturan
          poin berubah, halaman ini juga perlu ikut diperbarui agar tim tidak
          beda pemahaman.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="gap-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Model Poin</CardTitle>
              <Layers3Icon className="size-4 text-muted-foreground" />
            </div>
            <CardDescription>
              Sistem saat ini memakai 2 angka poin.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Poin Profile dan Poin Pinjaman Aktif berjalan bersamaan.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Level Profil</CardTitle>
              <SparklesIcon className="size-4 text-muted-foreground" />
            </div>
            <CardDescription>
              Level hanya mengikuti poin profile total.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Level 1 = 0+, Level 2 = 50+, Level 3 = 100+.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Mulai Berlaku</CardTitle>
              <CalendarDaysIcon className="size-4 text-muted-foreground" />
            </div>
            <CardDescription>
              Versi acuan yang sedang dipakai tim.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Ditandai mulai 8 Mei 2026 sebagai versi dokumentasi 0.2.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Sumber Kebenaran</CardTitle>
              <FileCode2Icon className="size-4 text-muted-foreground" />
            </div>
            <CardDescription>
              Acuan utama tetap ada di kode dan ledger.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Dokumen ini membantu membaca sistem tanpa harus bongkar source tiap
            kali.
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Struktur Poin yang Dipakai</CardTitle>
            <CardDescription>
              Ringkasan sederhana agar tidak tertukar antar angka poin.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Poin Profile</Badge>
                <span className="text-sm text-muted-foreground">
                  Untuk level dan hadiah profile.
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Ini adalah total semua delta poin di ledger milik nasabah.
                Karena itu bonus pinjaman, penalti keterlambatan, reward
                profile, dan penyesuaian admin semuanya ikut tercermin di sini.
              </p>
            </div>

            <Separator />

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Poin Pinjaman Aktif</Badge>
                <span className="text-sm text-muted-foreground">
                  Untuk hadiah yang menempel ke loan aktif.
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Ini hanya menjumlah ledger yang punya <code>loan_id</code> dan
                loan-nya masih aktif. Jadi saat pinjaman sudah selesai, poin di
                loan tersebut tidak lagi masuk ke stat aktif.
              </p>
            </div>

            <Separator />

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Level</Badge>
                <span className="text-sm text-muted-foreground">
                  Tidak memakai poin pinjaman aktif.
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Level profil hanya membaca poin profile total. Jadi kenaikan
                level tidak dihitung dari angka poin pinjaman aktif.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aturan Level Saat Ini</CardTitle>
            <CardDescription>
              Batas level yang aktif di sistem sekarang.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="rounded-2xl border bg-background px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">Level 1</span>
                <Badge variant="secondary">0+ poin profile</Badge>
              </div>
            </div>
            <div className="rounded-2xl border bg-background px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">Level 2</span>
                <Badge variant="secondary">50+ poin profile</Badge>
              </div>
            </div>
            <div className="rounded-2xl border bg-background px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">Level 3</span>
                <Badge variant="secondary">100+ poin profile</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Matriks Event Poin Pinjaman</CardTitle>
          <CardDescription>
            Nilai tambah dan kurang poin yang saat ini dibuat otomatis oleh
            sistem.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Harian</TableHead>
                <TableHead>Mingguan</TableHead>
                <TableHead>Keterangan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pointRuleRows.map((row) => (
                <TableRow key={row.rule}>
                  <TableCell className="font-medium">{row.rule}</TableCell>
                  <TableCell>{row.daily}</TableCell>
                  <TableCell>{row.weekly}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.note}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Catatan Operasional Penting</CardTitle>
            <CardDescription>
              Bagian ini menjelaskan perilaku sistem yang paling sering bikin
              bingung.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {currentNotes.map((note, index) => (
              <div
                key={note}
                className="flex items-start gap-3 rounded-2xl border bg-background px-4 py-3"
              >
                <Badge variant="outline" className="mt-0.5 shrink-0">
                  {index + 1}
                </Badge>
                <p className="text-sm text-muted-foreground">{note}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acuan Teknis Sistem</CardTitle>
            <CardDescription>
              Tempat utama untuk cek implementasi kalau ada perubahan.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {implementationSources.map((item) => (
              <div
                key={item}
                className="rounded-2xl border bg-background px-4 py-3 text-sm text-muted-foreground"
              >
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Alert>
        <BookTextIcon />
        <AlertTitle>Yang perlu diingat tim</AlertTitle>
        <AlertDescription>
          Kalau nanti aturan bisnis berubah, yang harus di-update bukan cuma
          tampilan dokumen ini, tapi juga generator event poin, reward logic,
          dan perhitungan summary di mobile serta admin.
        </AlertDescription>
      </Alert>

      <Alert>
        <AlertCircleIcon />
        <AlertTitle>Batas versi 0.2</AlertTitle>
        <AlertDescription>
          Dokumen ini sengaja menjelaskan sistem yang aktif sekarang. Jadi kalau
          ada ide baru seperti freeze poin, pengelompokan hadiah baru, atau
          level tambahan, itu belum dianggap berlaku sebelum benar-benar masuk
          ke implementasi.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default PointSystemDocsPage;
