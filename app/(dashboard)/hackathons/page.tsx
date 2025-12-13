"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getOfflineCache, setOfflineCache } from "@/lib/offline/cache"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Trophy, Calendar, ExternalLink, Bell, BellOff, MoreVertical } from "lucide-react"
import Link from "next/link"
import { format, isPast, isFuture, formatDistanceToNow, isValid } from "date-fns"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { Hackathon } from "@/lib/types"
import { useOnlineStatus } from "@/lib/offline/online"

export default function HackathonsPage() {
  const router = useRouter()
  const [hackathonList, setHackathonList] = useState<Hackathon[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [offlineInfo, setOfflineInfo] = useState<string | null>(null)
  const { isOnline } = useOnlineStatus()

  const fetchHackathons = useCallback(async () => {
    const supabase = createClient()

    // Use local session so this still works offline (if a previous session exists).
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const user = session?.user
    if (!user) {
      router.replace("/auth/login")
      return
    }

    try {
      const { data: teamMembers } = await supabase.from("team_members").select("team_id").eq("user_id", user.id)
      const teamIds = teamMembers?.map((tm) => tm.team_id) || []

      if (teamIds.length === 0) {
        setHackathonList([])
        setIsLoading(false)
        return
      }

      const { data: hackathons, error } = await supabase
        .from("hackathons")
        .select("*")
        .in("team_id", teamIds)
        .order("submission_deadline", { ascending: true })

      if (error) throw error

      const list = (hackathons || []) as Hackathon[]
      setHackathonList(list)
      setOfflineCache(user.id, "hackathons", list)
      setOfflineInfo(null)
    } catch {
      // Offline or network error: show cached data if present.
      const cached = getOfflineCache<Hackathon[]>(user.id, "hackathons")
      if (cached) {
        setHackathonList(cached.value)
        setOfflineInfo(`Offline • showing cached data from ${cached.savedAt}`)
      } else {
        setHackathonList([])
        setOfflineInfo("Offline • no cached hackathons yet")
      }
    } finally {
      setIsLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchHackathons()
  }, [fetchHackathons])

  const now = useMemo(() => new Date(), [])

  const upcoming = useMemo(() => {
    return hackathonList.filter((h) => {
      const subDeadline = h.submission_deadline ? new Date(h.submission_deadline) : null
      return subDeadline && isFuture(subDeadline)
    })
  }, [hackathonList])

  const past = useMemo(() => {
    return hackathonList.filter((h) => {
      const subDeadline = h.submission_deadline ? new Date(h.submission_deadline) : null
      return subDeadline && isPast(subDeadline)
    })
  }, [hackathonList])

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">Loading hackathons...</CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Hackathons</h1>
          <p className="text-muted-foreground">Track all your hackathon deadlines</p>
          {offlineInfo && <p className="text-xs text-muted-foreground mt-1">{offlineInfo}</p>}
        </div>
        <Link href="/hackathons/new" aria-disabled={!isOnline} tabIndex={!isOnline ? -1 : undefined}>
          <Button className="gap-2" disabled={!isOnline}>
            <Plus className="w-4 h-4" />
            Add Hackathon
          </Button>
        </Link>
      </div>

      {hackathonList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Trophy className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg text-foreground mb-2">No hackathons yet</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-sm">
              Start tracking hackathons to receive automatic deadline reminders
            </p>
            <Link href="/hackathons/new">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Your First Hackathon
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Upcoming Hackathons */}
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-4">Upcoming ({upcoming.length})</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((hackathon) => (
                  <HackathonItem key={hackathon.id} hackathon={hackathon} />
                ))}
              </div>
            </section>
          )}

          {/* Past Hackathons */}
          {past.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-muted-foreground mb-4">Past ({past.length})</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {past.map((hackathon) => (
                  <HackathonItem key={hackathon.id} hackathon={hackathon} isPast />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function HackathonItem({ hackathon, isPast = false }: { hackathon: Hackathon; isPast?: boolean }) {
  const { isOnline } = useOnlineStatus()
  const now = new Date()
  const regDeadline = hackathon.reg_deadline ? new Date(hackathon.reg_deadline) : null
  const subDeadline = hackathon.submission_deadline ? new Date(hackathon.submission_deadline) : null

  const getDeadlineStatus = (deadline: Date | null) => {
    if (!deadline) return null
    if (isPast) return "past"
    const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (daysUntil <= 0) return "overdue"
    if (daysUntil <= 1) return "urgent"
    if (daysUntil <= 3) return "soon"
    if (daysUntil <= 7) return "upcoming"
    return "normal"
  }

  const subStatus = getDeadlineStatus(subDeadline)

  return (
    <Card className={isPast ? "opacity-60" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Link href={`/hackathons/${hackathon.id}`} className="hover:underline">
              <CardTitle className="text-base truncate">{hackathon.title}</CardTitle>
            </Link>
            {hackathon.organizer && <CardDescription className="truncate">{hackathon.organizer}</CardDescription>}
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/hackathons/${hackathon.id}`}>
              <Button size="sm" variant="secondary" className="h-8">
                Open
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/hackathons/${hackathon.id}`}>Open Command Center</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/hackathons/${hackathon.id}/edit`} aria-disabled={!isOnline} tabIndex={!isOnline ? -1 : undefined}>
                    <span className={!isOnline ? "pointer-events-none opacity-50" : ""}>Edit Details</span>
                  </Link>
                </DropdownMenuItem>
                {hackathon.link && (
                  <DropdownMenuItem asChild>
                    <Link href={hackathon.link} target="_blank">
                      Visit Website
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Dates */}
        {hackathon.start_date && hackathon.end_date && (() => {
          const start = new Date(hackathon.start_date)
          const end = new Date(hackathon.end_date)
          if (!isValid(start) || !isValid(end)) return null
          return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                {format(start, "MMM d")} - {format(end, "MMM d, yyyy")}
              </span>
            </div>
          )
        })()}

        {/* Deadlines */}
        <div className="space-y-2">
          {regDeadline && (
            <DeadlineRow label="Registration" date={regDeadline} status={getDeadlineStatus(regDeadline)} />
          )}
          {subDeadline && <DeadlineRow label="Submission" date={subDeadline} status={subStatus} />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            {hackathon.notifications_enabled ? (
              <>
                <Bell className="w-4 h-4" />
                <span>Reminders on</span>
              </>
            ) : (
              <>
                <BellOff className="w-4 h-4" />
                <span>Reminders off</span>
              </>
            )}
          </div>
          {hackathon.link && (
            <Link
              href={hackathon.link}
              target="_blank"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              Website
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function DeadlineRow({ label, date, status }: { label: string; date: Date; status: string | null }) {
  const statusStyles = {
    overdue: "text-destructive",
    urgent: "text-warning",
    soon: "text-chart-4",
    upcoming: "text-info",
    normal: "text-muted-foreground",
    past: "text-muted-foreground",
  }

  const badgeStyles = {
    overdue: "bg-destructive/20 text-destructive",
    urgent: "bg-warning/20 text-warning",
    soon: "bg-chart-4/20 text-chart-4",
    upcoming: "",
    normal: "",
    past: "",
  }

  if (!isValid(date)) return null

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className={statusStyles[status as keyof typeof statusStyles] || "text-muted-foreground"}>
          {status === "past" ? format(date, "MMM d, yyyy") : formatDistanceToNow(date, { addSuffix: true })}
        </span>
        {status && ["overdue", "urgent", "soon"].includes(status) && (
          <Badge className={badgeStyles[status as keyof typeof badgeStyles]}>
            {status === "overdue" ? "Overdue" : status === "urgent" ? "Today" : "Soon"}
          </Badge>
        )}
      </div>
    </div>
  )
}
