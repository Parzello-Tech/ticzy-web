"use client"

import * as React from "react"
import { toast } from "sonner"
import { useActiveBook } from "@/hooks/use-active-book"
import { createBook, softDeleteBook } from "@/lib/db-helpers"
import { supabase } from "@/lib/supabase"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useLang } from "@/hooks/use-lang"
import { 
  IconDashboard, 
  IconListDetails, 
  IconChartBar, 
  IconSettings, 
  IconHelp, 
  IconSearch, 
  IconChevronDown, 
  IconPlus, 
  IconCheck, 
  IconTrash,
  IconWallet,
  IconDownload
} from "@tabler/icons-react"

// ARGB colors for the book switcher
const colorPalette = [
  { value: 4279031273, hex: "#0ea5e9", name: "Sky Blue" },
  { value: 4279166849, hex: "#10b981", name: "Emerald" },
  { value: 4287258870, hex: "#8b5cf6", name: "Purple" },
  { value: 4294197086, hex: "#f43f5e", name: "Rose" },
  { value: 4294286859, hex: "#f59e0b", name: "Amber" },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { activeBookId, activeBook, books, switchBook } = useActiveBook()
  const { lang } = useLang()

  const navMain = React.useMemo(() => [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <IconDashboard />,
    },
    {
      title: lang === "id" ? "Rekap Bulanan" : "Monthly Recap",
      url: "/dashboard/rekap",
      icon: <IconChartBar />,
    },
    {
      title: lang === "id" ? "Pembersih Duplikat" : "Duplicate Cleaner",
      url: "/dashboard/similar",
      icon: <IconListDetails />,
    },
    {
      title: lang === "id" ? "Keranjang Sampah" : "Trash Center",
      url: "/dashboard/trash",
      icon: <IconTrash />,
    },
  ], [lang])

  const navSecondary = React.useMemo(() => [
    {
      title: lang === "id" ? "Ekspor & Impor" : "Export & Import",
      url: "/dashboard/export",
      icon: <IconDownload />,
    },
    {
      title: lang === "id" ? "Pengaturan" : "Settings",
      url: "/dashboard/settings",
      icon: <IconSettings />,
    },
  ], [lang])
  
  // State for creating new book
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [newBookName, setNewBookName] = React.useState("")
  const [selectedColor, setSelectedColor] = React.useState(4279031273) // Sky Blue default

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBookName.trim()) {
      toast.error("Nama buku tidak boleh kosong!")
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id || null

      const bookId = await createBook({
        name: newBookName.trim(),
        description: "Buku catatan keuangan pribadi",
        color: selectedColor,
        icon: "IconWallet",
        user_id: userId,
      })

      toast.success("Buku keuangan baru berhasil dibuat!")
      switchBook(bookId)
      
      // Reset state & close
      setNewBookName("")
      setSelectedColor(4279031273)
      setIsCreateOpen(false)
    } catch (err: any) {
      toast.error("Gagal membuat buku: " + err.message)
    }
  }

  const handleDeleteBook = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation() // Prevent dropdown closing or book switching
    
    if (name === "Buku Utama") {
      toast.error("Buku utama bawaan tidak dapat dihapus!")
      return
    }

    if (books.length <= 1) {
      toast.error("Minimal harus menyisakan 1 buku keuangan aktif!")
      return
    }

    if (confirm(`Apakah Anda yakin ingin menghapus buku "${name}" beserta seluruh catatan transaksinya?`)) {
      try {
        await softDeleteBook(id)
        toast.success(`Buku "${name}" berhasil dihapus.`)
      } catch (err: any) {
        toast.error("Gagal menghapus buku: " + err.message)
      }
    }
  }

  // Convert book ARGB color to CSS Hex
  const getBookHex = (colorValue?: number) => {
    if (!colorValue) return "#0ea5e9"
    // Mask to 24-bit to remove alpha and convert to hex
    return `#${(colorValue & 0xffffff).toString(16).padStart(6, "0")}`
  }

  const activeBookColorHex = getBookHex(activeBook?.color)

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="w-full justify-between hover:bg-sidebar-accent cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-white font-bold transition-all shadow-md"
                        style={{ backgroundColor: activeBookColorHex }}
                      >
                        <IconWallet className="size-4 text-white" />
                      </div>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">
                          {activeBook?.name || "Memuat..."}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          Ticzy Keuangan
                        </span>
                      </div>
                    </div>
                    <IconChevronDown className="size-4 opacity-50" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 rounded-xl" align="start">
                  <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1.5">
                    Pilih Buku Keuangan
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {books.map((b) => {
                    const hex = getBookHex(b.color)
                    const isActive = activeBookId === b.id
                    return (
                      <DropdownMenuItem
                        key={b.id}
                        onClick={() => switchBook(b.id)}
                        className="flex items-center justify-between py-2 cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="size-3 rounded-full border border-white/20"
                            style={{ backgroundColor: hex }}
                          />
                          <span className={isActive ? "font-semibold text-foreground" : "text-muted-foreground"}>
                            {b.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isActive && (
                            <IconCheck className="size-4 text-primary shrink-0" />
                          )}
                          {b.name !== "Buku Utama" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => handleDeleteBook(e, b.id, b.name)}
                            >
                              <IconTrash className="size-3" />
                              <span className="sr-only">Hapus</span>
                            </Button>
                          )}
                        </div>
                      </DropdownMenuItem>
                    )
                  })}
                  
                  <DropdownMenuSeparator />
                  <DialogTrigger asChild>
                    <DropdownMenuItem className="flex items-center gap-2 py-2 cursor-pointer text-primary focus:text-primary font-medium">
                      <IconPlus className="size-4 text-primary" />
                      <span>Tambah Buku Baru</span>
                    </DropdownMenuItem>
                  </DialogTrigger>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>

          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleCreateBook}>
              <DialogHeader>
                <DialogTitle>Buat Buku Baru</DialogTitle>
                <DialogDescription>
                  Pisahkan catatan kas transaksi Anda dengan membuat buku baru (misal: Buku Bisnis, Buku Bulanan).
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="bookName">Nama Buku</Label>
                  <Input
                    id="bookName"
                    value={newBookName}
                    onChange={(e) => setNewBookName(e.target.value)}
                    placeholder="Contoh: Pengeluaran Kos, Toko Kelontong"
                    maxLength={32}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Warna Tema Buku</Label>
                  <div className="flex gap-3 pt-1">
                    {colorPalette.map((color) => {
                      const isSelected = selectedColor === color.value
                      return (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setSelectedColor(color.value)}
                          className="size-7 rounded-full transition-all border border-black/10 dark:border-white/10 hover:scale-110 flex items-center justify-center relative cursor-pointer"
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        >
                          {isSelected && (
                            <IconCheck className="size-4 text-white drop-shadow-sm font-bold" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit">Simpan Buku</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
