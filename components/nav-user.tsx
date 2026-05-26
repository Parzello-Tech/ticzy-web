"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { IconDotsVertical, IconUserCircle, IconCloudUpload, IconLogout, IconLogin } from "@tabler/icons-react"

export function NavUser({
  user: _ignoredUser,
}: {
  user?: {
    name: string
    email: string
    avatar: string
  }
}) {
  const { isMobile } = useSidebar()
  const router = useRouter()
  
  const [sessionUser, setSessionUser] = React.useState<{
    name: string
    email: string
    avatar: string
  } | null>(null)

  React.useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSessionUser({
          name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User Keuangan",
          email: session.user.email || "",
          avatar: session.user.user_metadata?.avatar_url || "",
        })
      } else {
        setSessionUser(null)
      }
    })

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setSessionUser({
          name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User Keuangan",
          email: session.user.email || "",
          avatar: session.user.user_metadata?.avatar_url || "",
        })
      } else {
        setSessionUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      toast.success("Berhasil keluar dari sesi cloud!")
      router.push("/login")
    } catch (error: any) {
      toast.error("Gagal keluar: " + error.message)
    }
  }

  // Display fields depending on status
  const name = sessionUser?.name || "Guest User"
  const email = sessionUser?.email || "Mode Offline / Lokal"
  const avatar = sessionUser?.avatar || ""
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                {avatar ? (
                  <AvatarImage src={avatar} alt={name} />
                ) : null}
                <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {email}
                </span>
              </div>
              <IconDotsVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  {avatar ? (
                    <AvatarImage src={avatar} alt={name} />
                  ) : null}
                  <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <IconUserCircle className="size-4" />
                <span>Akun Saya</span>
              </DropdownMenuItem>
              {sessionUser ? (
                <DropdownMenuItem className="text-emerald-500 focus:text-emerald-500">
                  <IconCloudUpload className="size-4 text-emerald-500" />
                  <span>Cloud Synced</span>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem 
                  onClick={() => router.push("/login")}
                  className="text-amber-500 focus:text-amber-500 font-medium cursor-pointer"
                >
                  <IconCloudUpload className="size-4 text-amber-500" />
                  <span>Hubungkan Cloud</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            
            <DropdownMenuSeparator />
            {sessionUser ? (
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                <IconLogout className="size-4" />
                <span>Keluar Akun</span>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => router.push("/login")} className="cursor-pointer font-semibold text-primary focus:text-primary">
                <IconLogin className="size-4" />
                <span>Masuk Akun</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
