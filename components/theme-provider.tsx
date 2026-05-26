"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"

export const colorPresets = {
  sky: {
    primary: "oklch(0.511 0.096 186.391)",
    primaryDark: "oklch(0.437 0.078 188.216)"
  },
  emerald: {
    primary: "oklch(0.627 0.194 149.214)",
    primaryDark: "oklch(0.527 0.174 149.214)"
  },
  purple: {
    primary: "oklch(0.51 0.18 290)",
    primaryDark: "oklch(0.45 0.16 290)"
  },
  rose: {
    primary: "oklch(0.55 0.22 15)",
    primaryDark: "oklch(0.50 0.20 15)"
  },
  amber: {
    primary: "oklch(0.68 0.18 75)",
    primaryDark: "oklch(0.60 0.16 75)"
  }
}

function AccentColorEffect() {
  const { resolvedTheme } = useTheme()

  React.useEffect(() => {
    const savedColor = localStorage.getItem("ticzy-accent-color") || "sky"
    const colors = colorPresets[savedColor as keyof typeof colorPresets] || colorPresets.sky
    const primaryValue = resolvedTheme === "dark" ? colors.primaryDark : colors.primary
    document.documentElement.style.setProperty("--primary", primaryValue)
    
    // Inject a listener event for accent color changes in settings
    const handleAccentChange = () => {
      const activeColor = localStorage.getItem("ticzy-accent-color") || "sky"
      const activeColors = colorPresets[activeColor as keyof typeof colorPresets] || colorPresets.sky
      const activePrimary = resolvedTheme === "dark" ? activeColors.primaryDark : activeColors.primary
      document.documentElement.style.setProperty("--primary", activePrimary)
    }

    window.addEventListener("ticzy-accent-change", handleAccentChange)
    return () => {
      window.removeEventListener("ticzy-accent-change", handleAccentChange)
    }
  }, [resolvedTheme])

  return null
}

function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      <ThemeHotkey />
      <AccentColorEffect />
      {children}
    </NextThemesProvider>
  )
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

function ThemeHotkey() {
  const { resolvedTheme, setTheme } = useTheme()

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (event.key.toLowerCase() !== "d") {
        return
      }

      if (isTypingTarget(event.target)) {
        return
      }

      setTheme(resolvedTheme === "dark" ? "light" : "dark")
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [resolvedTheme, setTheme])

  return null
}

export { ThemeProvider }
