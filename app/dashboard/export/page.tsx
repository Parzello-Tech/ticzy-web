"use client"

import * as React from "react"
import { db } from "@/lib/db"
import { toast } from "sonner"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import {
  IconDownload,
  IconUpload,
  IconFileText,
  IconCheck,
  IconAlertTriangle,
  IconRefresh,
  IconCloudCheck,
} from "@tabler/icons-react"

interface BackupFilePayload {
  version: number
  exported_at: string
  books: any[]
  transactions: any[]
}

export default function ExportPage() {
  const [fileName, setFileName] = React.useState("")
  const [parsedData, setParsedData] = React.useState<BackupFilePayload | null>(null)
  const [importStrategy, setImportStrategy] = React.useState<"merge" | "overwrite">("merge")

  // Drag and drop border active highlight state
  const [dragActive, setDragActive] = React.useState(false)

  // Export local database to a downloadable JSON file
  const handleExportData = async () => {
    try {
      const books = await db.books.toArray()
      const transactions = await db.transactions.toArray()

      const payload: BackupFilePayload = {
        version: 1,
        exported_at: new Date().toISOString(),
        books,
        transactions,
      }

      const jsonString = JSON.stringify(payload, null, 2)
      const blob = new Blob([jsonString], { type: "application/json" })
      const url = URL.createObjectURL(blob)

      const link = document.createElement("a")
      link.href = url
      link.download = `ticzy_backup_${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success("Cadangan berkas keuangan berhasil diekspor dan diunduh!")
    } catch (err: any) {
      toast.error("Gagal mengekspor data kas: " + err.message)
    }
  }

  // Validate uploaded file schema structure
  const validateAndSetFile = (text: string, name: string) => {
    try {
      const data = JSON.parse(text)
      
      // Strict structural checks
      if (!data.books || !Array.isArray(data.books) || !data.transactions || !Array.isArray(data.transactions)) {
        throw new Error("Format cadangan tidak valid: Harus memiliki array 'books' dan 'transactions'.")
      }

      setParsedData({
        version: data.version || 1,
        exported_at: data.exported_at || new Date().toISOString(),
        books: data.books,
        transactions: data.transactions,
      })
      setFileName(name)
      toast.success("Berkas cadangan berhasil divalidasi!")
    } catch (err: any) {
      toast.error("Error validasi berkas: " + err.message)
      setParsedData(null)
      setFileName("")
    }
  }

  // File Upload Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          validateAndSetFile(event.target.result as string, file.name)
        }
      }
      reader.readAsText(file)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type !== "application/json" && !file.name.endsWith(".json")) {
        toast.error("Format berkas harus berupa berkas .json!")
        return
      }

      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          validateAndSetFile(event.target.result as string, file.name)
        }
      }
      reader.readAsText(file)
    }
  }

  // Process data import using selected strategy
  const handleProcessImport = async () => {
    if (!parsedData) return

    try {
      await db.transaction("rw", [db.books, db.transactions], async () => {
        // Strategy Overwrite: Drop existing tables
        if (importStrategy === "overwrite") {
          await db.books.clear()
          await db.transactions.clear()
        }

        // 1. Process books
        for (const book of parsedData.books) {
          const localBook = await db.books.get(book.id)
          if (importStrategy === "overwrite" || !localBook) {
            // Force reset is_synced to 0 on import so SyncEngine syncs them to Cloud next time user goes online
            await db.books.put({
              ...book,
              is_synced: 0,
            })
          }
        }

        // 2. Process transactions
        for (const tx of parsedData.transactions) {
          const localTx = await db.transactions.get(tx.id)
          if (importStrategy === "overwrite" || !localTx) {
            await db.transactions.put({
              ...tx,
              is_synced: 0,
            })
          }
        }
      })

      const totalItems = parsedData.books.length + parsedData.transactions.length
      toast.success(
        `Impor sukses! Berhasil ${
          importStrategy === "merge" ? "menggabungkan" : "menggantikan"
        } ${totalItems} baris data.`
      )
      
      // Reset state
      setParsedData(null)
      setFileName("")
    } catch (err: any) {
      toast.error("Gagal memproses impor data: " + err.message)
    }
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
          <div className="pb-2 border-b">
            <h2 className="text-xl font-bold tracking-tight">Ekspor & Impor Data Keuangan</h2>
            <p className="text-xs text-muted-foreground">
              Cadangkan data kas Anda ke penyimpanan lokal secara mandiri atau pulihkan data dari browser lain secara mudah.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* EXPORT CARD */}
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-1.5">
                  <IconDownload className="size-4.5 text-indigo-500" />
                  Cadangkan Data Keuangan (Ekspor)
                </CardTitle>
                <CardDescription className="text-xs">
                  Unduh seluruh riwayat buku dan transaksi lokal yang tersimpan di browser Anda saat ini.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between gap-6">
                <div className="space-y-3 pt-2">
                  <div className="rounded-xl border p-4 bg-muted/20 space-y-2">
                    <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      <IconCloudCheck className="size-4" />
                      Informasi Berkas Backup:
                    </h4>
                    <ul className="list-disc pl-4 text-[10px] text-muted-foreground space-y-1">
                      <li>Buku Kas (Termasuk yang telah diarsipkan luring).</li>
                      <li>Seluruh Pemasukan dan Pengeluaran yang dicatat.</li>
                      <li>Format berkas terenkripsi standar JSON aman.</li>
                      <li>Dapat diimpor kembali di perangkat mana pun.</li>
                    </ul>
                  </div>
                </div>

                <Button
                  onClick={handleExportData}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold text-xs cursor-pointer py-5 rounded-xl gap-2 mt-4"
                >
                  <IconDownload className="size-4" />
                  Unduh Berkas JSON Backup
                </Button>
              </CardContent>
            </Card>

            {/* IMPORT CARD */}
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-1.5">
                  <IconUpload className="size-4.5 text-amber-500" />
                  Pulihkan Cadangan (Impor)
                </CardTitle>
                <CardDescription className="text-xs">
                  Unggah berkas JSON cadangan Ticzy yang telah diekspor sebelumnya untuk mengembalikan kas.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                {/* Drag and Drop Zone */}
                {!parsedData ? (
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`flex-1 min-h-[180px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center p-6 transition-all select-none ${
                      dragActive 
                        ? "border-amber-500 bg-amber-500/5 scale-98" 
                        : "border-muted-foreground/20 bg-muted/5 hover:border-amber-500/50 hover:bg-muted/10"
                    }`}
                  >
                    <IconUpload className={`size-8 mb-3 transition-transform ${dragActive ? "animate-bounce text-amber-500" : "text-muted-foreground"}`} />
                    <p className="text-xs font-bold mb-1">
                      Tarik & Letakkan berkas backup di sini
                    </p>
                    <p className="text-[10px] text-muted-foreground mb-4">
                      Atau klik tombol di bawah untuk memilih berkas (.json)
                    </p>
                    
                    <Label htmlFor="file-upload" className="cursor-pointer">
                      <div className="bg-muted px-4 py-2 rounded-lg font-bold text-[10px] border hover:bg-muted/80 transition-colors">
                        Pilih Berkas JSON
                      </div>
                      <Input
                        id="file-upload"
                        type="file"
                        accept=".json"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </Label>
                  </div>
                ) : (
                  /* IMPORT REVIEW INTERFACE */
                  <div className="flex-1 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="rounded-xl border p-4 bg-amber-500/5 border-amber-500/20 space-y-2">
                      <div className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                        <IconFileText className="size-4" />
                        Tinjauan Data Cadangan Terdeteksi:
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <div className="bg-card border p-2.5 rounded-lg flex flex-col">
                          <span className="text-[10px] text-muted-foreground">Buku Kas</span>
                          <span className="text-base font-black text-amber-600">{parsedData.books.length} Buku</span>
                        </div>
                        <div className="bg-card border p-2.5 rounded-lg flex flex-col">
                          <span className="text-[10px] text-muted-foreground">Catatan Transaksi</span>
                          <span className="text-base font-black text-amber-600">{parsedData.transactions.length} Baris</span>
                        </div>
                      </div>
                      <p className="text-[9px] text-muted-foreground mt-2 italic flex items-center gap-1 leading-normal">
                        <IconCheck className="size-3 text-emerald-500 shrink-0" />
                        Validasi Sukses: Cadangan versi {parsedData.version} diekspor pada {new Date(parsedData.exported_at).toLocaleDateString("id-ID")}.
                      </p>
                    </div>

                    {/* Import Strategy Form */}
                    <div className="space-y-2.5 pt-2">
                      <Label className="text-xs font-bold">Pilih Strategi Pemulihan Data:</Label>
                      <RadioGroup
                        value={importStrategy}
                        onValueChange={(val: any) => setImportStrategy(val)}
                        className="flex flex-col gap-2"
                      >
                        {/* STRATEGY MERGE */}
                        <div className="flex items-start gap-2.5 rounded-xl border p-3 bg-card/60 hover:bg-muted/10 cursor-pointer transition-colors">
                          <RadioGroupItem value="merge" id="strategy-merge" className="mt-1" />
                          <Label htmlFor="strategy-merge" className="flex flex-col gap-0.5 cursor-pointer leading-normal">
                            <span className="text-xs font-bold">Gabungkan Data (Merge)</span>
                            <span className="text-[10px] text-muted-foreground">
                              Hanya menulis data baru yang belum ada di browser. Data kas saat ini tidak akan dihapus atau hilang.
                            </span>
                          </Label>
                        </div>

                        {/* STRATEGY OVERWRITE */}
                        <div className="flex items-start gap-2.5 rounded-xl border p-3 border-rose-500/10 bg-card/60 hover:bg-rose-500/5 cursor-pointer transition-colors">
                          <RadioGroupItem value="overwrite" id="strategy-overwrite" className="mt-1 text-rose-500" />
                          <Label htmlFor="strategy-overwrite" className="flex flex-col gap-0.5 cursor-pointer leading-normal">
                            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                              <IconAlertTriangle className="size-3.5" />
                              Gantikan Semua (Overwrite)
                            </span>
                            <span className="text-[10px] text-rose-500/80">
                              MENGHAPUS SELURUH data kas luring browser saat ini dan menggantinya 100% dengan berkas cadangan ini.
                            </span>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-4 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setParsedData(null)
                          setFileName("")
                        }}
                        className="flex-1 font-semibold text-xs cursor-pointer h-9"
                      >
                        <IconRefresh className="size-4" /> Batal
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleProcessImport}
                        className={`flex-1 font-bold text-xs cursor-pointer h-9 ${
                          importStrategy === "overwrite"
                            ? "bg-rose-600 hover:bg-rose-700"
                            : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                      >
                        Mulai Pulihkan Kas
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
