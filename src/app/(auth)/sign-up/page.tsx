"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/server/better-auth/client";
import { BookMarked, Eye, EyeOff } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", email: "", dob: "", phone: "",
    password: "", confirmPassword: "", agreed: false,
  });
  const [showPw, setShowPw]   = useState(false);
  const [showCPw, setShowCPw] = useState(false);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) { setError("Passwords do not match."); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (!form.agreed) { setError("Please agree to the Terms of Service and Privacy Policy."); return; }
    setLoading(true);
    const { error } = await signUp.email({ name: form.name, email: form.email, password: form.password });
    if (error) { setError(error.message ?? "Registration failed."); setLoading(false); return; }
    // Save extra fields
    await fetch("/api/auth/set-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: form.phone, dateOfBirth: form.dob }),
    });
    router.push("/dashboard");
    setLoading(false);
  }

  return (
    <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-8 md:p-10">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-teal-500 flex items-center justify-center mb-4 shadow-lg">
          <BookMarked className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-teal-600">Finance Hub</h1>
        <p className="text-lg font-semibold text-gray-900 mt-1">Create Account</p>
        <p className="text-sm text-gray-400">Start managing your account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            {/** biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
<label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
            <input type="text" placeholder="Enter Your Name" required
              value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 transition" />
          </div>
          <div>
            {/** biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
<label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
            <input type="email" placeholder="Enter Your Email Address" required
              value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 transition" />
          </div>
          <div>
            {/** biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
<label className="block text-sm font-semibold text-gray-700 mb-1.5">Date Of Birth</label>
            <input type="date"
              value={form.dob} onChange={e => setForm(p => ({ ...p, dob: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 transition" />
          </div>
          <div>
            {/** biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
<label className="block text-sm font-semibold text-gray-700 mb-1.5">Contact Number</label>
            <input type="tel" placeholder="+91 7392735542"
              value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 transition" />
          </div>
          <div>
            {/** biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
<label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} placeholder="••••••••••••" required minLength={8}
                value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 transition pr-10" />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            {/** biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
<label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm Password</label>
            <div className="relative">
              <input type={showCPw ? "text" : "password"} placeholder="••••••••••••" required
                value={form.confirmPassword} onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 transition pr-10" />
              <button type="button" onClick={() => setShowCPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showCPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.agreed}
            onChange={e => setForm(p => ({ ...p, agreed: e.target.checked }))}
            className="w-4 h-4 rounded border-gray-300 text-teal-500 focus:ring-teal-400" />
          <span className="text-sm text-gray-600">
            I agree to the{" "}
            <Link href="#" className="text-blue-600 font-semibold hover:underline">Terms of Service</Link>
            {" "}and{" "}
            <Link href="#" className="text-blue-600 font-semibold hover:underline">Privacy Policy</Link>
          </span>
        </label>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        <button type="submit" disabled={loading}
          className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)" }}>
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-400">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-blue-600 font-semibold hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
