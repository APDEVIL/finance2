import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
 
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user:         schema.user,
      session:      schema.session,
      account:      schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
 
    // ── Required for forgot-password to work ──────────────────
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to:      user.email,
        subject: "Reset your Finance Hub password",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #0d9488;">Finance Hub</h2>
            <p>Hi ${user.name ?? "there"},</p>
            <p>We received a request to reset your password. Click the button below to choose a new one:</p>
            <a href="${url}"
              style="display:inline-block;margin:16px 0;padding:12px 28px;background:#0d9488;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;">
              Reset Password
            </a>
            <p style="color:#6b7280;font-size:13px;">
              This link expires in 1 hour. If you didn't request a reset, you can safely ignore this email.
            </p>
          </div>
        `,
      });
    },
  },
  session: {
    cookieCache: { enabled: true, maxAge: 60 * 60 * 24 * 7 },
  },
});
 
export type Session = typeof auth.$Infer.Session;
 

function sendEmail(arg0: { to: string; subject: string; html: string; }) {
  throw new Error("Function not implemented.");
}
 