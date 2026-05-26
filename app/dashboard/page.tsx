"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { IconSearch, IconX } from "@tabler/icons-react"
import { Input } from "@/components/ui/input"
import { useLang } from "@/hooks/use-lang"

export default function Page() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const { lang } = useLang()

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
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              
              {/* 🔍 MOBILE SEARCH FIELD: Placed above cards, styled exactly like mockup */}
              <div className="px-4 md:hidden">
                <div className="relative w-full">
                  <IconSearch className="absolute left-3.5 top-3 size-4 text-muted-foreground" />
                  <Input
                    placeholder={lang === "id" ? "Cari transaksi..." : "Search transactions..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9.5 pr-8 h-10 w-full rounded-2xl bg-card border-border/40 focus:ring-primary focus-visible:ring-primary text-sm shadow-xs"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-hidden"
                      title="Clear search"
                    >
                      <IconX className="size-4" />
                    </button>
                  )}
                </div>
              </div>

              <SectionCards />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive />
              </div>
              <DataTable searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
