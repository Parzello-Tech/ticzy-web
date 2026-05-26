"use client"

import * as React from "react"
import { useActiveBook } from "@/hooks/use-active-book"
import { useLiveQuery } from "dexie-react-hooks"
import { db, type Transaction } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { IconTrendingUp, IconTrendingDown, IconWallet, IconArrowUpRight, IconArrowDownRight, IconScale } from "@tabler/icons-react"

export function SectionCards() {
  const { activeBookId } = useActiveBook()

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

  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card transition-all">
      
      {/* CARD 1: TOTAL SALDO */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5 font-medium">
            <IconWallet className="size-4 text-primary" />
            Saldo Saat Ini
          </CardDescription>
          <CardTitle className="text-2xl font-bold tracking-tight tabular-nums @[250px]/card:text-3xl text-foreground">
            {formatRupiah(totalSaldo)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="px-1.5 select-none bg-primary/5 text-primary border-primary/20">
              Kas Aktif
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-xs">
          <div className="text-muted-foreground">
            Akumulasi saldo kas bersih terdaftar.
          </div>
        </CardFooter>
      </Card>

      {/* CARD 2: TOTAL PEMASUKAN */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5 font-medium">
            <IconArrowUpRight className="size-4 text-emerald-500" />
            Pemasukan Bulan Ini
          </CardDescription>
          <CardTitle className="text-2xl font-bold tracking-tight tabular-nums @[250px]/card:text-3xl text-emerald-600 dark:text-emerald-400">
            {formatRupiah(totalPemasukan)}
          </CardTitle>
          <CardAction>
            {incomeTrend >= 0 ? (
              <Badge variant="outline" className="px-1.5 gap-0.5 select-none bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                <IconTrendingUp className="size-3" />
                {incomeTrend > 0 ? `+${incomeTrend.toFixed(0)}%` : "0%"}
              </Badge>
            ) : (
              <Badge variant="outline" className="px-1.5 gap-0.5 select-none bg-rose-500/5 text-rose-500 border-rose-500/20">
                <IconTrendingDown className="size-3" />
                {`${incomeTrend.toFixed(0)}%`}
              </Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-xs">
          <div className="text-muted-foreground">
            Bulan lalu: {formatRupiah(prevMonthPemasukan)}
          </div>
        </CardFooter>
      </Card>

      {/* CARD 3: TOTAL PENGELUARAN */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5 font-medium">
            <IconArrowDownRight className="size-4 text-rose-500" />
            Pengeluaran Bulan Ini
          </CardDescription>
          <CardTitle className="text-2xl font-bold tracking-tight tabular-nums @[250px]/card:text-3xl text-rose-600 dark:text-rose-400">
            {formatRupiah(totalPengeluaran)}
          </CardTitle>
          <CardAction>
            {expenseTrend <= 0 ? (
              <Badge variant="outline" className="px-1.5 gap-0.5 select-none bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                <IconTrendingDown className="size-3" />
                {expenseTrend !== 0 ? `${expenseTrend.toFixed(0)}%` : "0%"}
              </Badge>
            ) : (
              <Badge variant="outline" className="px-1.5 gap-0.5 select-none bg-rose-500/5 text-rose-600 dark:text-rose-400 border-rose-500/20">
                <IconTrendingUp className="size-3" />
                {`+${expenseTrend.toFixed(0)}%`}
              </Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-xs">
          <div className="text-muted-foreground">
            Bulan lalu: {formatRupiah(prevMonthPengeluaran)}
          </div>
        </CardFooter>
      </Card>

      {/* CARD 4: CASH FLOW BERSIH */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5 font-medium">
            <IconScale className="size-4 text-violet-500" />
            Selisih Bersih (Cash Flow)
          </CardDescription>
          <CardTitle className={`text-2xl font-bold tracking-tight tabular-nums @[250px]/card:text-3xl ${cashFlow >= 0 ? "text-violet-600 dark:text-violet-400" : "text-amber-600 dark:text-amber-500"}`}>
            {formatRupiah(cashFlow)}
          </CardTitle>
          <CardAction>
            <Badge 
              variant="outline" 
              className={`px-1.5 select-none border-violet-500/20 bg-violet-500/5 ${cashFlow >= 0 ? "text-violet-600 dark:text-violet-400" : "text-amber-500"}`}
            >
              {cashFlow >= 0 ? "Surplus" : "Defisit"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-xs">
          <div className="text-muted-foreground">
            Cashflow bulan lalu: {formatRupiah(prevMonthCashFlow)}
          </div>
        </CardFooter>
      </Card>

    </div>
  )
}
