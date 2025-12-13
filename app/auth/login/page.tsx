"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Zap } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error

      // Ensure Server Components see the updated auth cookies.
      router.refresh()

      // Pre-cache routes right after login so offline works without manual visiting.
      // Includes all task/hackathon detail routes for the teams the user belongs to.
      ;(async () => {
        try {
          if (!("serviceWorker" in navigator)) return
          const reg = await navigator.serviceWorker.ready
          const post = (urls: string[]) =>
            reg.active?.postMessage({
              type: "PRECACHE_URLS",
              urls,
            })

          // Always precache core routes.
          const core = ["/", "/dashboard", "/tasks", "/hackathons", "/calendar", "/team", "/settings"]
          post(core)

          // Get user + teams
          const {
            data: { session },
          } = await supabase.auth.getSession()
          const user = session?.user
          if (!user) return

          const { data: teamMembers } = await supabase.from("team_members").select("team_id").eq("user_id", user.id)
          const teamIds = teamMembers?.map((tm: any) => tm.team_id) || []
          if (teamIds.length === 0) return

          const PAGE_SIZE = 500

          async function fetchAllIds(table: "tasks" | "hackathons") {
            const ids: string[] = []
            let from = 0
            while (true) {
              const to = from + PAGE_SIZE - 1
              const { data, error } = await supabase
                .from(table)
                .select("id")
                .in("team_id", teamIds)
                .range(from, to)

              if (error) break
              const batch = (data || []).map((r: any) => r.id).filter(Boolean)
              ids.push(...batch)
              if (batch.length < PAGE_SIZE) break
              from += PAGE_SIZE
            }
            return ids
          }

          const [taskIds, hackathonIds] = await Promise.all([fetchAllIds("tasks"), fetchAllIds("hackathons")])

          // Send in chunks to avoid large messages.
          const urls: string[] = []
          for (const id of taskIds) urls.push(`/tasks/${id}`)
          for (const id of hackathonIds) urls.push(`/hackathons/${id}`)

          const CHUNK = 150
          for (let i = 0; i < urls.length; i += CHUNK) {
            post(urls.slice(i, i + CHUNK))
          }
        } catch {
          // ignore
        }
      })()

      router.push("/dashboard")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 md:p-10 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-bold text-2xl text-foreground">HackNotify</span>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Welcome back</CardTitle>
              <CardDescription>Enter your credentials to access your dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin}>
                <div className="flex flex-col gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign in"}
                  </Button>
                </div>
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/auth/sign-up"
                    className="text-primary underline underline-offset-4 hover:text-primary/80"
                  >
                    Sign up
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
