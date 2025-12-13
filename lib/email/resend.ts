import { Resend } from "resend"

// Initialize Resend client
// Use a dummy key during build time if not available
export const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key_for_build")

// Default from address - update this to your verified domain
export const FROM_EMAIL = process.env.FROM_EMAIL || "HackNotify <notifications@hacknotify.com>"
