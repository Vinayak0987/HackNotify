# HackNotify

> Your team’s hackathon command center. Track deadlines, manage tasks, and never miss a beat — online or off.

## ✨ Why HackNotify?

- **Deadline tracking** so you never miss registration or submission dates [1](#0-0) 
- **Task management** with priorities, assignments, and progress views [2](#0-1) 
- **Smart reminders** via email at 7d, 3d, 24h, and on deadline day [3](#0-2) 
- **Team workspaces** with simple invite links [4](#0-3) 
- **Offline-first** — view cached data and navigate without internet [5](#0-4) 

## 🚀 Quick start

1. Clone and install
   ```bash
   git clone https://github.com/A-alok/Hackathon-2do-Website.git
   cd Hackathon-2do-Website
   npm install
   ```
2. Set up Supabase and environment variables (see `.env.example`)
3. Run
   ```bash
   npm run dev
   ```
4. Open http://localhost:3000 and sign up

## 🏗️ Tech stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **Offline**: Service Worker pre-caching + localStorage fallback
- **UI**: shadcn/ui components, Lucide icons
- **Email**: Custom templates with cron-driven summaries

## 📱 Offline-first highlights

- **Network-aware UI** disables writes when offline using `useOnlineStatus` [6](#0-5) 
- **Data caching** stores hackathons/tasks in localStorage with timestamps [7](#0-6) 
- **Service worker pre-caches** core routes and user-specific detail pages on login [8](#0-7) 
- **Optimistic UI** for drag-and-drop task status with server reconciliation [9](#0-8) 

## 📈 What’s next?

- [ ] Push notifications for deadline alerts
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Integrations with GitHub/Discord

---

Built for hackathon hackers, by hackathon hackers. Let’s win 🚀

## Notes
- The README draws branding and feature descriptions from the landing page (`app/page.tsx`).
- Offline-first architecture details are sourced from the wiki and implemented in `app/auth/login/page.tsx` and `app/(dashboard)/tasks/page.tsx`.
- Citations reference specific lines to substantiate each claim.

Wiki pages you might want to explore:
- [Offline-First Architecture (A-alok/Hackathon-2do-Website)](/wiki/A-alok/Hackathon-2do-Website#5)

### Citations

**File:** app/page.tsx (L72-75)
```typescript
              icon={<Clock className="w-6 h-6" />}
              title="Deadline Tracking"
              description="Add hackathons and never miss registration or submission deadlines."
            />
```

**File:** app/page.tsx (L76-80)
```typescript
            <FeatureCard
              icon={<CheckSquare className="w-6 h-6" />}
              title="Task Management"
              description="Assign tasks to team members, set priorities, and track progress."
            />
```

**File:** app/page.tsx (L82-85)
```typescript
              icon={<Bell className="w-6 h-6" />}
              title="Smart Reminders"
              description="Automated email alerts 7 days, 3 days, 24 hours, and on deadline day."
            />
```

**File:** app/page.tsx (L86-90)
```typescript
            <FeatureCard
              icon={<Users className="w-6 h-6" />}
              title="Team Workspaces"
              description="Invite teammates with a simple link and collaborate together."
            />
```

**File:** app/auth/login/page.tsx (L38-52)
```typescript
      // Pre-cache routes right after login so offline works without manual visiting.
      // Includes all task/hackathon detail routes for the teams the user belongs to.
      ;(async () => {
        try {
          if (!("serviceWorker" in navigator)) return
          const reg = await navigator.serviceWorker.ready
          const post = (urls: string[]) =>
            reg.active?.postMessage({
              type: "PRECACHE_URLS",
              urls,
            })

          // Always precache core routes.
          const core = ["/", "/dashboard", "/tasks", "/hackathons", "/calendar", "/team", "/settings"]
          post(core)
```

**File:** app/(dashboard)/tasks/page.tsx (L52-52)
```typescript
  const { isOnline } = useOnlineStatus()
```

**File:** app/(dashboard)/tasks/page.tsx (L92-98)
```typescript
      setOfflineCache(user.id, "tasks", list)
    } catch {
      // Offline or network error: show cached data if present.
      const cached = getOfflineCache<TaskWithAssignee[]>(user.id, "tasks")
      if (cached) {
        setTasks(cached.value)
      }
```

**File:** app/(dashboard)/tasks/page.tsx (L265-267)
```typescript
          onDragStart={isOnline ? handleDragStart : undefined}
          onDragOver={isOnline ? handleDragOver : undefined}
          onDragEnd={isOnline ? handleDragEnd : undefined}
```
