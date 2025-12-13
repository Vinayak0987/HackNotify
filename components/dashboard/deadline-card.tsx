import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, ExternalLink } from "lucide-react"
import { formatDistanceToNow, isPast, isToday, isTomorrow, isValid } from "date-fns"
import Link from "next/link"
import type { Hackathon } from "@/lib/types"

interface DeadlineCardProps {
  hackathon: Hackathon
  deadlineType: "registration" | "submission"
}

export function DeadlineCard({ hackathon, deadlineType }: DeadlineCardProps) {
  const deadline = deadlineType === "registration" ? hackathon.reg_deadline : hackathon.submission_deadline

  if (!deadline) return null

  const deadlineDate = new Date(deadline)
  if (!isValid(deadlineDate)) return null
  const isOverdue = isPast(deadlineDate)
  const isDueToday = isToday(deadlineDate)
  const isDueTomorrow = isTomorrow(deadlineDate)

  const getUrgencyBadge = () => {
    if (isOverdue) return <Badge variant="destructive">Overdue</Badge>
    if (isDueToday) return <Badge className="bg-warning text-warning-foreground">Today</Badge>
    if (isDueTomorrow) return <Badge className="bg-chart-4 text-foreground">Tomorrow</Badge>
    return null
  }

  return (
    <Card className={isOverdue ? "border-destructive/50" : isDueToday ? "border-warning/50" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-foreground truncate">{hackathon.title}</h4>
              {getUrgencyBadge()}
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {deadlineType === "registration" ? "Registration" : "Submission"} deadline
            </p>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                {isOverdue ? `${formatDistanceToNow(deadlineDate)} ago` : `in ${formatDistanceToNow(deadlineDate)}`}
              </span>
            </div>
          </div>
          {hackathon.link && (
            <Link href={hackathon.link} target="_blank" className="p-2 rounded-lg hover:bg-muted transition-colors">
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
