import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendEmail } from "@/lib/email/send"
import { weeklySummaryEmail } from "@/lib/email/templates"
import type { Hackathon, Task } from "@/lib/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getAdminClient()
  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  try {
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("notifications_email", true)

    if (profileError) throw profileError

    let emailsSent = 0
    const errors: string[] = []

    for (const profile of profiles || []) {
      if (!profile.email) continue

      const { data: teamMember } = await supabase
        .from("team_members")
        .select("team:teams(*)")
        .eq("user_id", profile.id)
        .single()

      if (!teamMember?.team) continue

      const teamRaw = (teamMember as any).team
      const team = Array.isArray(teamRaw) ? teamRaw[0] : teamRaw

      if (!team?.id || !team?.name) continue

      // Stats for the past week
      const { count: tasksCompleted } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("team_id", team.id)
        .eq("status", "done")
        .gte("updated_at", oneWeekAgo.toISOString())

      const { count: tasksCreated } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("team_id", team.id)
        .gte("created_at", oneWeekAgo.toISOString())

      const { count: hackathonsAdded } = await supabase
        .from("hackathons")
        .select("*", { count: "exact", head: true })
        .eq("team_id", team.id)
        .gte("created_at", oneWeekAgo.toISOString())

      // Next week's hackathons
      const { data: nextWeekHackathons } = await supabase
        .from("hackathons")
        .select("*")
        .eq("team_id", team.id)
        .or(`reg_deadline.lte.${oneWeekFromNow.toISOString()},submission_deadline.lte.${oneWeekFromNow.toISOString()}`)
        .or(`reg_deadline.gte.${now.toISOString()},submission_deadline.gte.${now.toISOString()}`)

      // Next week's tasks for user
      const { data: nextWeekTasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("assigned_to", profile.id)
        .neq("status", "done")
        .gte("deadline", now.toISOString())
        .lte("deadline", oneWeekFromNow.toISOString())
        .order("deadline", { ascending: true })

      const { subject, html } = weeklySummaryEmail(
        profile.name || "there",
        team.name,
        {
          tasksCompleted: tasksCompleted || 0,
          tasksCreated: tasksCreated || 0,
          hackathonsAdded: hackathonsAdded || 0,
          upcomingDeadlines: (nextWeekHackathons?.length || 0) + (nextWeekTasks?.length || 0),
        },
        (nextWeekHackathons || []) as Hackathon[],
        (nextWeekTasks || []) as Task[],
      )

      const result = await sendEmail({
        to: profile.email,
        subject,
        html,
        userId: profile.id,
        notificationType: "weekly_summary",
      })

      if (result.success) emailsSent++
      else errors.push(`Failed to send to ${profile.email}`)
    }

    return NextResponse.json({
      success: true,
      emailsSent,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Weekly summary cron error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
