"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Sidebar } from "@/components/dashboard/sidebar"
import { MobileNav } from "@/components/dashboard/mobile-nav"
import { Header } from "@/components/dashboard/header"

type UserHeader = { email?: string; name?: string }

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)
  const [user, setUser] = useState<UserHeader | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // IMPORTANT: use getSession() so it works offline (it reads persisted session locally).
    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user
      if (!sessionUser) {
        router.replace("/auth/login")
        return
      }
      setUser({
        email: sessionUser.email ?? undefined,
        name: typeof (sessionUser.user_metadata as any)?.name === "string" ? (sessionUser.user_metadata as any).name : undefined,
      })
      setIsReady(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user
      if (!sessionUser) {
        setUser(null)
        router.replace("/auth/login")
        return
      }
      setUser({
        email: sessionUser.email ?? undefined,
        name: typeof (sessionUser.user_metadata as any)?.name === "string" ? (sessionUser.user_metadata as any).name : undefined,
      })
      setIsReady(true)
    })

    return () => subscription.unsubscribe()
  }, [router])

  const headerUser = useMemo(() => {
    if (!user) return { email: undefined, name: undefined }
    return user
  }, [user])

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col lg:ml-0">
        <Header user={headerUser} />
        <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6">{children}</main>
        <MobileNav />
      </div>
    </div>
  )
}
