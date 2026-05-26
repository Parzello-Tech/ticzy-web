"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useLang } from "@/hooks/use-lang"
import { 
  IconDashboard, 
  IconListDetails, 
  IconChartBar, 
  IconSettings 
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"

export function MobileBottomNav() {
  const pathname = usePathname()
  const { lang } = useLang()

  const navItems = React.useMemo(() => [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <IconDashboard className="size-5 transition-transform group-active:scale-90" />,
    },
    {
      title: lang === "id" ? "Rekap" : "Recap",
      url: "/dashboard/rekap",
      icon: <IconChartBar className="size-5 transition-transform group-active:scale-90" />,
    },
    {
      title: lang === "id" ? "Duplikat" : "Duplicates",
      url: "/dashboard/similar",
      icon: <IconListDetails className="size-5 transition-transform group-active:scale-90" />,
    },
    {
      title: lang === "id" ? "Pengaturan" : "Settings",
      url: "/dashboard/settings",
      icon: <IconSettings className="size-5 transition-transform group-active:scale-90" />,
    },
  ], [lang])

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-[360px] md:hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
      <nav className="flex items-center justify-around bg-background/80 dark:bg-card/85 backdrop-blur-xl border border-border/40 dark:border-white/5 shadow-2xl rounded-2xl p-2.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all">
        {navItems.map((item) => {
          const isActive = pathname === item.url
          return (
            <Link
              key={item.url}
              href={item.url}
              className="group flex flex-col items-center justify-center relative py-1 px-3.5"
            >
              <div
                className={cn(
                  "flex items-center justify-center p-2 rounded-xl transition-all duration-300",
                  isActive 
                    ? "bg-primary/10 text-primary scale-110 shadow-xs" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
              >
                {item.icon}
              </div>
              <span 
                className={cn(
                  "text-[10px] font-semibold tracking-wide transition-all mt-1",
                  isActive ? "text-primary scale-105" : "text-muted-foreground/80"
                )}
              >
                {item.title}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
