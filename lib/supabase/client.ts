import { createBrowserClient } from "@supabase/ssr"

function isCapacitor() {
  return typeof window !== "undefined" && !!(window as any).Capacitor
}

export function createClient() {
  // Use localStorage for Capacitor apps to persist sessions across app restarts
  // Cookies don't persist reliably in Capacitor WebView
  if (isCapacitor()) {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storage: window.localStorage,
          storageKey: "supabase.auth.token",
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      },
    )
  }

  // For web, use default cookie-based storage
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}
