import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendEmail } from "@/lib/email/send"
import { hackathonDeadlineEmail } from "@/lib/email/templates"
import type { Profile } from "@/lib/types"

// Vercel Cron - runs every 10 minutes
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Create admin client (bypasses RLS for cron jobs)
function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Check if we should send a reminder (7 days, 3 days, 24 hours, or same day)
function shouldSendReminder(deadline: Date): { should: boolean; daysUntil: number } {
  const now = new Date()
  const diffMs = deadline.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

  // Send reminders at: 7 days, 3 days, 1 day (24 hours), and same day (0-12 hours)
  if (diffDays === 7 || diffDays === 3 || diffDays === 1) {
    return { should: true, daysUntil: diffDays }
  }

  // Same day reminder (0-12 hours before)
  if (diffHours >= 0 && diffHours <= 12 && diffDays === 0) {
    return { should: true, daysUntil: 0 }
  }

  return { should: false, daysUntil: diffDays }
}

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getAdminClient()
  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  try {
    // Get hackathons with upcoming deadlines (next 7 days)
    const { data: hackathons, error: hackathonError } = await supabase
      .from("hackathons")
      .select("*, team:teams(id, name)")
      .eq("notifications_enabled", true)
      .or(
        `reg_deadline.lte.${sevenDaysFromNow.toISOString()},submission_deadline.lte.${sevenDaysFromNow.toISOString()}`,
      )
      .or(`reg_deadline.gte.${now.toISOString()},submission_deadline.gte.${now.toISOString()}`)

    if (hackathonError) throw hackathonError

    let emailsSent = 0
    const errors: string[] = []

    for (const hackathon of hackathons || []) {
      // Check registration deadline
      if (hackathon.reg_deadline) {
        const regDeadline = new Date(hackathon.reg_deadline)
        const { should, daysUntil } = shouldSendReminder(regDeadline)

        if (should) {
          // Get team members who have email notifications enabled
          const { data: members } = await supabase
            .from("team_members")
            .select("user_id, profile:profiles(*)")
            .eq("team_id", hackathon.team_id)

          for (const member of members || []) {
            const profileRaw = (member as any).profile
            const profile = (Array.isArray(profileRaw) ? profileRaw[0] : profileRaw) as Profile | null
            if (profile?.notifications_email && profile?.email) {
              // Check if we already sent this reminder today
              const { data: existingLog } = await supabase
                .from("notification_logs")
                .select("id")
                .eq("user_id", member.user_id)
                .eq("type", `hackathon_reg_${daysUntil}d`)
                .gte("created_at", new Date(now.setHours(0, 0, 0, 0)).toISOString())
                .single()

              if (!existingLog) {
                const { subject, html } = hackathonDeadlineEmail(hackathon, "registration", daysUntil)
                const result = await sendEmail({
                  to: profile.email,
                  subject,
                  html,
                  userId: member.user_id,
                  notificationType: `hackathon_reg_${daysUntil}d`,
                })
                if (result.success) emailsSent++
                else errors.push(`Failed to send to ${profile.email}`)
              }
            }
          }
        }
      }

      // Check submission deadline
      if (hackathon.submission_deadline) {
        const subDeadline = new Date(hackathon.submission_deadline)
        const { should, daysUntil } = shouldSendReminder(subDeadline)

        if (should) {
          const { data: members } = await supabase
            .from("team_members")
            .select("user_id, profile:profiles(*)")
            .eq("team_id", hackathon.team_id)

          for (const member of members || []) {
            const profileRaw = (member as any).profile
            const profile = (Array.isArray(profileRaw) ? profileRaw[0] : profileRaw) as Profile | null
            if (profile?.notifications_email && profile?.email) {
              const { data: existingLog } = await supabase
                .from("notification_logs")
                .select("id")
                .eq("user_id", member.user_id)
                .eq("type", `hackathon_sub_${daysUntil}d`)
                .gte("created_at", new Date(now.setHours(0, 0, 0, 0)).toISOString())
                .single()

              if (!existingLog) {
                const { subject, html } = hackathonDeadlineEmail(hackathon, "submission", daysUntil)
                const result = await sendEmail({
                  to: profile.email,
                  subject,
                  html,
                  userId: member.user_id,
                  notificationType: `hackathon_sub_${daysUntil}d`,
                })
                if (result.success) emailsSent++
                else errors.push(`Failed to send to ${profile.email}`)
              }
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      emailsSent,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Cron job error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
