"use client"

import * as React from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db, type Book, type Transaction } from "@/lib/db"
import { toast } from "sonner"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { IconTrash, IconRotate, IconTrashX, IconInfoCircle, IconBook, IconReceipt } from "@tabler/icons-react"

export default function TrashPage() {
  // 1. Fetch soft-deleted books
  const deletedBooks = useLiveQuery(
    () => db.books.where("is_deleted").equals(1).toArray()
  ) || []

  // 2. Fetch soft-deleted transactions
  const deletedTx = useLiveQuery(
    () => db.transactions.where("is_deleted").equals(1).toArray()
  ) || []

  // Mapping books id to name for transaction rows
  const allBooks = useLiveQuery(() => db.books.toArray()) || []
  const bookNameMap = React.useMemo(() => {
    const map: { [id: string]: string } = {}
    allBooks.forEach((b) => {
      map[b.id] = b.name
    })
    return map
  }, [allBooks])

  // Active book limit warnings dialog
  const [limitWarningOpen, setLimitWarningOpen] = React.useState(false)

  // Handlers for Books
  const handleRestoreBook = async (book: Book) => {
    // Check if restoring exceeds the 2 active books limit for Free tier
    const activeBooks = await db.books.where("is_deleted").equals(0).toArray()
    if (activeBooks.length >= 2) {
      setLimitWarningOpen(true)
      return
    }

    try {
      await db.books.update(book.id, {
        is_deleted: 0,
        is_synced: 0,
        updated_at: new Date().toISOString(),
      })
      toast.success(`Buku kas "${book.name}" berhasil dipulihkan!`)
    } catch (err: any) {
      toast.error("Gagal memulihkan buku: " + err.message)
    }
  }

  const handlePermanentDeleteBook = async (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus buku "${name}" secara permanen? Semua data transaksi di dalamnya juga akan terhapus selamanya dari penyimpanan lokal!`)) {
      try {
        await db.books.delete(id)
        await db.transactions.where("book_id").equals(id).delete()
        toast.success(`Buku "${name}" dihapus permanen!`)
      } catch (err: any) {
        toast.error("Gagal menghapus buku: " + err.message)
      }
    }
  }

  // Handlers for Transactions
  const handleRestoreTx = async (tx: Transaction) => {
    // Ensure parent book exists and is not deleted
    const parentBook = await db.books.get(tx.book_id)
    if (!parentBook) {
      toast.error("Buku kas induk untuk transaksi ini telah dihapus permanen. Transaksi tidak dapat dipulihkan.")
      return
    }

    if (parentBook.is_deleted === 1) {
      toast.warning(`Buku kas induk "${parentBook.name}" berstatus terhapus. Pulihkan buku tersebut terlebih dahulu!`)
      return
    }

    try {
      await db.transactions.update(tx.id, {
        is_deleted: 0,
        is_synced: 0,
      })
      toast.success(`Catatan kas "${tx.description}" berhasil dipulihkan!`)
    } catch (err: any) {
      toast.error("Gagal memulihkan transaksi: " + err.message)
    }
  }

  const handlePermanentDeleteTx = async (id: string, desc: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus catatan kas "${desc}" secara permanen? Tindakan ini tidak dapat dibatalkan!`)) {
      try {
        await db.transactions.delete(id)
        toast.success("Catatan kas dihapus permanen!")
      } catch (err: any) {
        toast.error("Gagal menghapus kas: " + err.message)
      }
    }
  }

  // Empty Trash entirely
  const handleEmptyTrash = async () => {
    const totalItems = deletedBooks.length + deletedTx.length
    if (totalItems === 0) return

    if (confirm(`Apakah Anda yakin ingin mengosongkan tempat sampah? Seluruh ${deletedBooks.length} buku dan ${deletedTx.length} transaksi di dalamnya akan DIHAPUS PERMANEN selamanya!`)) {
      try {
        await db.books.where("is_deleted").equals(1).delete()
        await db.transactions.where("is_deleted").equals(1).delete()
        toast.success("Keranjang sampah berhasil dikosongkan!")
      } catch (err: any) {
        toast.error("Gagal mengosongkan sampah: " + err.message)
      }
    }
  }

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
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-2 border-b">
            <div>
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-1.5">
                <IconTrash className="size-5 text-rose-500" />
                Keranjang Sampah (Trash)
              </h2>
              <p className="text-xs text-muted-foreground">
                Arsipkan sementara data Anda. Buku atau transaksi yang dihapus dapat dipulihkan atau dibuang selamanya.
              </p>
            </div>

            {(deletedBooks.length > 0 || deletedTx.length > 0) && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleEmptyTrash}
                className="gap-1.5 shrink-0 self-end sm:self-auto font-semibold cursor-pointer animate-in fade-in zoom-in-95"
              >
                <IconTrashX className="size-4" />
                <span>Kosongkan Tempat Sampah</span>
              </Button>
            )}
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="books" className="w-full">
            <TabsList className="grid w-full sm:w-80 grid-cols-2 mb-4 bg-muted/65 p-1 rounded-xl">
              <TabsTrigger value="books" className="text-xs font-bold gap-1 rounded-lg">
                <IconBook className="size-3.5" />
                Buku Kas ({deletedBooks.length})
              </TabsTrigger>
              <TabsTrigger value="transactions" className="text-xs font-bold gap-1 rounded-lg">
                <IconReceipt className="size-3.5" />
                Catatan Kas ({deletedTx.length})
              </TabsTrigger>
            </TabsList>

            {/* TAB CONTENT: DELETED BOOKS */}
            <TabsContent value="books">
              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-sm font-bold">Daftar Buku Kas Terhapus</CardTitle>
                  <CardDescription className="text-xs">Buku kas yang dipulihkan akan muncul kembali di sidebar navigasi utama.</CardDescription>
                </CardHeader>
                <CardContent className="p-0 border-t">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead className="font-semibold text-xs py-3 h-auto">Nama Buku</TableHead>
                          <TableHead className="font-semibold text-xs py-3 h-auto">Deskripsi</TableHead>
                          <TableHead className="font-semibold text-xs py-3 h-auto">Tema Warna</TableHead>
                          <TableHead className="font-semibold text-xs py-3 h-auto text-right">Aksi Pemulihan</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deletedBooks.length > 0 ? (
                          deletedBooks.map((book) => (
                            <TableRow key={book.id} className="hover:bg-muted/10">
                              <TableCell className="py-2.5 font-bold text-sm">{book.name}</TableCell>
                              <TableCell className="py-2.5 text-xs text-muted-foreground max-w-xs truncate">
                                {book.description || "-"}
                              </TableCell>
                              <TableCell className="py-2.5">
                                <div className="flex items-center gap-1.5 text-xs">
                                  <div 
                                    className="size-3 rounded-full border border-black/10" 
                                    style={{ backgroundColor: `#${(book.color & 0x00FFFFFF).toString(16).padStart(6, '0')}` }}
                                  />
                                  <span className="font-mono text-[10px] text-muted-foreground uppercase">
                                    #{(book.color & 0x00FFFFFF).toString(16).padStart(6, '0')}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="py-2.5 text-right flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRestoreBook(book)}
                                  className="h-8 text-emerald-600 dark:text-emerald-400 border-dashed border-emerald-500/30 hover:bg-emerald-500/5 font-semibold text-[11px] gap-1 cursor-pointer"
                                >
                                  <IconRotate className="size-3.5" />
                                  Pulihkan
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handlePermanentDeleteBook(book.id, book.name)}
                                  className="h-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/5 font-semibold text-[11px] gap-1 cursor-pointer"
                                >
                                  <IconTrash className="size-3.5" />
                                  Permanen
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="h-28 text-center text-muted-foreground font-semibold text-xs">
                              Keranjang sampah buku kas kosong.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB CONTENT: DELETED TRANSACTIONS */}
            <TabsContent value="transactions">
              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-sm font-bold">Daftar Transaksi Kas Terhapus</CardTitle>
                  <CardDescription className="text-xs">Catatan pengeluaran atau pemasukan yang dapat dikembalikan ke buku asalnya.</CardDescription>
                </CardHeader>
                <CardContent className="p-0 border-t">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead className="font-semibold text-xs py-3 h-auto">Deskripsi</TableHead>
                          <TableHead className="font-semibold text-xs py-3 h-auto">Buku Induk</TableHead>
                          <TableHead className="font-semibold text-xs py-3 h-auto">Tipe</TableHead>
                          <TableHead className="font-semibold text-xs py-3 h-auto">Nominal</TableHead>
                          <TableHead className="font-semibold text-xs py-3 h-auto text-right">Aksi Pemulihan</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deletedTx.length > 0 ? (
                          deletedTx.map((tx) => {
                            const isIncome = tx.type === "income"
                            const parentBookName = bookNameMap[tx.book_id] || "Buku Terhapus"
                            return (
                              <TableRow key={tx.id} className="hover:bg-muted/10">
                                <TableCell className="py-2.5 font-bold text-sm">{tx.description}</TableCell>
                                <TableCell className="py-2.5 text-xs text-muted-foreground font-semibold">
                                  {parentBookName}
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
                                <TableCell className="py-2.5 font-bold text-xs tabular-nums">
                                  {formatRupiah(tx.amount)}
                                </TableCell>
                                <TableCell className="py-2.5 text-right flex items-center justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRestoreTx(tx)}
                                    className="h-8 text-emerald-600 dark:text-emerald-400 border-dashed border-emerald-500/30 hover:bg-emerald-500/5 font-semibold text-[11px] gap-1 cursor-pointer"
                                  >
                                    <IconRotate className="size-3.5" />
                                    Pulihkan
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handlePermanentDeleteTx(tx.id, tx.description || "")}
                                    className="h-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/5 font-semibold text-[11px] gap-1 cursor-pointer"
                                  >
                                    <IconTrash className="size-3.5" />
                                    Permanen
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="h-28 text-center text-muted-foreground font-semibold text-xs">
                              Keranjang sampah transaksi kosong.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* ACTIVE BOOK LIMIT WARNING DIALOG */}
          <Dialog open={limitWarningOpen} onOpenChange={setLimitWarningOpen}>
            <DialogContent className="max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-1.5 text-rose-500 font-bold">
                  <IconInfoCircle className="size-5 shrink-0" />
                  Batas Buku Aktif Tercapai!
                </DialogTitle>
                <DialogDescription className="text-xs pt-2 leading-relaxed">
                  Anda sedang menggunakan **Paket Guest / Gratis luring** yang membatasi pembuatan maksimal **2 Buku Keuangan aktif sekaligus**.
                  <br /><br />
                  Harap hapus atau arsipkan salah satu buku aktif Anda terlebih dahulu sebelum dapat memulihkan buku ini kembali, atau sambungkan dengan Supabase Cloud untuk menikmati buku tanpa batasan!
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="pt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setLimitWarningOpen(false)}
                  className="font-bold text-xs cursor-pointer"
                >
                  Mengerti
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
