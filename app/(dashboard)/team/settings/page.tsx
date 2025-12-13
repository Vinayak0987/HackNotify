"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Loader2, Trash2, LogOut, Save, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import type { Profile } from "@/lib/types"

type TeamMember = {
    id: string
    user_id: string
    role: "admin" | "member"
    joined_at: string
    profiles: Profile | null
}

export default function TeamSettingsPage() {
    const [loading, setLoading] = useState(true)
    const [teamName, setTeamName] = useState("")
    const [members, setMembers] = useState<TeamMember[]>([])
    const [currentUserRole, setCurrentUserRole] = useState<string>("")
    const [currentUserId, setCurrentUserId] = useState<string>("")
    const [teamId, setTeamId] = useState<string>("")
    const [saving, setSaving] = useState(false)

    const router = useRouter()
    const supabase = useMemo(() => createClient(), [])

    const fetchTeamData = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push("/auth/login")
                return
            }
            setCurrentUserId(user.id)

            // Get user's team
            const { data: teamMember } = await supabase
                .from("team_members")
                .select("team_id, role")
                .eq("user_id", user.id)
                .single()

            if (!teamMember) {
                toast.error("You don't have a team")
                router.push("/team")
                return
            }

            setTeamId(teamMember.team_id)
            setCurrentUserRole(teamMember.role)

            // Get team details
            const { data: team } = await supabase
                .from("teams")
                .select("name")
                .eq("id", teamMember.team_id)
                .single()

            if (team) setTeamName(team.name)

            // Get members
            const { data: members } = await supabase
                .from("team_members")
                .select(`
          id, 
          user_id, 
          role, 
          joined_at, 
          profiles (*)
        `)
                .eq("team_id", teamMember.team_id)

            setMembers(((members as unknown) as TeamMember[]) || [])

        } catch (error) {
            console.error("Error loading settings:", error)
            toast.error("Failed to load settings")
        } finally {
            setLoading(false)
        }
    }, [router, supabase])

    useEffect(() => {
        fetchTeamData()
    }, [fetchTeamData])

    const handleUpdateName = async () => {
        if (!teamName.trim()) return
        setSaving(true)
        try {
            const { error } = await supabase
                .from("teams")
                .update({ name: teamName })
                .eq("id", teamId)

            if (error) throw error
            toast.success("Team name updated")
            router.refresh()
        } catch (error) {
            toast.error("Failed to update name")
        } finally {
            setSaving(false)
        }
    }

    const handleRemoveMember = async (userId: string) => {
        if (!confirm("Are you sure you want to remove this member?")) return
        try {
            const { error } = await supabase
                .from("team_members")
                .delete()
                .eq("team_id", teamId)
                .eq("user_id", userId)

            if (error) throw error
            toast.success("Member removed")
            fetchTeamData() // Refresh list
        } catch (error) {
            toast.error("Failed to remove member")
        }
    }

    const handleLeaveTeam = async () => {
        if (currentUserRole === 'admin' && members.filter(m => m.role === 'admin').length === 1) {
            toast.error("You are the only admin. Promote someone else before leaving.")
            return
        }

        if (!confirm("Are you sure you want to leave this team?")) return

        try {
            const { error } = await supabase
                .from("team_members")
                .delete()
                .eq("team_id", teamId)
                .eq("user_id", currentUserId)

            if (error) throw error
            toast.success("Left team successfully")
            router.push("/dashboard")
            router.refresh()
        } catch (error) {
            console.error(error)
            toast.error("Failed to leave team")
        }
    }

    if (loading) return <div className="p-8 text-center">Loading settings...</div>

    const isAdmin = currentUserRole === 'admin'

    return (
        <div className="max-w-2xl mx-auto space-y-8 pb-20">
            <div>
                <h1 className="text-3xl font-bold mb-2">Team Settings</h1>
                <p className="text-muted-foreground">Manage your team preferences and members</p>
            </div>

            {/* General Settings */}
            <Card>
                <CardHeader>
                    <CardTitle>General</CardTitle>
                    <CardDescription>Basic team information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Team Name</Label>
                        <div className="flex gap-2">
                            <Input
                                value={teamName}
                                onChange={(e) => setTeamName(e.target.value)}
                                disabled={!isAdmin}
                            />
                            {isAdmin && (
                                <Button onClick={handleUpdateName} disabled={saving}>
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                </Button>
                            )}
                        </div>
                        {!isAdmin && <p className="text-xs text-muted-foreground">Only admins can rename the team</p>}
                    </div>
                </CardContent>
            </Card>

            {/* Members Management */}
            <Card>
                <CardHeader>
                    <CardTitle>Members</CardTitle>
                    <CardDescription>Manage who has access to your team</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {members.map((member) => {
                            const name = member.profiles?.name || "Unknown"
                            const initials = (name.slice(0, 2) || "??").toUpperCase()
                            const email = member.profiles?.email || ""

                            return (
                                <div key={member.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarFallback>{initials}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium text-sm">{name}</p>
                                            {email && <p className="text-xs text-muted-foreground">{email}</p>}
                                        </div>
                                        {member.role === 'admin' && <Badge variant="secondary" className="text-xs">Admin</Badge>}
                                    </div>
                                    {isAdmin && member.user_id !== currentUserId && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:bg-destructive/10"
                                            onClick={() => handleRemoveMember(member.user_id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive/20">
                <CardHeader>
                    <CardTitle className="text-destructive flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Danger Zone
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Button variant="destructive" className="w-full sm:w-auto" onClick={handleLeaveTeam}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Leave Team
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                        If you are the last member, the team will be deleted.
                    </p>
                </CardContent>
            </Card>

        </div>
    )
}
