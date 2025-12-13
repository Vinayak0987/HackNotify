"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
    Clock,
    CheckSquare,
    Link as LinkIcon,
    Users,
    Plus,
    Trash2,
    ExternalLink,
    Save,
    Rocket
} from "lucide-react"
import Link from "next/link"
import { differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds } from "date-fns"
import type { Hackathon, Profile } from "@/lib/types"
import { toast } from "sonner"

type ChecklistItem = {
    id: string
    text: string
    completed: boolean
}

type ResourceLink = {
    id: string
    title: string
    url: string
}

type TeamMember = {
    user_id: string
    profiles: Profile | null
}

export default function HackathonDetailsPage() {
    const params = useParams()
    const id = params.id as string
    const [hackathon, setHackathon] = useState<Hackathon | null>(null)
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
    const [loading, setLoading] = useState(true)

    // State for widgets
    const [checklist, setChecklist] = useState<ChecklistItem[]>([])
    const [links, setLinks] = useState<ResourceLink[]>([])

    // Input states
    const [newChecklistItem, setNewChecklistItem] = useState("")
    const [newLinkTitle, setNewLinkTitle] = useState("")
    const [newLinkUrl, setNewLinkUrl] = useState("")

    const [timeLeft, setTimeLeft] = useState<{ days: number, hours: number, minutes: number, seconds: number } | null>(null)

    const supabase = createClient()

    // Fetch Data
    const fetchData = useCallback(async () => {
        try {
            const { data: h, error } = await supabase
                .from("hackathons")
                .select("*")
                .eq("id", id)
                .single()

            if (error) throw error
            setHackathon(h)

            // Initialize widgets from JSONB columns
            // Note: Supabase types might imply these are generic JSON, so we cast
            if (h.checklist) setChecklist(h.checklist as unknown as ChecklistItem[])
            if (h.links) setLinks(h.links as unknown as ResourceLink[])

            // Fetch team
            if (h.team_id) {
                const { data: team } = await supabase
                    .from("team_members")
                    .select("user_id, profiles(*)")
                    .eq("team_id", h.team_id)

                const normalized = ((team as any[]) || []).map((m) => {
                    const raw = (m as any).profiles
                    const profile = Array.isArray(raw) ? raw[0] : raw

                    return {
                        user_id: (m as any).user_id,
                        profiles: (profile ?? null) as Profile | null,
                    } satisfies TeamMember
                })

                setTeamMembers(normalized)
            }

        } catch (error) {
            console.error("Error fetching hackathon:", error)
            toast.error("Failed to load hackathon details")
        } finally {
            setLoading(false)
        }
    }, [id, supabase])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // Countdown Logic
    useEffect(() => {
        if (!hackathon?.submission_deadline) return

        const deadline = new Date(hackathon.submission_deadline)

        const timer = setInterval(() => {
            const now = new Date()
            if (now > deadline) {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
                clearInterval(timer)
                return
            }

            setTimeLeft({
                days: differenceInDays(deadline, now),
                hours: differenceInHours(deadline, now) % 24,
                minutes: differenceInMinutes(deadline, now) % 60,
                seconds: differenceInSeconds(deadline, now) % 60,
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [hackathon])

    // Persistence Helpers
    const saveChecklist = async (newList: ChecklistItem[]) => {
        setChecklist(newList)
        await supabase.from("hackathons").update({ checklist: newList }).eq("id", id)
    }

    const saveLinks = async (newList: ResourceLink[]) => {
        setLinks(newList)
        await supabase.from("hackathons").update({ links: newList }).eq("id", id)
    }

    // Widget Actions
    const addChecklistItem = () => {
        if (!newChecklistItem.trim()) return
        const newItem = { id: crypto.randomUUID(), text: newChecklistItem, completed: false }
        saveChecklist([...checklist, newItem])
        setNewChecklistItem("")
    }

    const toggleChecklistItem = (itemId: string) => {
        const newList = checklist.map(item =>
            item.id === itemId ? { ...item, completed: !item.completed } : item
        )
        saveChecklist(newList)
    }

    const deleteChecklistItem = (itemId: string) => {
        saveChecklist(checklist.filter(item => item.id !== itemId))
    }

    const addLink = () => {
        if (!newLinkTitle.trim() || !newLinkUrl.trim()) return
        const newLink = { id: crypto.randomUUID(), title: newLinkTitle, url: newLinkUrl }
        saveLinks([...links, newLink])
        setNewLinkTitle("")
        setNewLinkUrl("")
    }

    const deleteLink = (linkId: string) => {
        saveLinks(links.filter(l => l.id !== linkId))
    }

    if (loading) return <div className="p-8 text-center">Loading Command Center...</div>
    if (!hackathon) return <div className="p-8 text-center">Hackathon not found</div>

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Link href="/hackathons" className="text-sm text-muted-foreground hover:text-primary">← Back to List</Link>
                    </div>
                    <h1 className="text-3xl font-bold text-foreground">{hackathon.title}</h1>
                    <p className="text-muted-foreground">Command Center</p>
                </div>
                <div className="flex gap-2">
                    <Link href={`/hackathons/${id}/edit`}>
                        <Button variant="outline">Edit Details</Button>
                    </Link>
                    {hackathon.link && (
                        <Link href={hackathon.link} target="_blank">
                            <Button variant="secondary" className="gap-2">
                                <ExternalLink className="w-4 h-4" />
                                Website
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">

                {/* Left Column: Timer & Checklist */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Countdown Widget */}
                    <Card className="bg-gradient-to-br from-primary/5 to-background border-primary/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-primary" />
                                Countdown to Submission
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {timeLeft ? (
                                <div className="grid grid-cols-4 gap-4 text-center">
                                    <TimeBox value={timeLeft.days} label="Days" />
                                    <TimeBox value={timeLeft.hours} label="Hours" />
                                    <TimeBox value={timeLeft.minutes} label="Mins" />
                                    <TimeBox value={timeLeft.seconds} label="Secs" />
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">No deadline set</div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Submission Checklist */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckSquare className="w-5 h-5 text-primary" />
                                Submission Checklist
                            </CardTitle>
                            <CardDescription>Don&apos;t forget your Devpost, Demo Video, and Repo!</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Add item (e.g. Record Demo Video)"
                                    value={newChecklistItem}
                                    onChange={(e) => setNewChecklistItem(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
                                />
                                <Button onClick={addChecklistItem} size="icon">
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {checklist.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No items yet</p>}
                                {checklist.map((item) => (
                                    <div key={item.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg group">
                                        <Checkbox
                                            checked={item.completed}
                                            onCheckedChange={() => toggleChecklistItem(item.id)}
                                        />
                                        <span className={item.completed ? "line-through text-muted-foreground flex-1" : "flex-1"}>
                                            {item.text}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="opacity-0 group-hover:opacity-100 h-8 w-8 text-destructive"
                                            onClick={() => deleteChecklistItem(item.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                </div>

                {/* Right Column: Roles & Links */}
                <div className="space-y-6">

                    {/* Team Roles */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-primary" />
                                Team Roles
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {teamMembers.map((tm) => {
                                    const name = tm.profiles?.name || "Unknown"
                                    const initials = (name.slice(0, 2) || "??").toUpperCase()
                                    const roleLabel = tm.profiles?.role === "admin" ? "Admin" : "Member"

                                    return (
                                        <div key={tm.user_id} className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarFallback>{initials}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium text-sm">{name}</p>
                                                <p className="text-xs text-muted-foreground">{roleLabel}</p>
                                            </div>
                                        </div>
                                    )
                                })}
                                <div className="pt-2">
                                    <Link href="/team">
                                        <Button variant="ghost" size="sm" className="w-full text-muted-foreground">Manage Team</Button>
                                    </Link>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Resources Hub */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <LinkIcon className="w-5 h-5 text-primary" />
                                Resources Hub
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Input
                                    placeholder="Title (e.g. API Docs)"
                                    value={newLinkTitle}
                                    onChange={(e) => setNewLinkTitle(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="URL (https://...)"
                                        value={newLinkUrl}
                                        onChange={(e) => setNewLinkUrl(e.target.value)}
                                    />
                                    <Button onClick={addLink} size="icon">
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                {links.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No links saved</p>}
                                {links.map((link) => (
                                    <div key={link.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg group">
                                        <Link href={link.url} target="_blank" className="flex items-center gap-2 hover:text-primary transition-colors truncate">
                                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                            <span className="text-sm font-medium truncate">{link.title}</span>
                                        </Link>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="opacity-0 group-hover:opacity-100 h-6 w-6 text-destructive"
                                            onClick={() => deleteLink(link.id)}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                </div>

            </div>
        </div>
    )
}

function TimeBox({ value, label }: { value: number, label: string }) {
    return (
        <div className="bg-background/50 rounded-lg p-2 border border-border">
            <div className="text-3xl font-bold font-mono text-primary">{String(value).padStart(2, '0')}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
        </div>
    )
}
