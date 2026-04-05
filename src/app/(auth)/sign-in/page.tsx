"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/server/better-auth/client";
import { BookMarked, Eye, EyeOff } from "lucide-react";

export default function SignInPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", remember: false });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const { error } = await signIn.email({ email: form.email, password: form.password });
    setLoading(false);
    if (error) { setError("Invalid email or password. Please try again."); return; }
    router.push("/dashboard");
  }

  return (
    <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 md:p-10">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-teal-500 flex items-center justify-center mb-4 shadow-lg">
          <BookMarked className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-teal-600 tracking-tight">Finance Hub</h1>
        <p className="text-lg font-semibold text-gray-900 mt-1">Sign in</p>
        <p className="text-sm text-gray-400">Sign in to manage your finances</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          {/** biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
<label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
          <input
            type="email"
            placeholder="Enter Your Email Address"
            value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            required
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 transition"
          />
        </div>
        <div>
          {/** biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
<label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              required
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 transition pr-10"
            />
            <button type="button" onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.remember}
              onChange={e => setForm(p => ({ ...p, remember: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 text-teal-500 focus:ring-teal-400" />
            <span className="text-sm text-gray-600 font-medium">Remember me</span>
          </label>
          <Link href="/forgot-password" className="text-sm text-blue-600 font-semibold hover:underline">
            Forget Password?
          </Link>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading}
          className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)" }}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-400">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="text-blue-600 font-semibold hover:underline">Sign up</Link>
      </p>
    </div>
  );
}

