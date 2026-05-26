"use client"

import * as React from "react"
import { useActiveBook } from "@/hooks/use-active-book"
import { useLiveQuery } from "dexie-react-hooks"
import { db, type Transaction } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { useLang } from "@/hooks/use-lang"
import { toast } from "sonner"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { 
  IconTrendingUp, 
  IconTrendingDown, 
  IconWallet, 
  IconArrowUpRight, 
  IconArrowDownRight, 
  IconScale,
  IconEye,
  IconEyeOff,
  IconSparkles,
  IconShare
} from "@tabler/icons-react"

export function SectionCards() {
  const { activeBookId, activeBook } = useActiveBook()
  const { lang } = useLang()

  // Fetch transactions reactively using Dexie liveQuery
  const transactions = useLiveQuery(
    () => activeBookId ? db.transactions.where("book_id").equals(activeBookId).and(tx => tx.is_deleted === 0).toArray() : Promise.resolve([] as Transaction[]),
    [activeBookId]
  ) || []

  // Formatting currency in Indonesian Rupiah
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val)
  }

  // 1. Calculate Active Book Total Saldo (Lifetime active transactions)
  const totalSaldo = transactions.reduce((acc, tx) => {
    if (tx.type === "income") return acc + tx.amount
    return acc - tx.amount
  }, 0)

  // 2. Identify date ranges (current month vs previous month)
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear

  // Filter lists
  const thisMonthTx = transactions.filter((tx) => {
    const d = new Date(tx.transaction_date)
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth
  })

  const prevMonthTx = transactions.filter((tx) => {
    const d = new Date(tx.transaction_date)
    return d.getFullYear() === prevYear && d.getMonth() === prevMonth
  })

  // 3. Compute income metrics
  const totalPemasukan = thisMonthTx
    .filter((tx) => tx.type === "income")
    .reduce((acc, tx) => acc + tx.amount, 0)

  const prevMonthPemasukan = prevMonthTx
    .filter((tx) => tx.type === "income")
    .reduce((acc, tx) => acc + tx.amount, 0)

  const incomeTrend = prevMonthPemasukan > 0 
    ? ((totalPemasukan - prevMonthPemasukan) / prevMonthPemasukan) * 100 
    : 0

  // 4. Compute expense metrics
  const totalPengeluaran = thisMonthTx
    .filter((tx) => tx.type === "expense")
    .reduce((acc, tx) => acc + tx.amount, 0)

  const prevMonthPengeluaran = prevMonthTx
    .filter((tx) => tx.type === "expense")
    .reduce((acc, tx) => acc + tx.amount, 0)

  const expenseTrend = prevMonthPengeluaran > 0 
    ? ((totalPengeluaran - prevMonthPengeluaran) / prevMonthPengeluaran) * 100 
    : 0

  // 5. Compute net cash flow
  const cashFlow = totalPemasukan - totalPengeluaran
  const prevMonthCashFlow = prevMonthPemasukan - prevMonthPengeluaran

  // ----------------------------------------------------
  // Premium Features: Eye Toggle, Smart Insight, Share
  // ----------------------------------------------------
  const [showBalance, setShowBalance] = React.useState(true)

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ticzy-show-balance")
      if (saved !== null) {
        setShowBalance(saved === "true")
      }
    }
  }, [])

  const toggleBalance = () => {
    const newVal = !showBalance
    setShowBalance(newVal)
    localStorage.setItem("ticzy-show-balance", String(newVal))
    toast.info(
      lang === "id"
        ? (newVal ? "Saldo ditampilkan" : "Saldo disembunyikan")
        : (newVal ? "Balance visible" : "Balance hidden")
    )
  }

  const handleSmartInsight = () => {
    let message = ""
    if (cashFlow > 0) {
      message = lang === "id"
        ? `Arus kas Anda SURPLUS sebesar ${formatRupiah(cashFlow)} bulan ini! Rasio tabungan Anda sangat sehat. Pertahankan kebiasaan menabung yang luar biasa ini!`
        : `Your cash flow is in SURPLUS by ${formatRupiah(cashFlow)} this month! Your savings rate is very healthy. Keep up the excellent bookkeeping habits!`
    } else if (cashFlow === 0) {
      message = lang === "id"
        ? `Arus kas Anda seimbang. Pendapatan Anda sama persis dengan pengeluaran Anda. Coba kurangi beberapa pos pengeluaran non-primer untuk mulai menabung.`
        : `Your cash flow is perfectly balanced. Your income matches your expenses. Try cutting down some non-essential expenses to start saving.`
    } else {
      message = lang === "id"
        ? `Arus kas Anda DEFISIT sebesar ${formatRupiah(Math.abs(cashFlow))} bulan ini. Evaluasi kembali daftar pengeluaran terbesar Anda dan batasi pembelanjaan impulsif.`
        : `Your cash flow is in DEFICIT by ${formatRupiah(Math.abs(cashFlow))} this month. Re-evaluate your top expenses and limit impulsive purchases.`
    }

    toast(lang === "id" ? "💡 Wawasan Pintar" : "💡 Smart Insight", {
      description: message,
      duration: 5000,
    })
  }

  const handleShareFinance = async () => {
    const summaryText = lang === "id"
      ? `📊 Ringkasan Keuangan Ticzy - Buku "${activeBook?.name || 'Utama'}":\n• Saldo Saat Ini: ${showBalance ? formatRupiah(totalSaldo) : '••••••'}\n• Pemasukan: ${formatRupiah(totalPemasukan)}\n• Pengeluaran: ${formatRupiah(totalPengeluaran)}\n• Status: ${cashFlow >= 0 ? "Surplus" : "Defisit"} (${formatRupiah(Math.abs(cashFlow))})`
      : `📊 Ticzy Finance Summary - Book "${activeBook?.name || 'Main'}":\n• Current Balance: ${showBalance ? formatRupiah(totalSaldo) : '••••••'}\n• Income: ${formatRupiah(totalPemasukan)}\n• Expense: ${formatRupiah(totalPengeluaran)}\n• Status: ${cashFlow >= 0 ? "Surplus" : "Deficit"} (${formatRupiah(Math.abs(cashFlow))})`

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Ringkasan Keuangan Ticzy",
          text: summaryText,
        })
      } catch (err) {
        // Fallback if dismissed or failed
        navigator.clipboard.writeText(summaryText)
        toast.success(lang === "id" ? "Ringkasan disalin ke papan klip!" : "Summary copied to clipboard!")
      }
    } else {
      navigator.clipboard.writeText(summaryText)
      toast.success(lang === "id" ? "Ringkasan disalin ke papan klip!" : "Summary copied to clipboard!")
    }
  }

  return (
    <div className="px-4 lg:px-6 w-full">
      {/* 📱 MOBILE VIEWPORT: High-fidelity single reference card */}
      <div className="block md:hidden">
        <div className="w-full bg-gradient-to-br from-[#0c5c75] to-[#123e59] text-white rounded-3xl p-5 shadow-xl relative overflow-hidden flex flex-col gap-4 border border-white/10 select-none hover-scale">
          {/* Watermarked Floating Wallet Icon */}
          <IconWallet className="absolute -right-6 -top-6 size-36 text-white/5 pointer-events-none" />

          {/* Balance Section */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-white/70 text-xs font-semibold">
              <span>{lang === "id" ? "Saldo Saat Ini" : "Total Balance"}</span>
              <button 
                onClick={toggleBalance}
                className="hover:text-white transition-colors cursor-pointer p-0.5"
                title={showBalance ? "Sembunyikan Saldo" : "Tampilkan Saldo"}
              >
                {showBalance ? <IconEye className="size-3.5" /> : <IconEyeOff className="size-3.5" />}
              </button>
            </div>
            
            <h2 className="text-3xl font-extrabold tracking-tight tabular-nums mt-1 text-white select-text">
              {showBalance ? formatRupiah(totalSaldo) : "Rp ••••••"}
            </h2>
          </div>

          {/* Income & Expense Split Panel (Glassmorphism capsule) */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 flex items-center justify-between border border-white/5">
            {/* Income */}
            <div className="flex items-center gap-2.5 flex-1 pl-1">
              <div className="p-1.5 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0">
                <IconArrowDownRight className="size-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-white/60 font-medium">
                  {lang === "id" ? "Pemasukan" : "Income"}
                </span>
                <span className="text-sm font-bold text-emerald-300 truncate tabular-nums select-text">
                  {formatRupiah(totalPemasukan)}
                </span>
              </div>
            </div>

            {/* Separator line */}
            <div className="h-8 w-px bg-white/15" />

            {/* Expense */}
            <div className="flex items-center gap-2.5 flex-1 pl-4">
              <div className="p-1.5 rounded-full bg-rose-500/20 text-rose-400 shrink-0">
                <IconArrowUpRight className="size-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-white/60 font-medium">
                  {lang === "id" ? "Pengeluaran" : "Expense"}
                </span>
                <span className="text-sm font-bold text-rose-300 truncate tabular-nums select-text">
                  {formatRupiah(totalPengeluaran)}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Split Action Buttons */}
          <div className="bg-white/[0.05] rounded-xl py-2 px-3 flex items-center justify-around text-xs border border-white/5">
            <button
              onClick={handleSmartInsight}
              className="flex items-center justify-center gap-1.5 text-white/90 hover:text-white font-semibold transition-colors cursor-pointer py-1 w-full"
            >
              <IconSparkles className="size-4 text-amber-300 animate-pulse" />
              <span>Smart Insight</span>
            </button>
            
            <div className="h-4 w-px bg-white/10" />
            
            <button
              onClick={handleShareFinance}
              className="flex items-center justify-center gap-1.5 text-white/90 hover:text-white font-semibold transition-colors cursor-pointer py-1 w-full"
            >
              <IconShare className="size-4 text-white/80" />
              <span>{lang === "id" ? "Bagikan Kas" : "Share Finance"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 🖥️ DESKTOP VIEWPORT: High-fidelity 4-card grid (Original unchanged layout) */}
      <div className="hidden md:grid md:grid-cols-4 gap-4 lg:gap-6 transition-all">
        {/* CARD 1: TOTAL SALDO */}
        <Card className="@container/card bg-gradient-to-t from-primary/5 to-card shadow-xs dark:bg-card" size="sm">
          <CardHeader>
            <CardDescription className="flex items-center gap-1 text-xs md:text-sm font-medium">
              <IconWallet className="size-3.5 text-primary" />
              {lang === "id" ? "Saldo Saat Ini" : "Current Balance"}
            </CardDescription>
            <CardTitle className="text-sm font-bold tracking-tight tabular-nums @[180px]/card:text-base @[240px]/card:text-lg md:text-xl lg:text-2xl text-foreground">
              {formatRupiah(totalSaldo)}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="px-1 py-0 text-[10px] select-none bg-primary/5 text-primary border-primary/20">
                {lang === "id" ? "Kas Aktif" : "Active Cash"}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-0.5 text-xs">
            <div className="text-muted-foreground">
              {lang === "id" ? "Akumulasi saldo kas bersih." : "Accumulated net balance."}
            </div>
          </CardFooter>
        </Card>

        {/* CARD 2: TOTAL PEMASUKAN */}
        <Card className="@container/card bg-gradient-to-t from-emerald-500/5 to-card shadow-xs dark:bg-card" size="sm">
          <CardHeader>
            <CardDescription className="flex items-center gap-1 text-xs md:text-sm font-medium">
              <IconArrowDownRight className="size-3.5 text-emerald-500" />
              {lang === "id" ? "Pemasukan" : "Income"}
            </CardDescription>
            <CardTitle className="text-sm font-bold tracking-tight tabular-nums @[180px]/card:text-base @[240px]/card:text-lg md:text-xl lg:text-2xl text-emerald-600 dark:text-emerald-400">
              {formatRupiah(totalPemasukan)}
            </CardTitle>
            <CardAction>
              {incomeTrend >= 0 ? (
                <Badge variant="outline" className="px-1 py-0 gap-0.5 text-[10px] select-none bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                  <IconTrendingUp className="size-2.5" />
                  {incomeTrend > 0 ? `+${incomeTrend.toFixed(0)}%` : "0%"}
                </Badge>
              ) : (
                <Badge variant="outline" className="px-1 py-0 gap-0.5 text-[10px] select-none bg-rose-500/5 text-rose-500 border-rose-500/20">
                  <IconTrendingDown className="size-2.5" />
                  {`${incomeTrend.toFixed(0)}%`}
                </Badge>
              )}
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-0.5 text-xs">
            <div className="text-muted-foreground truncate max-w-full">
              {lang === "id" ? "Lalu: " : "Prev: "}{formatRupiah(prevMonthPemasukan)}
            </div>
          </CardFooter>
        </Card>

        {/* CARD 3: TOTAL PENGELUARAN */}
        <Card className="@container/card bg-gradient-to-t from-rose-500/5 to-card shadow-xs dark:bg-card" size="sm">
          <CardHeader>
            <CardDescription className="flex items-center gap-1 text-xs md:text-sm font-medium">
              <IconArrowUpRight className="size-3.5 text-rose-500" />
              {lang === "id" ? "Pengeluaran" : "Expense"}
            </CardDescription>
            <CardTitle className="text-sm font-bold tracking-tight tabular-nums @[180px]/card:text-base @[240px]/card:text-lg md:text-xl lg:text-2xl text-rose-600 dark:text-rose-400">
              {formatRupiah(totalPengeluaran)}
            </CardTitle>
            <CardAction>
              {expenseTrend <= 0 ? (
                <Badge variant="outline" className="px-1 py-0 gap-0.5 text-[10px] select-none bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                  <IconTrendingDown className="size-2.5" />
                  {expenseTrend !== 0 ? `${expenseTrend.toFixed(0)}%` : "0%"}
                </Badge>
              ) : (
                <Badge variant="outline" className="px-1 py-0 gap-0.5 text-[10px] select-none bg-rose-500/5 text-rose-600 dark:text-rose-400 border-rose-500/20">
                  <IconTrendingUp className="size-2.5" />
                  {`+${expenseTrend.toFixed(0)}%`}
                </Badge>
              )}
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-0.5 text-xs">
            <div className="text-muted-foreground truncate max-w-full">
              {lang === "id" ? "Lalu: " : "Prev: "}{formatRupiah(prevMonthPengeluaran)}
            </div>
          </CardFooter>
        </Card>

        {/* CARD 4: CASH FLOW BERSIH */}
        <Card className="@container/card bg-gradient-to-t from-violet-500/5 to-card shadow-xs dark:bg-card" size="sm">
          <CardHeader>
            <CardDescription className="flex items-center gap-1 text-xs md:text-sm font-medium">
              <IconScale className="size-3.5 text-violet-500" />
              {lang === "id" ? "Selisih (Cash Flow)" : "Cash Flow"}
            </CardDescription>
            <CardTitle className={`text-sm font-bold tracking-tight tabular-nums @[180px]/card:text-base @[240px]/card:text-lg md:text-xl lg:text-2xl ${cashFlow >= 0 ? "text-violet-600 dark:text-violet-400" : "text-amber-600 dark:text-amber-500"}`}>
              {formatRupiah(cashFlow)}
            </CardTitle>
            <CardAction>
              <Badge 
                variant="outline" 
                className={`px-1 py-0 text-[10px] select-none border-violet-500/20 bg-violet-500/5 ${cashFlow >= 0 ? "text-violet-600 dark:text-violet-400" : "text-amber-500"}`}
              >
                {cashFlow >= 0 ? (lang === "id" ? "Surplus" : "Surplus") : (lang === "id" ? "Defisit" : "Deficit")}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-0.5 text-xs">
            <div className="text-muted-foreground truncate max-w-full">
              {lang === "id" ? "Lalu: " : "Prev: "}{formatRupiah(prevMonthCashFlow)}
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
