"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getOfflineCache, setOfflineCache } from "@/lib/offline/cache"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatsCard } from "@/components/dashboard/stats-card"
import { DeadlineCard } from "@/components/dashboard/deadline-card"
import { TaskItem } from "@/components/dashboard/task-item"
import { Trophy, CheckSquare, Clock, AlertTriangle, Plus, ArrowRight, Users } from "lucide-react"
import Link from "next/link"
import type { Hackathon, Task, Profile } from "@/lib/types"
import { useOnlineStatus } from "@/lib/offline/online"

export default function DashboardPage() {
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(true)
  const [offlineInfo, setOfflineInfo] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const [hackathons, setHackathons] = useState<Hackathon[]>([])
  const [tasks, setTasks] = useState<(Task & { assignee: Profile | null })[]>([])
  const [hasTeam, setHasTeam] = useState(true)
  const [userName, setUserName] = useState<string | null>(null)
  const { isOnline } = useOnlineStatus()

  const fetchData = useCallback(async () => {
    const supabase = createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const user = session?.user
    if (!user) {
      router.replace("/auth/login")
      return
    }

    setUserId(user.id)
    setUserName((user.user_metadata as any)?.name || null)

    try {
      const { data: teamMembers } = await supabase.from("team_members").select("team_id").eq("user_id", user.id)
      const teamIds = teamMembers?.map((tm) => tm.team_id) || []
      const _hasTeam = teamIds.length > 0
      setHasTeam(_hasTeam)

      if (!_hasTeam) {
        setHackathons([])
        setTasks([])
        setOfflineInfo(null)
        return
      }

      const { data: hackathonData, error: hackError } = await supabase
        .from("hackathons")
        .select("*")
        .in("team_id", teamIds)
        .order("submission_deadline", { ascending: true })
      if (hackError) throw hackError

      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .select("*, assignee:assigned_to(id, name, email)")
        .in("team_id", teamIds)
        .order("deadline", { ascending: true })
      if (taskError) throw taskError

      const hackList = (hackathonData || []) as Hackathon[]
      const taskList = (taskData || []) as (Task & { assignee: Profile | null })[]

      setHackathons(hackList)
      setTasks(taskList)
      setOfflineCache(user.id, "hackathons", hackList)
      setOfflineCache(user.id, "tasks", taskList)
      setOfflineInfo(null)
    } catch {
      const cachedHack = getOfflineCache<Hackathon[]>(user.id, "hackathons")
      const cachedTasks = getOfflineCache<(Task & { assignee: Profile | null })[]>(user.id, "tasks")

      if (cachedHack) setHackathons(cachedHack.value)
      if (cachedTasks) setTasks(cachedTasks.value)

      const at = cachedHack?.savedAt || cachedTasks?.savedAt
      setOfflineInfo(at ? `Offline • showing cached data from ${at}` : "Offline • no cached data yet")
    } finally {
      setIsLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const now = useMemo(() => new Date(), [])

  // Calculate stats
  const upcomingDeadlines = useMemo(() => {
    return hackathons.filter((h) => {
      const regDeadline = h.reg_deadline ? new Date(h.reg_deadline) : null
      const subDeadline = h.submission_deadline ? new Date(h.submission_deadline) : null
      return (regDeadline && regDeadline > now) || (subDeadline && subDeadline > now)
    })
  }, [hackathons, now])

  const myTasks = useMemo(() => (userId ? tasks.filter((t) => t.assigned_to === userId && t.status !== "done") : []), [tasks, userId])
  const overdueTasks = useMemo(() => tasks.filter((t) => t.deadline && new Date(t.deadline) < now && t.status !== "done"), [tasks, now])
  const completedTasks = useMemo(() => tasks.filter((t) => t.status === "done"), [tasks])

  const sevenDaysFromNow = useMemo(() => new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), [now])

  const urgentDeadlines = useMemo(() => {
    return hackathons
      .filter((h) => {
        const regDeadline = h.reg_deadline ? new Date(h.reg_deadline) : null
        const subDeadline = h.submission_deadline ? new Date(h.submission_deadline) : null
        return (
          (regDeadline && regDeadline > now && regDeadline <= sevenDaysFromNow) ||
          (subDeadline && subDeadline > now && subDeadline <= sevenDaysFromNow)
        )
      })
      .slice(0, 3)
  }, [hackathons, now, sevenDaysFromNow])

  const pendingTasks = useMemo(() => (userId ? tasks.filter((t) => t.assigned_to === userId && t.status !== "done").slice(0, 5) : []), [tasks, userId])

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">Loading dashboard...</CardContent>
        </Card>
      </div>
    )
  }

  if (!hasTeam) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Welcome to HackNotify</h1>
          <p className="text-muted-foreground">Get started by creating or joining a team</p>
        </div>

        <Card>
          <CardHeader>
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>Create Your First Team</CardTitle>
            <CardDescription>
              Teams are where you and your hackathon partners collaborate. Create a team to start tracking hackathons
              and assigning tasks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/team/create">
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create a Team
                </Button>
              </Link>
              <Link href="/team/join">
                <Button variant="outline">Join with Invite Code</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {userName || "there"}!</p>
          {offlineInfo && <p className="text-xs text-muted-foreground mt-1">{offlineInfo}</p>}
        </div>
        <div className="flex gap-2">
          <Link href="/hackathons/new" aria-disabled={!isOnline} tabIndex={!isOnline ? -1 : undefined}>
            <Button variant="outline" size="sm" className="gap-2 bg-transparent" disabled={!isOnline}>
              <Plus className="w-4 h-4" />
              Add Hackathon
            </Button>
          </Link>
          <Link href="/tasks/new" aria-disabled={!isOnline} tabIndex={!isOnline ? -1 : undefined}>
            <Button size="sm" className="gap-2" disabled={!isOnline}>
              <Plus className="w-4 h-4" />
              New Task
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Hackathons"
          value={hackathons.length}
          description={`${upcomingDeadlines.length} upcoming`}
          icon={<Trophy className="w-5 h-5" />}
        />
        <StatsCard
          title="My Tasks"
          value={myTasks.length}
          description="assigned to you"
          icon={<CheckSquare className="w-5 h-5" />}
        />
        <StatsCard
          title="Completed"
          value={completedTasks.length}
          description="tasks done"
          icon={<Clock className="w-5 h-5" />}
        />
        <StatsCard
          title="Overdue"
          value={overdueTasks.length}
          description="need attention"
          icon={<AlertTriangle className="w-5 h-5" />}
          className={overdueTasks.length > 0 ? "border-destructive/50" : ""}
        />
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Upcoming Deadlines</CardTitle>
              <CardDescription>Next 7 days</CardDescription>
            </div>
            <Link href="/hackathons">
              <Button variant="ghost" size="sm" className="gap-1">
                View all <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {urgentDeadlines.length > 0 ? (
              urgentDeadlines.map((hackathon) => {
                const regDeadline = hackathon.reg_deadline ? new Date(hackathon.reg_deadline) : null
                const subDeadline = hackathon.submission_deadline ? new Date(hackathon.submission_deadline) : null
                const showReg = regDeadline && regDeadline > now && regDeadline <= sevenDaysFromNow
                const showSub = subDeadline && subDeadline > now && subDeadline <= sevenDaysFromNow

                return (
                  <div key={hackathon.id}>
                    {showReg && <DeadlineCard hackathon={hackathon} deadlineType="registration" />}
                    {showSub && <DeadlineCard hackathon={hackathon} deadlineType="submission" />}
                  </div>
                )
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No upcoming deadlines</p>
                <Link href="/hackathons/new">
                  <Button variant="link" size="sm">
                    Add a hackathon
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">My Tasks</CardTitle>
              <CardDescription>Assigned to you</CardDescription>
            </div>
            <Link href="/tasks">
              <Button variant="ghost" size="sm" className="gap-1">
                View all <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingTasks.length > 0 ? (
              pendingTasks.map((task) => <TaskItem key={task.id} task={task} />)
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No pending tasks</p>
                <Link href="/tasks/new">
                  <Button variant="link" size="sm">
                    Create a task
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
