"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ArrowLeft, CheckSquare, Trash2 } from "lucide-react"
import Link from "next/link"
import type { Task, Profile } from "@/lib/types"

export default function EditTaskPage() {
  const router = useRouter()
  const params = useParams()
  const taskId = params.id as string

  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teamMembers, setTeamMembers] = useState<Profile[]>([])
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignedTo: "",
    priority: "medium",
    deadline: "",
    status: "todo",
  })

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      // Fetch task
      const { data: task, error: taskError } = await supabase.from("tasks").select("*").eq("id", taskId).single()

      if (taskError || !task) {
        setError("Task not found")
        setIsFetching(false)
        return
      }

      const taskData = task as Task

      // Get team members
      const { data: members } = await supabase
        .from("team_members")
        .select("user_id, profiles:user_id(id, name, email)")
        .eq("team_id", taskData.team_id)

      const profiles = ((members as any[]) || [])
        .map((m) => {
          const raw = (m as any).profiles
          return Array.isArray(raw) ? raw[0] : raw
        })
        .filter((p): p is Profile => Boolean(p))

      setTeamMembers(profiles)

      setFormData({
        title: taskData.title,
        description: taskData.description || "",
        assignedTo: taskData.assigned_to || "",
        priority: taskData.priority,
        deadline: taskData.deadline ? new Date(taskData.deadline).toISOString().slice(0, 16) : "",
        status: taskData.status,
      })
      setIsFetching(false)
    }

    fetchData()
  }, [taskId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      const { error: updateError } = await supabase
        .from("tasks")
        .update({
          title: formData.title,
          description: formData.description || null,
          assigned_to: formData.assignedTo || null,
          priority: formData.priority,
          deadline: formData.deadline || null,
          status: formData.status,
        })
        .eq("id", taskId)

      if (updateError) throw updateError

      router.push(`/tasks/${taskId}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      const supabase = createClient()
      const { error: deleteError } = await supabase.from("tasks").delete().eq("id", taskId)

      if (deleteError) throw deleteError

      router.push("/tasks")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task")
    }
  }

  if (isFetching) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">Loading...</CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/tasks/${taskId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Task
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Edit Task</CardTitle>
                <CardDescription>Update task details</CardDescription>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Task?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the task and all comments.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="title">Task Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="assignedTo">Assign To</Label>
                <Select
                  value={formData.assignedTo}
                  onValueChange={(value) =>
                    setFormData({ ...formData, assignedTo: value === "unassigned" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name || member.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="doing">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="deadline">Deadline</Label>
                <Input
                  id="deadline"
                  type="datetime-local"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-3">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
              <Link href={`/tasks/${taskId}`}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
