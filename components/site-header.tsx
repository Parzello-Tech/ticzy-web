"use client"

import * as React from "react"
import { toast } from "sonner"
import { useActiveBook } from "@/hooks/use-active-book"
import { supabase } from "@/lib/supabase"
import { syncAll, checkConnectivity } from "@/lib/sync"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useTheme } from "next-themes"
import { IconRefresh, IconCloud, IconCloudOff, IconSun, IconMoon } from "@tabler/icons-react"

export function SiteHeader() {
  const { activeBook } = useActiveBook()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [isSyncing, setIsSyncing] = React.useState(false)
  const [isOnline, setIsOnline] = React.useState(true)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Periodically check connectivity
  React.useEffect(() => {
    const checkConn = async () => {
      const conn = await checkConnectivity()
      setIsOnline(conn)
    }

    checkConn() // Check initially

    // Set interval to check every 15 seconds
    const interval = setInterval(checkConn, 15000)

    // Also bind standard window events
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      clearInterval(interval)
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id || null

      if (!userId) {
        toast.error("Masuk akun terlebih dahulu untuk mensinkronkan data dengan Cloud!")
        setIsSyncing(false)
        return
      }

      toast.promise(syncAll(userId), {
        loading: "Sedang mensinkronisasikan kas luring ke Cloud...",
        success: () => {
          return "Sinkronisasi awan berhasil!"
        },
        error: "Gagal mensinkronkan kas: Koneksi offline atau server bermasalah.",
      })
    } catch (err: any) {
      toast.error("Error sinkronisasi: " + err.message)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-1 lg:gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <h1 className="text-base font-semibold truncate max-w-40 sm:max-w-64 md:max-w-xs transition-all">
            {activeBook?.name || "Buku Keuangan"}
          </h1>
        </div>

        {/* Sync Controls and Connection Indicators */}
        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/40 border dark:bg-secondary/10 px-2 py-1 rounded-full font-medium">
            {isOnline ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <IconCloud className="size-3.5 text-emerald-500" />
                <span>Cloud Connected</span>
              </>
            ) : (
              <>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                <IconCloudOff className="size-3.5 text-amber-500" />
                <span>Offline / Lokal</span>
              </>
            )}
          </div>

          {/* Theme Toggle Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="h-8 w-8 hover:bg-accent cursor-pointer shrink-0 rounded-lg"
            title="Toggle theme"
          >
            {mounted && resolvedTheme === "dark" ? (
              <IconSun className="size-4 text-amber-500" />
            ) : (
              <IconMoon className="size-4 text-indigo-500" />
            )}
          </Button>

          {/* Sync Trigger Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
            className="h-8 gap-1.5 px-3 hover:bg-accent text-xs font-semibold cursor-pointer shrink-0"
          >
            <IconRefresh className={`size-3.5 text-muted-foreground ${isSyncing ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
