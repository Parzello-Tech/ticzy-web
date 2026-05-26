"use client"

import * as React from "react"
import { IconPlus } from "@tabler/icons-react"
import { usePathname } from "next/navigation"

export function FloatingAddBtn() {
  const pathname = usePathname()

  // Only show the FAB on the main dashboard home page or rekap page where transactions are relevant
  const shouldShow = pathname === "/dashboard" || pathname === "/dashboard/rekap"

  if (!shouldShow) return null

  const handleOpenForm = () => {
    window.dispatchEvent(new Event("ticzy-open-create-transaction"))
  }

  return (
    <button
      onClick={handleOpenForm}
      className="fixed bottom-32 right-5 md:bottom-8 md:right-8 z-40 size-14 rounded-full bg-gradient-to-tr from-primary to-emerald-400 text-primary-foreground shadow-2xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 hover:rotate-90 active:scale-95 group focus:outline-hidden focus:ring-2 focus:ring-primary/50"
      aria-label="Tambah Transaksi"
      title="Tambah Transaksi Baru"
    >
      <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-75 group-hover:hidden duration-1000" />
      <IconPlus className="size-6 text-white transition-transform" />
    </button>
  )
}
