import { useState, useEffect } from "react"

const dictionary = {
  id: {
    settingsTitle: "Pengaturan & Preferensi",
    settingsDesc: "Sesuaikan tema, warna aksen, dan bahasa aplikasi sesuai kenyamanan Anda.",
    themeLabel: "Pilih Tema Tampilan",
    themeDesc: "Ubah visual antara mode gelap yang nyaman atau mode terang standar.",
    themeDark: "Mode Gelap",
    themeLight: "Mode Terang",
    themeSystem: "Sistem",
    accentLabel: "Warna Aksen Dasar",
    accentDesc: "Pilih warna aksen visual untuk tombol, lencana, dan sorotan antarmuka.",
    langLabel: "Bahasa Aplikasi",
    langDesc: "Ubah teks antarmuka menjadi Bahasa Indonesia atau English.",
    langId: "Bahasa Indonesia",
    langEn: "English",
    saveSuccess: "Pengaturan berhasil diperbarui!",
    syncButton: "Sinkronisasi",
    backupTitle: "Ekspor & Impor",
    trashTitle: "Keranjang Sampah",
    dashboardTitle: "Dasbor Keuangan",
    duplicateTitle: "Pembersih Duplikat",
    helpTitle: "Bantuan",
    activeBookLabel: "Buku Aktif",
    quickStats: "Ringkasan Cepat",
    emptyTrashBtn: "Kosongkan Tempat Sampah",
  },
  en: {
    settingsTitle: "Settings & Preferences",
    settingsDesc: "Customize theme, accent color, and application language to your comfort.",
    themeLabel: "Choose Theme Style",
    themeDesc: "Switch between comfortable dark mode or standard light mode.",
    themeDark: "Dark Mode",
    themeLight: "Light Mode",
    themeSystem: "System",
    accentLabel: "Accent Theme Color",
    accentDesc: "Choose the visual accent color for buttons, badges, and interface highlights.",
    langLabel: "Application Language",
    langDesc: "Switch translation context between Indonesian and English.",
    langId: "Indonesian",
    langEn: "English",
    saveSuccess: "Settings successfully updated!",
    syncButton: "Sync Now",
    backupTitle: "Export & Import",
    trashTitle: "Trash Center",
    dashboardTitle: "Financial Dashboard",
    duplicateTitle: "Duplicate Cleaner",
    helpTitle: "Help Support",
    activeBookLabel: "Active Book",
    quickStats: "Quick Summary",
    emptyTrashBtn: "Empty Trash Basket",
  }
}

export function useLang() {
  const [lang, setLang] = useState<"id" | "en">("id")

  useEffect(() => {
    // Initial load check
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ticzy-lang") as "id" | "en"
      if (saved === "id" || saved === "en") {
        setLang(saved)
      }
    }

    const handleLangChange = () => {
      const active = localStorage.getItem("ticzy-lang") as "id" | "en"
      if (active === "id" || active === "en") {
        setLang(active)
      }
    }

    window.addEventListener("ticzy-lang-change", handleLangChange)
    return () => {
      window.removeEventListener("ticzy-lang-change", handleLangChange)
    }
  }, [])

  const setLanguage = (newLang: "id" | "en") => {
    localStorage.setItem("ticzy-lang", newLang)
    setLang(newLang)
    window.dispatchEvent(new Event("ticzy-lang-change"))
  }

  const t = dictionary[lang]

  return { lang, setLanguage, t }
}
