"use client"

import * as React from "react"
import { useActiveBook } from "@/hooks/use-active-book"
import { useLiveQuery } from "dexie-react-hooks"
import { db, type Transaction } from "@/lib/db"
import {
  createTransaction,
  updateTransaction,
  softDeleteTransaction,
  bulkSoftDeleteTransactions,
  getSimilarTransactions,
  type SimilarGroup
} from "@/lib/db-helpers"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  IconDotsVertical,
  IconChevronDown,
  IconPlus,
  IconChevronLeft,
  IconChevronRight,
  IconTrash,
  IconSearch,
  IconEdit,
  IconCloudCheck,
  IconDeviceFloppy,
  IconCalendar,
  IconCheck,
  IconSparkles
} from "@tabler/icons-react"

export function DataTable() {
  const { activeBookId } = useActiveBook()
  
  // ----------------------------------------------------
  // Live State Queries (IndexedDB)
  // ----------------------------------------------------
  
  // Fetch transactions for the active book reactively
  const transactions = useLiveQuery(
    () => activeBookId 
      ? db.transactions
          .where("book_id")
          .equals(activeBookId)
          .and(tx => tx.is_deleted === 0)
          .reverse()
          .sortBy("transaction_date")
      : Promise.resolve([] as Transaction[]),
    [activeBookId]
  ) || []

  // Fetch similar transaction groups for autofill suggestions
  const similarGroups = useLiveQuery(
    () => activeBookId ? getSimilarTransactions(activeBookId) : Promise.resolve([]),
    [activeBookId]
  ) || []

  // ----------------------------------------------------
  // React Table States
  // ----------------------------------------------------
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })

  // Filter tab state (Semua, Pemasukan, Pengeluaran)
  const [typeFilter, setTypeFilter] = React.useState<"all" | "income" | "expense">("all")

  // Search input query
  const [searchQuery, setSearchQuery] = React.useState("")

  // Filtered transactions computed based on Search and Tab selections
  const filteredData = React.useMemo(() => {
    return transactions.filter(tx => {
      const matchesSearch = (tx.description || "").toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = typeFilter === "all" ? true : tx.type === typeFilter
      return matchesSearch && matchesType
    })
  }, [transactions, searchQuery, typeFilter])

  // Reset page when filter changes
  React.useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [searchQuery, typeFilter])

  // ----------------------------------------------------
  // Dialog (Create / Edit) Form States
  // ----------------------------------------------------
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [editingTx, setEditingTx] = React.useState<Transaction | null>(null)
  
  const [txType, setTxType] = React.useState<"income" | "expense">("expense")
  const [txDate, setTxDate] = React.useState("")
  const [txDesc, setTxDesc] = React.useState("")
  const [txAmount, setTxAmount] = React.useState("")

  // Quick suggestions based on autocomplete query
  const autocompleteSuggestions = React.useMemo(() => {
    if (!txDesc.trim()) return []
    // Filter groups where description matches
    return similarGroups
      .filter(g => g.description.toLowerCase().includes(txDesc.toLowerCase()))
      .slice(0, 3)
  }, [similarGroups, txDesc])

  // Populate form for creation or editing
  const openCreateForm = () => {
    setEditingTx(null)
    setTxType("expense")
    
    // Set date input local value: YYYY-MM-DD
    const localDate = new Date().toISOString().split("T")[0]
    setTxDate(localDate)
    
    setTxDesc("")
    setTxAmount("")
    setIsFormOpen(true)
  }

  const openEditForm = (tx: Transaction) => {
    setEditingTx(tx)
    setTxType(tx.type)
    
    // Slice date to YYYY-MM-DD for standard input
    setTxDate(tx.transaction_date.slice(0, 10))
    
    setTxDesc(tx.description || "")
    setTxAmount(tx.amount.toString())
    setIsFormOpen(true)
  }

  // Handle Form Submission
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!txDate) {
      toast.error("Tanggal transaksi harus diisi!")
      return
    }
    if (!txDesc.trim()) {
      toast.error("Deskripsi transaksi harus diisi!")
      return
    }
    const amountVal = parseFloat(txAmount)
    if (isNaN(amountVal) || amountVal <= 0) {
      toast.error("Nominal transaksi harus berupa angka positif!")
      return
    }

    if (!activeBookId) {
      toast.error("Buku keuangan tidak valid!")
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id || null

      const isoDateTime = new Date(txDate).toISOString()

      if (editingTx) {
        // Update
        await updateTransaction(editingTx.id, {
          transaction_date: isoDateTime,
          description: txDesc.trim(),
          amount: amountVal,
          type: txType,
          user_id: userId,
        })
        toast.success("Catatan transaksi berhasil diperbarui!")
      } else {
        // Create
        await createTransaction({
          book_id: activeBookId,
          transaction_date: isoDateTime,
          description: txDesc.trim(),
          amount: amountVal,
          type: txType,
          user_id: userId,
        })
        toast.success("Transaksi baru berhasil dicatat!")
      }
      setIsFormOpen(false)
    } catch (err: any) {
      toast.error("Gagal menyimpan transaksi: " + err.message)
    }
  }

  // Handle Individual Soft-Delete
  const handleDeleteTransaction = async (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) {
      try {
        await softDeleteTransaction(id)
        toast.success("Transaksi berhasil dihapus.")
      } catch (err: any) {
        toast.error("Gagal menghapus transaksi: " + err.message)
      }
    }
  }

  // Handle Bulk Soft-Delete
  const handleBulkDelete = async () => {
    const selectedIds = Object.keys(rowSelection).map(
      (idx) => filteredData[parseInt(idx)].id
    )

    if (selectedIds.length === 0) return

    if (confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} transaksi terpilih secara massal?`)) {
      try {
        await bulkSoftDeleteTransactions(selectedIds)
        setRowSelection({})
        toast.success(`${selectedIds.length} transaksi berhasil dihapus!`)
      } catch (err: any) {
        toast.error("Gagal menghapus massal: " + err.message)
      }
    }
  }

  // Apply quick autocomplete suggestion
  const handleApplySuggestion = (group: SimilarGroup) => {
    setTxDesc(group.description)
    // Find average or most recent amount in the group
    const avgAmount = group.transactions.length > 0 
      ? group.transactions[0].amount 
      : 0
    setTxAmount(avgAmount.toString())
    toast.info(`Smart autofill: mengisi nominal Rp ${new Intl.NumberFormat("id-ID").format(avgAmount)}`)
  }

  // ----------------------------------------------------
  // React Table Columns Definition
  // ----------------------------------------------------
  const columns = React.useMemo<ColumnDef<Transaction>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Pilih semua"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Pilih baris"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "transaction_date",
      header: "Tanggal",
      cell: ({ row }) => {
        const date = new Date(row.original.transaction_date)
        return (
          <div className="flex items-center gap-1.5 font-medium text-xs whitespace-nowrap text-muted-foreground">
            <IconCalendar className="size-3.5" />
            {date.toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </div>
        )
      },
    },
    {
      accessorKey: "description",
      header: "Deskripsi",
      cell: ({ row }) => (
        <span className="font-semibold text-sm text-foreground">
          {row.original.description || "-"}
        </span>
      ),
    },
    {
      accessorKey: "type",
      header: "Tipe Kas",
      cell: ({ row }) => {
        const isIncome = row.original.type === "income"
        return (
          <Badge
            variant="outline"
            className={`font-semibold px-2 py-0.5 border-dashed select-none ${
              isIncome 
                ? "bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" 
                : "bg-rose-500/5 text-rose-600 dark:text-rose-400 border-rose-500/30"
            }`}
          >
            {isIncome ? "Masuk" : "Keluar"}
          </Badge>
        )
      },
    },
    {
      accessorKey: "amount",
      header: "Nominal",
      cell: ({ row }) => {
        const amount = row.original.amount
        const isIncome = row.original.type === "income"
        const formatted = new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(amount)

        return (
          <span className={`font-bold tabular-nums text-sm ${isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
            {isIncome ? `+ ${formatted}` : `- ${formatted}`}
          </span>
        )
      },
    },
    {
      accessorKey: "is_synced",
      header: "Sync Status",
      cell: ({ row }) => {
        const isSynced = row.original.is_synced === 1
        return (
          <Badge
            variant="outline"
            className={`font-medium gap-1 select-none px-2 py-0.5 ${
              isSynced 
                ? "bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                : "bg-amber-500/5 text-amber-600 dark:text-amber-500 border-amber-500/20"
            }`}
          >
            {isSynced ? (
              <>
                <IconCloudCheck className="size-3.5 text-emerald-500" />
                <span>Synced</span>
              </>
            ) : (
              <>
                <IconDeviceFloppy className="size-3.5 text-amber-500" />
                <span>Lokal</span>
              </>
            )}
          </Badge>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex size-8 text-muted-foreground hover:bg-muted cursor-pointer"
              size="icon"
            >
              <IconDotsVertical className="size-4" />
              <span className="sr-only">Menu Aksi</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32 rounded-xl">
            <DropdownMenuItem onClick={() => openEditForm(row.original)} className="cursor-pointer gap-2 py-2">
              <IconEdit className="size-4 text-primary" />
              <span>Edit Kas</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => handleDeleteTransaction(row.original.id)} 
              className="cursor-pointer text-destructive focus:text-destructive gap-2 py-2"
            >
              <IconTrash className="size-4 text-destructive" />
              <span>Hapus Kas</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [filteredData])

  // Table instance hook
  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (_, index) => index.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const selectedCount = Object.keys(rowSelection).length

  return (
    <div className="w-full flex flex-col gap-6">
      {/* ----------------------------------------------------
          Header Filters & Add Trigger Controls
          ---------------------------------------------------- */}
      <Tabs
        value={typeFilter}
        onValueChange={(val) => setTypeFilter(val as any)}
        className="w-full flex-col justify-start gap-4"
      >
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 px-4 lg:px-6">
          {/* Left search & filter controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
            <div className="relative flex-1">
              <IconSearch className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Cari transaksi berdasarkan deskripsi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            
            <TabsList className="h-9 *:data-[slot=tabs-trigger]:px-4">
              <TabsTrigger value="all">Semua</TabsTrigger>
              <TabsTrigger value="income" className="text-emerald-500 focus:text-emerald-600">Masuk</TabsTrigger>
              <TabsTrigger value="expense" className="text-rose-500 focus:text-rose-600">Keluar</TabsTrigger>
            </TabsList>
          </div>

          {/* Right action controls */}
          <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
            {/* Columns hide dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 cursor-pointer">
                  <span>Kolom</span>
                  <IconChevronDown className="size-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36 rounded-xl">
                {table
                  .getAllColumns()
                  .filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize cursor-pointer"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {column.id === "transaction_date" ? "Tanggal" : column.id === "description" ? "Deskripsi" : column.id === "is_synced" ? "Sync Status" : column.id}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Bulk delete action trigger */}
            {selectedCount > 0 && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleBulkDelete}
                className="h-9 gap-1.5 shadow-sm font-semibold cursor-pointer animate-in fade-in zoom-in-95 duration-100"
              >
                <IconTrash className="size-4" />
                <span>Hapus ({selectedCount})</span>
              </Button>
            )}

            {/* Create transaction button */}
            <Button size="sm" onClick={openCreateForm} className="h-9 gap-1.5 shadow-sm font-semibold cursor-pointer">
              <IconPlus className="size-4" />
              <span>Tambah Transaksi</span>
            </Button>
          </div>
        </div>

        {/* ----------------------------------------------------
            Primary Cash Book Data Table View
            ---------------------------------------------------- */}
        <TabsContent value={typeFilter} className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
          <div className="overflow-hidden rounded-xl border bg-card/50 backdrop-blur-md">
            <Table>
              <TableHeader className="bg-muted/50">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="font-semibold text-foreground text-xs py-3 h-auto">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="hover:bg-muted/30">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-2.5">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground font-medium text-sm">
                      Belum ada catatan kas transaksi ditemukan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between px-2 pt-2">
            <div className="hidden flex-1 text-xs font-medium text-muted-foreground lg:flex">
              {table.getFilteredSelectedRowModel().rows.length} dari {table.getFilteredRowModel().rows.length} transaksi terpilih.
            </div>
            
            <div className="flex w-full items-center justify-between sm:justify-end gap-6 lg:w-fit">
              <div className="flex items-center gap-2">
                <Label htmlFor="rows-per-page" className="text-xs font-semibold text-muted-foreground">
                  Baris per halaman
                </Label>
                <Select
                  value={`${table.getState().pagination.pageSize}`}
                  onValueChange={(value) => table.setPageSize(Number(value))}
                >
                  <SelectTrigger size="sm" className="w-16 h-8 text-xs font-medium" id="rows-per-page">
                    <SelectValue placeholder={table.getState().pagination.pageSize} />
                  </SelectTrigger>
                  <SelectContent side="top">
                    {[10, 20, 30, 40, 50].map((pageSize) => (
                      <SelectItem key={pageSize} value={`${pageSize}`} className="text-xs">
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex w-fit items-center justify-center text-xs font-semibold text-muted-foreground">
                Halaman {table.getState().pagination.pageIndex + 1} dari {table.getPageCount() || 1}
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  className="size-8"
                  size="icon"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">Sebelumnya</span>
                  <IconChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  className="size-8"
                  size="icon"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <span className="sr-only">Berikutnya</span>
                  <IconChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ----------------------------------------------------
          Unified Transaction Modal Sheet Form (Dialog)
          ---------------------------------------------------- */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <form onSubmit={handleSaveTransaction}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                {editingTx ? "Edit Transaksi Kas" : "Tambah Transaksi Kas Baru"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {editingTx 
                  ? "Perbarui rincian kas masuk atau kas keluar terdaftar Anda di bawah ini." 
                  : "Catat pengeluaran atau pemasukan baru ke dalam buku kas keuangan Anda."}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 text-sm">
              {/* Tipe Transaksi: Tabs Trigger */}
              <div className="grid gap-1.5">
                <Label>Tipe Transaksi</Label>
                <Tabs 
                  value={txType} 
                  onValueChange={(val) => setTxType(val as any)} 
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2 h-9">
                    <TabsTrigger value="expense" className="text-rose-500 font-semibold cursor-pointer">Pengeluaran</TabsTrigger>
                    <TabsTrigger value="income" className="text-emerald-500 font-semibold cursor-pointer">Pemasukan</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Tanggal Picker */}
              <div className="grid gap-1.5">
                <Label htmlFor="txDate">Tanggal Transaksi</Label>
                <Input
                  id="txDate"
                  type="date"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="h-9"
                  required
                />
              </div>

              {/* Deskripsi dengan Autocomplete */}
              <div className="grid gap-1.5 relative">
                <Label htmlFor="txDesc">Deskripsi Transaksi</Label>
                <Input
                  id="txDesc"
                  value={txDesc}
                  onChange={(e) => setTxDesc(e.target.value)}
                  placeholder="Contoh: Beli Makan Siang, Kopi, Gaji Bulanan"
                  className="h-9"
                  required
                  maxLength={64}
                />
                
                {/* Autocomplete Quick Suggestions */}
                {autocompleteSuggestions.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-1 animate-in slide-in-from-top-1 duration-75">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-semibold">
                      <IconSparkles className="size-3 text-amber-500" />
                      Saran Transaksi Serupa:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {autocompleteSuggestions.map((group, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleApplySuggestion(group)}
                          className="text-xs bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-full cursor-pointer flex items-center gap-1.5 font-medium transition-all"
                        >
                          <span>{group.description}</span>
                          <span className="font-semibold text-[10px] opacity-75">
                            (Rp {new Intl.NumberFormat("id-ID").format(group.transactions[0].amount)})
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Nominal Input */}
              <div className="grid gap-1.5">
                <Label htmlFor="txAmount">Nominal Transaksi (Rupiah)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-semibold text-muted-foreground select-none">
                    Rp
                  </span>
                  <Input
                    id="txAmount"
                    type="number"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    placeholder="Contoh: 25000"
                    className="pl-9 h-9 font-semibold"
                    min="1"
                    required
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
                className="cursor-pointer"
              >
                Batal
              </Button>
              <Button type="submit" className="cursor-pointer font-semibold gap-1.5">
                <IconCheck className="size-4" />
                <span>Simpan Transaksi</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
