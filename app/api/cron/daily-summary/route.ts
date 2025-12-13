import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendEmail } from "@/lib/email/send"
import { dailySummaryEmail } from "@/lib/email/templates"
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
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  try {
    // Get all users with email notifications enabled
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("notifications_email", true)

    if (profileError) throw profileError

    let emailsSent = 0
    const errors: string[] = []

    for (const profile of profiles || []) {
      if (!profile.email) continue

      // Get user's team
      const { data: teamMember } = await supabase
        .from("team_members")
        .select("team:teams(*)")
        .eq("user_id", profile.id)
        .single()

      if (!teamMember?.team) continue

      const teamRaw = (teamMember as any).team
      const team = Array.isArray(teamRaw) ? teamRaw[0] : teamRaw

      if (!team?.id || !team?.name) continue

      // Get upcoming hackathons for this team (next 7 days)
      const { data: hackathons } = await supabase
        .from("hackathons")
        .select("*")
        .eq("team_id", team.id)
        .or(
          `reg_deadline.lte.${sevenDaysFromNow.toISOString()},submission_deadline.lte.${sevenDaysFromNow.toISOString()}`,
        )
        .or(`reg_deadline.gte.${now.toISOString()},submission_deadline.gte.${now.toISOString()}`)

      // Get user's pending tasks
      const { data: pendingTasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("assigned_to", profile.id)
        .neq("status", "done")
        .gte("deadline", now.toISOString())
        .order("deadline", { ascending: true })

      // Get user's overdue tasks
      const { data: overdueTasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("assigned_to", profile.id)
        .neq("status", "done")
        .lt("deadline", now.toISOString())
        .order("deadline", { ascending: true })

      const { subject, html } = dailySummaryEmail(
        profile.name || "there",
        team.name,
        (hackathons || []) as Hackathon[],
        (pendingTasks || []) as Task[],
        (overdueTasks || []) as Task[],
      )

      const result = await sendEmail({
        to: profile.email,
        subject,
        html,
        userId: profile.id,
        notificationType: "daily_summary",
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
    console.error("Daily summary cron error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
