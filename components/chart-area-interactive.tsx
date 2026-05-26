"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { useActiveBook } from "@/hooks/use-active-book"
import { useLiveQuery } from "dexie-react-hooks"
import { db, type Transaction } from "@/lib/db"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

const chartConfig = {
  income: {
    label: "Pemasukan",
    color: "#10b981", // Emerald 500
  },
  expense: {
    label: "Pengeluaran",
    color: "#f43f5e", // Rose 500
  },
} satisfies ChartConfig

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const { activeBookId } = useActiveBook()
  const [timeRange, setTimeRange] = React.useState("30d")

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  // Reactively fetch active book's transactions (excluding deleted)
  const transactions = useLiveQuery(
    () => activeBookId ? db.transactions.where("book_id").equals(activeBookId).and(tx => tx.is_deleted === 0).toArray() : Promise.resolve([] as Transaction[]),
    [activeBookId]
  ) || []

  // Aggregate daily data depending on the selected timeRange
  const filteredData = React.useMemo(() => {
    let daysToSubtract = 90
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }

    // 1. Generate date timeline for the last N days (keys in YYYY-MM-DD format)
    const timeline: { [dateStr: string]: { date: string, income: number, expense: number } } = {}
    
    for (let i = daysToSubtract - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split("T")[0] // YYYY-MM-DD
      timeline[dateStr] = {
        date: dateStr,
        income: 0,
        expense: 0,
      }
    }

    // 2. Sum transaction values for matching days
    for (const tx of transactions) {
      const txDateStr = tx.transaction_date.split("T")[0]
      if (timeline[txDateStr]) {
        if (tx.type === "income") {
          timeline[txDateStr].income += tx.amount
        } else {
          timeline[txDateStr].expense += tx.amount
        }
      }
    }

    // 3. Convert to sorted array for recharts
    return Object.values(timeline).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
  }, [transactions, timeRange])

  // Aggregate total income and expenses for subheader display
  const totalIncome = filteredData.reduce((sum, item) => sum + item.income, 0)
  const totalExpense = filteredData.reduce((sum, item) => sum + item.expense, 0)

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val)
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Statistik Arus Kas</CardTitle>
        <CardDescription>
          <span className="hidden @[600px]/card:inline text-xs text-muted-foreground">
            Total periode: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatRupiah(totalIncome)} Masuk</span> / <span className="font-semibold text-rose-600 dark:text-rose-400">{formatRupiah(totalExpense)} Keluar</span>
          </span>
          <span className="@[600px]/card:hidden text-xs text-muted-foreground">
            Kas masuk & keluar berdasarkan periode terpilih
          </span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={(val) => {
              if (val) setTimeRange(val)
            }}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">90 Hari Terakhir</ToggleGroupItem>
            <ToggleGroupItem value="30d">30 Hari Terakhir</ToggleGroupItem>
            <ToggleGroupItem value="7d">7 Hari Terakhir</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Pilih Periode"
            >
              <SelectValue placeholder="30 Hari Terakhir" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                90 Hari Terakhir
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                30 Hari Terakhir
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                7 Hari Terakhir
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillIncome" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="#10b981"
                  stopOpacity={0.4}
                />
                <stop
                  offset="95%"
                  stopColor="#10b981"
                  stopOpacity={0.0}
                />
              </linearGradient>
              <linearGradient id="fillExpense" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="#f43f5e"
                  stopOpacity={0.4}
                />
                <stop
                  offset="95%"
                  stopColor="#f43f5e"
                  stopOpacity={0.0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("id-ID", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("id-ID", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="income"
              name="Pemasukan"
              type="monotone"
              fill="url(#fillIncome)"
              stroke="#10b981"
              strokeWidth={2}
              stackId="income"
            />
            <Area
              dataKey="expense"
              name="Pengeluaran"
              type="monotone"
              fill="url(#fillExpense)"
              stroke="#f43f5e"
              strokeWidth={2}
              stackId="expense"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
