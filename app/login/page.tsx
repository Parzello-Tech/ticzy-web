"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IconBrandGoogle, IconInnerShadowTop, IconUserCheck, IconLoader } from "@tabler/icons-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  // Check auth session on load
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
        console.error("Session check failed:", err);
        setLoading(false);
      }
    };
    checkUser();
  }, [router]);

  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) {
        toast.error("Gagal login dengan Google: " + error.message);
        setAuthLoading(false);
      }
    } catch (err: any) {
      toast.error("Gagal login: " + err.message);
      setAuthLoading(false);
    }
  };

  const handleGuestMode = () => {
    toast.success("Masuk dalam Mode Guest. Data disimpan secara offline!");
    router.push("/dashboard");
  };

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-radial from-background to-muted/30">
        <IconLoader className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center p-6 bg-linear-to-br from-background via-muted/10 to-primary/5">
      {/* Decorative blurred background circles for modern aesthetics */}
      <div className="absolute top-1/4 left-1/4 -z-10 size-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 -z-10 size-72 rounded-full bg-chart-1/10 blur-3xl" />

      <Card className="w-full max-w-md border border-border/40 bg-card/60 backdrop-blur-md shadow-xl transition-all hover:border-border/60">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <IconInnerShadowTop className="size-7" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-foreground">
            Ticzy Finance
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Aplikasi Catat Keuangan Pintar - Offline-First & Cloud Sync
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          <Button
            onClick={handleGoogleLogin}
            disabled={authLoading}
            variant="outline"
            className="w-full h-11 flex items-center justify-center gap-3 border-border bg-background hover:bg-muted/40 transition-colors"
          >
            {authLoading ? (
              <IconLoader className="size-5 animate-spin" />
            ) : (
              <IconBrandGoogle className="size-5 text-destructive" />
            )}
            <span>Masuk dengan Google</span>
          </Button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-border/60"></div>
            <span className="flex-shrink mx-4 text-xs text-muted-foreground uppercase font-medium select-none">
              Atau
            </span>
            <div className="flex-grow border-t border-border/60"></div>
          </div>

          <Button
            onClick={handleGuestMode}
            disabled={authLoading}
            variant="ghost"
            className="w-full h-11 flex items-center justify-center gap-3 hover:bg-primary/5 hover:text-primary transition-colors"
          >
            <IconUserCheck className="size-5 text-primary" />
            <span>Masuk sebagai Guest (Lokal)</span>
          </Button>
        </CardContent>

        <CardFooter className="flex flex-col text-center pt-2 pb-6 text-xs text-muted-foreground/80 space-y-1">
          <p>Semua data disimpan secara instan di browser Anda.</p>
          <p>
            Anda dapat memindahkan data Guest ke cloud kapan saja setelah masuk.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
