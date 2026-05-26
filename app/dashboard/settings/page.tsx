"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { useLang } from "@/hooks/use-lang"
import { colorPresets } from "@/components/theme-provider"
import { db } from "@/lib/db"
import { toast } from "sonner"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  IconSettings,
  IconSun,
  IconMoon,
  IconLanguage,
  IconPalette,
  IconTrash,
  IconDeviceLaptop,
  IconCheck,
} from "@tabler/icons-react"

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { lang, setLanguage, t } = useLang()

  // Track currently active accent color from localStorage
  const [activeAccent, setActiveAccent] = React.useState("sky")

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ticzy-accent-color") || "sky"
      setActiveAccent(saved)
    }
  }, [])

  const handleAccentChange = (presetName: string) => {
    localStorage.setItem("ticzy-accent-color", presetName)
    setActiveAccent(presetName)
    window.dispatchEvent(new Event("ticzy-accent-change"))
    toast.success(lang === "id" ? "Warna aksen berhasil diperbarui!" : "Accent color successfully updated!")
  }

  const handleResetCache = async () => {
    const confirmationText = lang === "id"
      ? "Apakah Anda yakin ingin menyetel ulang penyimpanan lokal? Semua transaksi lokal yang belum disinkronkan ke Supabase akan terhapus secara permanen!"
      : "Are you sure you want to reset the local storage? All local entries that have not been synced with Supabase will be permanently lost!"

    if (confirm(confirmationText)) {
      try {
        await db.books.clear()
        await db.transactions.clear()
        toast.success(
          lang === "id" 
            ? "Penyimpanan lokal dibersihkan! Hubungkan internet untuk sinkronisasi ulang." 
            : "Local database cleared! Connect to the internet to sync again."
        )
      } catch (err: any) {
        toast.error("Error: " + err.message)
      }
    }
  }

  // Visual presets definitions for settings circles
  const accentPresets = [
    { key: "sky", hex: "#0ea5e9", label: "Sky Blue" },
    { key: "emerald", hex: "#10b981", label: "Emerald" },
    { key: "purple", hex: "#8b5cf6", label: "Purple" },
    { key: "rose", hex: "#f43f5e", label: "Rose" },
    { key: "amber", hex: "#f59e0b", label: "Amber" },
  ]

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
        
        <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 max-w-4xl mx-auto w-full">
          {/* Header */}
          <div className="pb-2 border-b">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-1.5">
              <IconSettings className="size-5 text-primary animate-spin-slow" />
              {t.settingsTitle}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t.settingsDesc}
            </p>
          </div>

          <div className="space-y-6">
            {/* 1. APPEARANCE / THEME */}
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <IconSun className="size-4 text-amber-500" />
                  {t.themeLabel}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t.themeDesc}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-5 border-t">
                <div className="grid grid-cols-3 gap-3 max-w-md pt-4">
                  {/* Theme Light */}
                  <button
                    onClick={() => setTheme("light")}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                      theme === "light"
                        ? "border-primary bg-primary/5 text-primary"
                        : "bg-muted/10 hover:bg-muted/30"
                    }`}
                  >
                    <IconSun className="size-5 text-amber-500" />
                    <span>{t.themeLight}</span>
                  </button>

                  {/* Theme Dark */}
                  <button
                    onClick={() => setTheme("dark")}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                      theme === "dark"
                        ? "border-primary bg-primary/5 text-primary"
                        : "bg-muted/10 hover:bg-muted/30"
                    }`}
                  >
                    <IconMoon className="size-5 text-indigo-500" />
                    <span>{t.themeDark}</span>
                  </button>

                  {/* Theme System */}
                  <button
                    onClick={() => setTheme("system")}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                      theme === "system"
                        ? "border-primary bg-primary/5 text-primary"
                        : "bg-muted/10 hover:bg-muted/30"
                    }`}
                  >
                    <IconDeviceLaptop className="size-5 text-muted-foreground" />
                    <span>{t.themeSystem}</span>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* 2. ACCENT COLOR PICKER */}
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <IconPalette className="size-4 text-violet-500" />
                  {t.accentLabel}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t.accentDesc}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-5 border-t">
                <div className="flex flex-wrap gap-4 pt-4">
                  {accentPresets.map((preset) => {
                    const isActive = activeAccent === preset.key
                    return (
                      <button
                        key={preset.key}
                        onClick={() => handleAccentChange(preset.key)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          isActive 
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20 scale-102"
                            : "hover:bg-muted/20"
                        }`}
                      >
                        <div
                          className="size-4 rounded-full border border-black/10 flex items-center justify-center"
                          style={{ backgroundColor: preset.hex }}
                        >
                          {isActive && <IconCheck className="size-2.5 text-white" />}
                        </div>
                        <span>{preset.label}</span>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 3. APPLICATION LANGUAGE */}
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <IconLanguage className="size-4 text-emerald-500" />
                  {t.langLabel}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t.langDesc}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-5 border-t">
                <div className="max-w-md pt-4">
                  <RadioGroup
                    value={lang}
                    onValueChange={(val: "id" | "en") => setLanguage(val)}
                    className="grid grid-cols-2 gap-3"
                  >
                    {/* ID */}
                    <div className="flex items-center gap-2.5 rounded-xl border p-3 bg-card hover:bg-muted/10 cursor-pointer">
                      <RadioGroupItem value="id" id="lang-id" />
                      <Label htmlFor="lang-id" className="text-xs font-bold cursor-pointer">
                        🇮🇩 {t.langId}
                      </Label>
                    </div>

                    {/* EN */}
                    <div className="flex items-center gap-2.5 rounded-xl border p-3 bg-card hover:bg-muted/10 cursor-pointer">
                      <RadioGroupItem value="en" id="lang-en" />
                      <Label htmlFor="lang-en" className="text-xs font-bold cursor-pointer">
                        🇺🇸 {t.langEn}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            {/* 4. TROUBLESHOOTING & RESET */}
            <Card className="border-rose-500/10 bg-rose-500/[0.01]">
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                  <IconTrash className="size-4" />
                  {lang === "id" ? "Pembersihan Data & Pemecahan Masalah" : "Data Purge & Troubleshooting"}
                </CardTitle>
                <CardDescription className="text-xs text-rose-500/80">
                  {lang === "id"
                    ? "Tindakan sensitif untuk mereset cache lokal. Gunakan hanya jika sinkronisasi data mengalami konflik parah."
                    : "Sensitive action to clear local caches. Only use if synchronization experiences heavy local conflicts."}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-5 border-t border-rose-500/10">
                <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold">
                      {lang === "id" ? "Setel Ulang Penyimpanan Lokal" : "Reset Local Storage"}
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-normal max-w-md">
                      {lang === "id"
                        ? "Menghapus total semua data IndexedDB dari browser ini secara luring. Data yang belum tersinkronisasi awan akan hilang!"
                        : "Deletes all local IndexedDB data from this browser offline. Any unsynced data will be permanently wiped!"}
                    </p>
                  </div>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleResetCache}
                    className="font-bold text-xs cursor-pointer gap-1"
                  >
                    <IconTrash className="size-3.5" />
                    {lang === "id" ? "Kosongkan Cache Lokal" : "Wipe Local Cache"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
