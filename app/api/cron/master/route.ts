import { NextResponse } from "next/server"
import { GET as hackathonReminders } from "../hackathon-reminders/route"
import { GET as taskReminders } from "../task-reminders/route"
import { GET as dailySummary } from "../daily-summary/route"
import { GET as weeklySummary } from "../weekly-summary/route"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const results = {
        hackathonReminders: null as any,
        taskReminders: null as any,
        dailySummary: null as any,
        weeklySummary: null as any,
    }

    try {
        // 1. Hackathon Reminders
        console.log("Running Hackathon Reminders...")
        const hRes = await hackathonReminders(request)
        results.hackathonReminders = await hRes.json()

        // 2. Task Reminders
        console.log("Running Task Reminders...")
        const tRes = await taskReminders(request)
        results.taskReminders = await tRes.json()

        // 3. Daily Summary
        console.log("Running Daily Summary...")
        const dRes = await dailySummary(request)
        results.dailySummary = await dRes.json()

        // 4. Weekly Summary (Mondays only)
        const today = new Date()
        if (today.getDay() === 1) { // 1 = Monday
            console.log("Running Weekly Summary...")
            const wRes = await weeklySummary(request)
            results.weeklySummary = await wRes.json()
        } else {
            results.weeklySummary = { skipped: true, reason: "Not Monday" }
        }

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            results
        })

    } catch (error) {
        console.error("Master Cron Error:", error)
        return NextResponse.json({
            error: "Master Cron Failed",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 })
    }
}
