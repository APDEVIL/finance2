// ============================================================
// src/app/(auth)/forgot-password/page.tsx
// ============================================================
"use client";
import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/server/better-auth/client";
import { BookMarked, ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email,     setEmail]     = useState("");
  const [sent,      setSent]      = useState(false);
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error } = await authClient.requestPasswordReset({
        email,
        redirectTo: "/reset-password",
      });
      if (error) {
        setError("Something went wrong. Please try again.");
      } else {
        setSent(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 md:p-10">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-teal-500 flex items-center justify-center mb-4 shadow-lg">
          <BookMarked className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-teal-600 tracking-tight">Finance Hub</h1>
        <p className="text-lg font-semibold text-gray-900 mt-1">Forgot Password</p>
        <p className="text-sm text-gray-400 text-center mt-1">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      {sent ? (
        /* ── Success state ── */
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
            <Mail className="w-8 h-8 text-green-500" />
          </div>
          <p className="text-base font-semibold text-gray-900 text-center">
            Check your inbox!
          </p>
          <p className="text-sm text-gray-400 text-center leading-relaxed">
            We&apos;ve sent a password reset link to{" "}
            <span className="font-semibold text-gray-700">{email}</span>.
            It may take a minute to arrive.
          </p>
          <Link href="/sign-in"
            className="mt-2 flex items-center gap-2 text-sm text-teal-600 font-semibold hover:underline">
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>
      ) : (
        /* ── Form state ── */
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            {/** biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
<label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              placeholder="Enter your registered email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 transition"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)" }}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>

          <Link href="/sign-in"
            className="flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition font-medium">
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </form>
      )}
    </div>
  );
}