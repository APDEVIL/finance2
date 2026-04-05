
// ============================================================
// Email sender — src/server/email.ts
// ============================================================
// This uses Nodemailer with any SMTP provider (Gmail, Resend,
// Brevo, etc.). Add the env vars below to your .env file.
//
// .env additions needed:
//   SMTP_HOST="smtp.gmail.com"          # or smtp.resend.com etc.
//   SMTP_PORT="465"
//   SMTP_SECURE="true"                  # true for port 465, false for 587
//   SMTP_USER="you@gmail.com"
//   SMTP_PASS="your-app-password"       # Gmail: use an App Password
//   SMTP_FROM="Finance Hub <you@gmail.com>"
//
// Install:  bun add nodemailer && bun add -d @types/nodemailer
 
import nodemailer from "nodemailer";
 
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST!,
  port:   Number(process.env.SMTP_PORT ?? 465),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
  },
});
 
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to:      string;
  subject: string;
  html:    string;
}) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to,
    subject,
    html,
  });
}