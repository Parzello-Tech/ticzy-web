"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  IconInnerShadowTop, 
  IconArrowRight, 
  IconCloudUpload, 
  IconDatabase, 
  IconFolder, 
  IconSearch,
  IconLoader 
} from "@tabler/icons-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.push("/dashboard");
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        setLoading(false);
      }
    };
    checkUser();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-radial from-background to-muted/30">
        <IconLoader className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative min-h-svh bg-linear-to-b from-background via-muted/5 to-primary/5 text-foreground overflow-hidden">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-0 right-1/4 -z-10 size-[500px] rounded-full bg-primary/5 blur-[120px]" />
      <div className="absolute bottom-10 left-1/4 -z-10 size-[500px] rounded-full bg-chart-1/5 blur-[120px]" />

      {/* Navigation Header */}
      <header className="mx-auto max-w-7xl px-6 py-6 flex items-center justify-between border-b border-border/20">
        <div className="flex items-center gap-2.5 font-bold text-xl tracking-tight text-foreground select-none">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <IconInnerShadowTop className="size-5" />
          </div>
          <span>Ticzy Finance</span>
        </div>
        <Button onClick={() => router.push("/login")} size="sm" className="shadow-xs font-medium">
          Mulai Sekarang
        </Button>
      </header>

      {/* Hero Section */}
      <main className="mx-auto max-w-7xl px-6 pt-20 pb-24 text-center space-y-12">
        <div className="space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold select-none animate-pulse">
            ✨ Kini Hadir dalam Versi Web MVP
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight bg-linear-to-r from-foreground via-foreground/90 to-primary bg-clip-text text-transparent leading-tight md:leading-none">
            Kelola Keuangan Tanpa Batas Offline & Online
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
            Aplikasi pengelola anggaran offline-first. Catat instan di browser tanpa internet, dan sinkronkan otomatis ke cloud saat Anda terhubung kembali.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button 
            onClick={() => router.push("/login")} 
            size="lg" 
            className="w-full sm:w-auto h-12 px-8 flex items-center gap-2 group text-base font-semibold shadow-md shadow-primary/20"
          >
            <span>Daftar / Masuk Akun</span>
            <IconArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button 
            onClick={() => router.push("/dashboard")} 
            size="lg" 
            variant="outline" 
            className="w-full sm:w-auto h-12 px-8 text-base font-medium border-border hover:bg-muted/30 transition-colors"
          >
            Mencoba Mode Guest
          </Button>
        </div>

        {/* Feature Cards Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-16 max-w-6xl mx-auto">
          <Card className="border border-border/30 bg-card/40 backdrop-blur-xs hover:border-border/60 transition-all">
            <CardHeader className="text-left space-y-3 pb-3">
              <div className="size-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary">
                <IconDatabase className="size-5" />
              </div>
              <CardTitle className="text-lg font-bold">Offline-First</CardTitle>
            </CardHeader>
            <CardContent className="text-left text-sm text-muted-foreground leading-relaxed">
              Catatan Anda tersimpan langsung di database IndexedDB browser secara instan, aman, dan persisten.
            </CardContent>
          </Card>

          <Card className="border border-border/30 bg-card/40 backdrop-blur-xs hover:border-border/60 transition-all">
            <CardHeader className="text-left space-y-3 pb-3">
              <div className="size-10 flex items-center justify-center rounded-xl bg-chart-1/10 text-chart-1">
                <IconCloudUpload className="size-5" />
              </div>
              <CardTitle className="text-lg font-bold">Sinkronisasi Awan</CardTitle>
            </CardHeader>
            <CardContent className="text-left text-sm text-muted-foreground leading-relaxed">
              Koneksi terputus? Jangan khawatir. Data disinkronkan dua arah ke Supabase secara otomatis saat internet aktif.
            </CardContent>
          </Card>

          <Card className="border border-border/30 bg-card/40 backdrop-blur-xs hover:border-border/60 transition-all">
            <CardHeader className="text-left space-y-3 pb-3">
              <div className="size-10 flex items-center justify-center rounded-xl bg-chart-2/10 text-chart-2">
                <IconFolder className="size-5" />
              </div>
              <CardTitle className="text-lg font-bold">Multi-Book</CardTitle>
            </CardHeader>
            <CardContent className="text-left text-sm text-muted-foreground leading-relaxed">
              Kelola anggaran harian, kerjaan, atau liburan dalam buku-buku terpisah dengan konfigurasi warna dan ikon premium.
            </CardContent>
          </Card>

          <Card className="border border-border/30 bg-card/40 backdrop-blur-xs hover:border-border/60 transition-all">
            <CardHeader className="text-left space-y-3 pb-3">
              <div className="size-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary">
                <IconSearch className="size-5" />
              </div>
              <CardTitle className="text-lg font-bold">Pencarian Cerdas</CardTitle>
            </CardHeader>
            <CardContent className="text-left text-sm text-muted-foreground leading-relaxed">
              Deteksi pengeluaran kembar atau berulang secara otomatis berdasarkan deskripsi transaksi secara cerdas.
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/20 py-8 text-center text-xs text-muted-foreground/80">
        <p>&copy; {new Date().getFullYear()} Ticzy Finance. All rights reserved.</p>
      </footer>
    </div>
  );
}
