"use client"

import * as React from "react"
import { useActiveBook } from "@/hooks/use-active-book"
import { useLiveQuery } from "dexie-react-hooks"
import { db, type Transaction } from "@/lib/db"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { IconScale, IconTrendingUp, IconTrendingDown, IconCalendar, IconWallet, IconCoin } from "@tabler/icons-react"

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
]

const YEARS = ["2026", "2025", "2024"]

export default function RecapPage() {
  const { activeBookId } = useActiveBook()
  
  const [selectedMonth, setSelectedMonth] = React.useState<number>(new Date().getMonth())
  const [selectedYear, setSelectedYear] = React.useState<number>(new Date().getFullYear())

  // Fetch transactions reactively
  const transactions = useLiveQuery(
    () => activeBookId 
      ? db.transactions.where("book_id").equals(activeBookId).and(tx => tx.is_deleted === 0).toArray()
      : Promise.resolve([] as Transaction[]),
    [activeBookId]
  ) || []

  // Filter transactions for the selected month & year
  const monthlyTx = React.useMemo(() => {
    return transactions.filter((tx) => {
      const d = new Date(tx.transaction_date)
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth
    })
  }, [transactions, selectedMonth, selectedYear])

  // Core metrics calculation
  const totalIncome = React.useMemo(() => {
    return monthlyTx
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0)
  }, [monthlyTx])

  const totalExpense = React.useMemo(() => {
    return monthlyTx
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0)
  }, [monthlyTx])

  const savingsRate = React.useMemo(() => {
    if (totalIncome === 0) return 0
    return ((totalIncome - totalExpense) / totalIncome) * 100
  }, [totalIncome, totalExpense])

  const daysInMonth = React.useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate()
  }, [selectedMonth, selectedYear])

  const avgDailyIncome = totalIncome / daysInMonth
  const avgDailyExpense = totalExpense / daysInMonth

  // Daily aggregated data for Recharts BarChart
  const chartData = React.useMemo(() => {
    const dataList = []
    for (let day = 1; day <= daysInMonth; day++) {
      const datePrefix = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      const dayTx = monthlyTx.filter((t) => t.transaction_date.startsWith(datePrefix))
      
      const incomeSum = dayTx
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0)

      const expenseSum = dayTx
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0)

      dataList.push({
        day: `${day}`,
        "Pemasukan": incomeSum,
        "Pengeluaran": expenseSum,
      })
    }
    return dataList
  }, [monthlyTx, selectedMonth, selectedYear, daysInMonth])

  // Top 5 largest transactions in the month
  const topTransactions = React.useMemo(() => {
    return [...monthlyTx]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
  }, [monthlyTx])

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val)
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        
        <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 max-w-7xl mx-auto w-full">
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Rekap Analisis Bulanan</h2>
              <p className="text-xs text-muted-foreground">Tinjau grafik perbandingan dan performa rasio kas bulanan Anda.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <Select
                value={`${selectedMonth}`}
                onValueChange={(val) => setSelectedMonth(Number(val))}
              >
                <SelectTrigger className="w-36 h-9 font-semibold text-xs">
                  <SelectValue placeholder="Pilih Bulan" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, idx) => (
                    <SelectItem key={idx} value={`${idx}`} className="text-xs">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={`${selectedYear}`}
                onValueChange={(val) => setSelectedYear(Number(val))}
              >
                <SelectTrigger className="w-24 h-9 font-semibold text-xs">
                  <SelectValue placeholder="Tahun" />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={y} className="text-xs">
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick Recap Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* SAVINGS RATE */}
            <Card className="bg-gradient-to-t from-violet-500/5 to-card border-violet-500/10">
              <CardHeader className="py-4">
                <CardDescription className="flex items-center gap-1.5 font-semibold text-xs">
                  <IconScale className="size-4 text-violet-500" />
                  Rasio Menabung (Savings Rate)
                </CardDescription>
                <CardTitle className={`text-2xl font-bold ${savingsRate >= 0 ? "text-violet-600 dark:text-violet-400" : "text-rose-500"}`}>
                  {savingsRate.toFixed(1)}%
                </CardTitle>
              </CardHeader>
              <CardContent className="text-[10px] text-muted-foreground pb-4">
                Persentase pendapatan bersih yang tersisa setelah pengeluaran.
              </CardContent>
            </Card>

            {/* DAILY AVG INCOME */}
            <Card className="bg-gradient-to-t from-emerald-500/5 to-card border-emerald-500/10">
              <CardHeader className="py-4">
                <CardDescription className="flex items-center gap-1.5 font-semibold text-xs">
                  <IconWallet className="size-4 text-emerald-500" />
                  Rata-rata Pemasukan Harian
                </CardDescription>
                <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatRupiah(avgDailyIncome)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-[10px] text-muted-foreground pb-4">
                Pemasukan rata-rata dibagi {daysInMonth} hari bulan ini.
              </CardContent>
            </Card>

            {/* DAILY AVG EXPENSE */}
            <Card className="bg-gradient-to-t from-rose-500/5 to-card border-rose-500/10">
              <CardHeader className="py-4">
                <CardDescription className="flex items-center gap-1.5 font-semibold text-xs">
                  <IconCoin className="size-4 text-rose-500" />
                  Rata-rata Pengeluaran Harian
                </CardDescription>
                <CardTitle className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                  {formatRupiah(avgDailyExpense)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-[10px] text-muted-foreground pb-4">
                Pengeluaran rata-rata dibagi {daysInMonth} hari bulan ini.
              </CardContent>
            </Card>
          </div>

          {/* Bar Comparison Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Laporan Harian Arus Kas Masuk vs Keluar</CardTitle>
              <CardDescription className="text-xs">
                Visual perbandingan kontribusi nominal transaksi per hari.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-[280px] w-full text-xs">
                {monthlyTx.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                      <XAxis dataKey="day" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} tickFormatter={(val) => `Rp ${val / 1000}k`} />
                      <Tooltip 
                        formatter={(val: any) => [formatRupiah(Number(val)), ""]}
                        labelFormatter={(lbl) => `Tanggal ${lbl}`}
                        contentStyle={{ borderRadius: "12px", border: "1px solid rgba(0,0,0,0.1)" }}
                      />
                      <Bar dataKey="Pemasukan" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Pengeluaran" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground font-semibold">
                    Tidak ada data transaksi di bulan {MONTHS[selectedMonth]} {selectedYear}.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Biggest Expenditures Grid */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">5 Transaksi Terbesar Bulan Ini</CardTitle>
              <CardDescription className="text-xs">Daftar transaksi nominal tertinggi untuk melacak beban kas.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-xl border bg-card/40">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="font-semibold text-xs py-3 h-auto">Tanggal</TableHead>
                      <TableHead className="font-semibold text-xs py-3 h-auto">Deskripsi</TableHead>
                      <TableHead className="font-semibold text-xs py-3 h-auto">Tipe</TableHead>
                      <TableHead className="font-semibold text-xs py-3 h-auto">Nominal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topTransactions.length > 0 ? (
                      topTransactions.map((tx) => {
                        const date = new Date(tx.transaction_date)
                        const isIncome = tx.type === "income"
                        return (
                          <TableRow key={tx.id} className="hover:bg-muted/20">
                            <TableCell className="py-2.5 text-xs text-muted-foreground">
                              {date.toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </TableCell>
                            <TableCell className="py-2.5 text-sm font-semibold">{tx.description}</TableCell>
                            <TableCell className="py-2.5">
                              <Badge
                                variant="outline"
                                className={`font-semibold px-2 py-0.5 border-dashed ${
                                  isIncome 
                                    ? "bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                                    : "bg-rose-500/5 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                }`}
                              >
                                {isIncome ? "Masuk" : "Keluar"}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2.5 font-bold tabular-nums text-sm">
                              {formatRupiah(tx.amount)}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground font-semibold text-xs">
                          Belum ada transaksi di bulan terpilih.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
