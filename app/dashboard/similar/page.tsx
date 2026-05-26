"use client"

import * as React from "react"
import { useActiveBook } from "@/hooks/use-active-book"
import { useLiveQuery } from "dexie-react-hooks"
import { db, type Transaction } from "@/lib/db"
import { getSimilarTransactions, bulkSoftDeleteTransactions, type SimilarGroup } from "@/lib/db-helpers"
import { toast } from "sonner"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { IconSparkles, IconChevronDown, IconChevronUp, IconTrash, IconCalendar, IconCheck, IconTrashX } from "@tabler/icons-react"

export default function SimilarTransactionsPage() {
  const { activeBookId } = useActiveBook()
  
  // Reactively fetch similar groups in this book
  const similarGroups = useLiveQuery(
    () => activeBookId ? getSimilarTransactions(activeBookId) : Promise.resolve([] as SimilarGroup[]),
    [activeBookId]
  ) || []

  // Tracking expanded state of card groups
  const [expandedGroups, setExpandedGroups] = React.useState<{ [desc: string]: boolean }>({})

  // Multi-checkbox selection state (stores individual transaction UUIDs)
  const [selectedTxIds, setSelectedTxIds] = React.useState<{ [id: string]: boolean }>({})

  const toggleGroupExpand = (desc: string) => {
    setExpandedGroups((prev) => ({ ...prev, [desc]: !prev[desc] }))
  }

  const handleTxSelect = (id: string) => {
    setSelectedTxIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // Smart Autofill: Keep the newest transaction in the group, and delete all other duplicates!
  const handleKeepNewest = async (group: SimilarGroup) => {
    if (group.transactions.length <= 1) return

    // Transactions are already sorted descending by date inside getSimilarTransactions!
    const newest = group.transactions[0]
    const duplicates = group.transactions.slice(1)
    const duplicateIds = duplicates.map((t) => t.id)

    const dateStr = new Date(newest.transaction_date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })

    if (confirm(`Apakah Anda yakin ingin menghapus ${duplicateIds.length} kas duplikat untuk "${group.description}" dan menyisakan pencatatan terbaru pada ${dateStr}?`)) {
      try {
        await bulkSoftDeleteTransactions(duplicateIds)
        
        // Remove deleted items from selected list
        setSelectedTxIds((prev) => {
          const next = { ...prev }
          duplicateIds.forEach((id) => delete next[id])
          return next
        })

        toast.success(`Berhasil menyisakan transaksi terbaru dan menghapus duplikat "${group.description}"!`)
      } catch (err: any) {
        toast.error("Gagal merapikan duplikat: " + err.message)
      }
    }
  }

  // Delete all manually selected transactions across all groups
  const handleSelectedDelete = async () => {
    const idsToDelete = Object.keys(selectedTxIds).filter((id) => selectedTxIds[id])
    if (idsToDelete.length === 0) return

    if (confirm(`Apakah Anda yakin ingin menghapus ${idsToDelete.length} transaksi terpilih secara massal?`)) {
      try {
        await bulkSoftDeleteTransactions(idsToDelete)
        setSelectedTxIds({})
        toast.success(`Berhasil menghapus ${idsToDelete.length} transaksi duplikat!`)
      } catch (err: any) {
        toast.error("Gagal menghapus terpilih: " + err.message)
      }
    }
  }

  const selectedCount = Object.keys(selectedTxIds).filter((id) => selectedTxIds[id]).length

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
        
        <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 max-w-5xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-2 border-b">
            <div>
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-1.5">
                <IconSparkles className="size-5 text-amber-500" />
                Asisten Pencatatan Duplikat
              </h2>
              <p className="text-xs text-muted-foreground">
                Ticzy secara otomatis mendeteksi catatan keuangan berulang dengan deskripsi identik untuk membantu pembersihan kas massal.
              </p>
            </div>

            {selectedCount > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleSelectedDelete}
                className="gap-1.5 shrink-0 self-end sm:self-auto font-semibold cursor-pointer animate-in fade-in zoom-in-95"
              >
                <IconTrash className="size-4" />
                <span>Hapus Terpilih ({selectedCount})</span>
              </Button>
            )}
          </div>

          {/* Similar Groups Display */}
          <div className="flex flex-col gap-4">
            {similarGroups.length > 0 ? (
              similarGroups.map((group, idx) => {
                const desc = group.description
                const isExpanded = !!expandedGroups[desc]
                const totalAmount = group.transactions.reduce((sum, t) => sum + t.amount, 0)
                const isExpense = group.transactions[0]?.type === "expense"
                
                return (
                  <Card key={idx} className="overflow-hidden border shadow-sm">
                    <CardHeader 
                      className="py-4 px-5 bg-muted/20 hover:bg-muted/40 cursor-pointer flex flex-row items-center justify-between gap-4 transition-colors select-none"
                      onClick={() => toggleGroupExpand(desc)}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-foreground">{desc}</span>
                          <span className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                            {group.count} kali dicatat &bull; Akumulasi Nominal:{" "}
                            <span className={isExpense ? "text-rose-500" : "text-emerald-500"}>
                              {formatRupiah(totalAmount)}
                            </span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        {/* Auto cleanup button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleKeepNewest(group)}
                          className="h-8 border-dashed border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-500/5 font-semibold text-[11px] gap-1 cursor-pointer shrink-0"
                        >
                          <IconTrashX className="size-3.5" />
                          Sisa 1 Terbaru
                        </Button>
                        
                        {/* Chevron collapse trigger */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 cursor-pointer"
                          onClick={() => toggleGroupExpand(desc)}
                        >
                          {isExpanded ? (
                            <IconChevronUp className="size-4" />
                          ) : (
                            <IconChevronDown className="size-4" />
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    
                    {isExpanded && (
                      <CardContent className="p-0 border-t">
                        <Table>
                          <TableHeader className="bg-muted/10">
                            <TableRow>
                              <TableHead className="w-12 text-center h-10 py-1"></TableHead>
                              <TableHead className="font-semibold text-xs h-10 py-1">Tanggal</TableHead>
                              <TableHead className="font-semibold text-xs h-10 py-1">Tipe Kas</TableHead>
                              <TableHead className="font-semibold text-xs h-10 py-1">Nominal</TableHead>
                              <TableHead className="font-semibold text-xs h-10 py-1">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.transactions.map((tx) => {
                              const date = new Date(tx.transaction_date)
                              const isChecked = !!selectedTxIds[tx.id]
                              const isIncome = tx.type === "income"
                              
                              return (
                                <TableRow key={tx.id} className="hover:bg-muted/10">
                                  <TableCell className="text-center py-2.5">
                                    <Checkbox
                                      checked={isChecked}
                                      onCheckedChange={() => handleTxSelect(tx.id)}
                                      aria-label={`Pilih transaksi ${tx.id}`}
                                    />
                                  </TableCell>
                                  <TableCell className="py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                                    <div className="flex items-center gap-1">
                                      <IconCalendar className="size-3.5" />
                                      {date.toLocaleDateString("id-ID", {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                      })}
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-2.5">
                                    <Badge
                                      variant="outline"
                                      className={`font-semibold text-[10px] px-1.5 py-0 border-dashed ${
                                        isIncome
                                          ? "bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                          : "bg-rose-500/5 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                      }`}
                                    >
                                      {isIncome ? "Masuk" : "Keluar"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="py-2.5 font-bold tabular-nums text-xs">
                                    {formatRupiah(tx.amount)}
                                  </TableCell>
                                  <TableCell className="py-2.5 text-xs text-muted-foreground">
                                    {tx.is_synced === 1 ? (
                                      <span className="text-emerald-500 font-semibold flex items-center gap-0.5">
                                        <IconCheck className="size-3.5" /> Synced
                                      </span>
                                    ) : (
                                      <span className="text-amber-500 font-medium">Lokal</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    )}
                  </Card>
                )
              })
            ) : (
              <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
                <div className="size-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 text-emerald-500 border border-emerald-500/20">
                  <IconCheck className="size-6" />
                </div>
                <CardTitle className="text-base font-bold">Semua Bersih & Rapih!</CardTitle>
                <CardDescription className="text-xs max-w-sm mt-1">
                  Luar biasa! Tidak ada transaksi berulang mencurigakan dengan deskripsi identik yang ditemukan di dalam buku keuangan aktif Anda.
                </CardDescription>
              </Card>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
