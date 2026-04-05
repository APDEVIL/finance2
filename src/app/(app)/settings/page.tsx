// ============================================================
// src/app/(app)/settings/page.tsx
// ============================================================
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { signOut } from "@/server/better-auth/client";
import {
  Bell, AlertTriangle, Target, TrendingUp, Mail, MessageSquare,
  Shield, Clock, EyeOff, Share2, Download,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

// ─── helpers ─────────────────────────────────────────────────────────────────

function getDateRange(period: string): { from: string; to: string } {
  const now   = new Date();
  const y     = now.getFullYear();
  const m     = now.getMonth();
  const pad   = (n: number) => String(n).padStart(2, "0");
  const fmt   = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (period === "this_month") {
    return { from: fmt(new Date(y, m, 1)), to: fmt(new Date(y, m + 1, 0)) };
  }
  if (period === "last_month") {
    return { from: fmt(new Date(y, m - 1, 1)), to: fmt(new Date(y, m, 0)) };
  }
  if (period === "last_3_months") {
    return { from: fmt(new Date(y, m - 2, 1)), to: fmt(new Date(y, m + 1, 0)) };
  }
  // this_year
  return { from: `${y}-01-01`, to: `${y}-12-31` };
}

function escapeCSV(val: string | number) {
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const { data: profile, refetch } = api.profile.me.useQuery();

  const [personalForm, setPersonalForm] = useState({
    name: "", email: "", dateOfBirth: "", phone: "", newPassword: "", confirmPassword: "",
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showShareDialog,   setShowShareDialog]   = useState(false);
  const [showExportDialog,  setShowExportDialog]  = useState(false);
  const [shareEmail,        setShareEmail]        = useState("");
  const [shareBudget,       setShareBudget]       = useState(false);
  const [shareGoals,        setShareGoals]        = useState(false);
  const [savedPersonal,     setSavedPersonal]     = useState(false);

  // Export state
  const [exportType,   setExportType]   = useState<"all" | "income" | "expense">("all");
  const [exportPeriod, setExportPeriod] = useState("this_month");
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");
  const [exporting,    setExporting]    = useState(false);

  // Share state
  const [shareSending, setShareSending] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [shareError,   setShareError]   = useState("");

  useEffect(() => {
    if (profile) {
      setPersonalForm(p => ({
        ...p,
        name:        profile.name ?? "",
        email:       profile.email ?? "",
        dateOfBirth: profile.dateOfBirth ?? "",
        phone:       profile.phone ?? "",
      }));
    }
  }, [profile]);

  const updateProfile = api.profile.update.useMutation({
    onSuccess: () => { void refetch(); setSavedPersonal(true); setTimeout(() => setSavedPersonal(false), 2000); },
  });

  const updateNotif = api.profile.updateNotificationSettings.useMutation({
    onSuccess: () => void refetch(),
  });

  const updateSecurity = api.profile.updateSecuritySettings.useMutation({
    onSuccess: () => void refetch(),
  });

  const deleteAccount = api.profile.deleteAccount.useMutation({
    onSuccess: async () => { await signOut(); router.push("/sign-in"); },
  });

  // Fetch all transactions client-side for export
  const { data: allTransactions = [] } = api.transaction.list.useQuery(
    { type: exportType === "all" ? "all" : exportType, limit: 5000 },
    { enabled: showExportDialog }
  );

  // Fetch summary + goals for share
  const { data: shareSummary } = api.transaction.summary.useQuery(undefined, { enabled: showShareDialog });
  const { data: shareGoalsList = [] } = api.goal.list.useQuery(undefined, { enabled: showShareDialog && shareGoals });
  const { data: shareBudgetList = [] } = api.budget.list.useQuery(undefined, { enabled: showShareDialog && shareBudget });

  // ── Export handler ──────────────────────────────────────────────────────────
  function handleExport() {
    setExporting(true);
    const { from, to } = getDateRange(exportPeriod);

    // Filter by date range
    const filtered = allTransactions.filter(txn => txn.date >= from && txn.date <= to);

    if (exportFormat === "csv") {
      const rows = [
        ["Date", "Description", "Category", "Type", "Amount (INR)", "Notes"].map(escapeCSV).join(","),
        ...filtered.map(t =>
          [
            t.date,
            t.description,
            t.category.replace(/_/g, " "),
            t.type,
            t.amount.toFixed(2),
            t.notes ?? "",
          ].map(escapeCSV).join(",")
        ),
      ].join("\n");

      const blob = new Blob([rows], { type: "text/csv;charset=utf-8;" });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href     = url;
      link.download = `finance-hub-${exportPeriod}-${exportType}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // JSON export
      const data = {
        exportedAt: new Date().toISOString(),
        period:     exportPeriod,
        type:       exportType,
        transactions: filtered.map(t => ({
          date:        t.date,
          description: t.description,
          category:    t.category,
          type:        t.type,
          amount:      t.amount,
          notes:       t.notes ?? null,
        })),
        summary: {
          totalIncome:   filtered.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0),
          totalExpenses: filtered.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0),
          count:         filtered.length,
        },
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href     = url;
      link.download = `finance-hub-${exportPeriod}-${exportType}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    setExporting(false);
    setShowExportDialog(false);
  }

  // ── Share handler ───────────────────────────────────────────────────────────
  async function handleShare() {
    if (!shareEmail) { setShareError("Please enter an email address."); return; }
    if (!shareBudget && !shareGoals) { setShareError("Select at least one item to share."); return; }

    setShareSending(true);
    setShareError("");

    // Build a plain-text financial summary to send
    const lines: string[] = ["Hi! Here's a financial summary shared via Finance Hub.", ""];

    if (shareSummary) {
      lines.push("=== Monthly Overview ===");
      lines.push(`Income:   ₹${shareSummary.totalIncome.toFixed(0)}`);
      lines.push(`Expenses: ₹${shareSummary.totalExpenses.toFixed(0)}`);
      lines.push(`Balance:  ₹${shareSummary.currentBalance.toFixed(0)}`);
      lines.push("");
    }
    if (shareBudget && shareBudgetList.length > 0) {
      lines.push("=== Budget Progress ===");
      shareBudgetList.forEach(b => {
        lines.push(`${b.category.replace(/_/g, " ")}: ₹${b.spent.toFixed(0)} / ₹${b.amount.toFixed(0)} (${Math.min(b.percentage, 100).toFixed(0)}%)`);
      });
      lines.push("");
    }
    if (shareGoals && shareGoalsList.length > 0) {
      lines.push("=== Savings Goals ===");
      shareGoalsList.forEach(g => {
        const pct = g.targetAmount > 0 ? ((g.savedAmount / g.targetAmount) * 100).toFixed(0) : "0";
        lines.push(`${g.name}: ₹${g.savedAmount.toFixed(0)} / ₹${g.targetAmount.toFixed(0)} (${pct}%)`);
      });
      lines.push("");
    }

    const body    = encodeURIComponent(lines.join("\n"));
    const subject = encodeURIComponent("My Financial Summary — Finance Hub");
    const mailto  = `mailto:${shareEmail}?subject=${subject}&body=${body}`;

    // Open the user's mail client with the pre-filled email
    window.location.href = mailto;

    // Small delay then show success
    setTimeout(() => {
      setShareSending(false);
      setShareSuccess(true);
      setTimeout(() => {
        setShareSuccess(false);
        setShowShareDialog(false);
        setShareEmail("");
        setShareBudget(false);
        setShareGoals(false);
      }, 1500);
    }, 600);
  }

  const notifSettings = [
    { key: "notifBillReminder",  label: "Bill Payment Reminders",     desc: "Get Notified Before Bills are Due",        icon: Bell          },
    { key: "notifBudgetAlert",   label: "Budget OverSpending Alerts", desc: "Alerts when you exceed Category Budgets",  icon: AlertTriangle },
    { key: "notifGoalMilestone", label: "Savings Goal MileStones",    desc: "Celebrate When you Reach Goal Milestones", icon: Target        },
    { key: "notifIncome",        label: "Income Notifications",       desc: "Get Notified When Income is received",     icon: TrendingUp    },
    { key: "notifEmail",         label: "E-Mail Notifications",       desc: "Receive Notifications via E-Mail",         icon: Mail          },
    { key: "notifSms",           label: "SMS Notifications",          desc: "Receive Notification via text message",    icon: MessageSquare },
  ] as const;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="border-b border-gray-100 bg-white px-8 py-5">
        <h1 className="text-2xl font-bold text-gray-900">Profile &amp; Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage your account and preferences</p>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* Personal Information */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-xl font-black text-gray-900 mb-5">Personal Information</h2>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center text-xl font-black text-teal-700 overflow-hidden">
              {profile?.image
                ? <img src={profile.image} alt={profile.name} className="w-full h-full object-cover" />
                : profile?.name?.charAt(0).toUpperCase() ?? "U"}
            </div>
            <div className="flex gap-2">
              <Button className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm h-9">
                Change Photo
              </Button>
              <Button variant="outline" className="rounded-xl border-gray-200 text-gray-600 font-semibold text-sm h-9">
                Remove
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              {/** biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
<label className="block text-sm font-bold text-gray-700 mb-1.5">Full Name</label>
              <input type="text" placeholder="Enter Your Name"
                value={personalForm.name}
                onChange={e => setPersonalForm(p => ({ ...p, name: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-teal-400 focus:bg-white focus:outline-none transition" />
            </div>
            <div>
              {/** biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
<label className="block text-sm font-bold text-gray-700 mb-1.5">Email Address</label>
              <input type="email" placeholder="Enter Your Email Address"
                value={personalForm.email}
                onChange={e => setPersonalForm(p => ({ ...p, email: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-teal-400 focus:bg-white focus:outline-none transition" />
            </div>
            <div>
              {/** biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
<label className="block text-sm font-bold text-gray-700 mb-1.5">Date Of Birth</label>
              <input type="date"
                value={personalForm.dateOfBirth}
                onChange={e => setPersonalForm(p => ({ ...p, dateOfBirth: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-teal-400 focus:bg-white focus:outline-none transition" />
            </div>
            <div>
              {/** biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
<label className="block text-sm font-bold text-gray-700 mb-1.5">Contact Number</label>
              <input type="tel" placeholder="+91 7392735542"
                value={personalForm.phone}
                onChange={e => setPersonalForm(p => ({ ...p, phone: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-teal-400 focus:bg-white focus:outline-none transition" />
            </div>
            <div>
              {/** biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
<label className="block text-sm font-bold text-gray-700 mb-1.5">Change Password</label>
              <input type="password" placeholder="••••••••••••"
                value={personalForm.newPassword}
                onChange={e => setPersonalForm(p => ({ ...p, newPassword: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-teal-400 focus:bg-white focus:outline-none transition" />
            </div>
            <div>
              {/** biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
<label className="block text-sm font-bold text-gray-700 mb-1.5">Confirm Password</label>
              <input type="password" placeholder="••••••••••••"
                value={personalForm.confirmPassword}
                onChange={e => setPersonalForm(p => ({ ...p, confirmPassword: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-teal-400 focus:bg-white focus:outline-none transition" />
            </div>
          </div>

          <Button onClick={() => updateProfile.mutate({ name: personalForm.name, phone: personalForm.phone, dateOfBirth: personalForm.dateOfBirth || undefined })}
            disabled={updateProfile.isPending}
            className="mt-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 h-11">
            {savedPersonal ? "Saved ✓" : updateProfile.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-xl font-black text-gray-900 mb-5">Notification settings</h2>
          <div className="space-y-3">
            {notifSettings.map(({ key, label, desc, icon: Icon }) => (
              <div key={key} className="flex items-center gap-4 rounded-2xl border border-gray-100 p-4">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900">{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
                <Switch
                  checked={!!profile?.[key]}
                  onCheckedChange={checked => updateNotif.mutate({ [key]: checked })}
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-xl font-black text-gray-900 mb-5">Security Settings</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-4 rounded-2xl border border-gray-100 p-4">
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900">Two-Factor Authentication (2FA)</p>
                <p className="text-xs text-gray-400">Add an extra layer of security to your account</p>
              </div>
              <Switch
                checked={!!profile?.twoFactorEnabled}
                onCheckedChange={checked => updateSecurity.mutate({ twoFactorEnabled: checked })}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-gray-100 p-4">
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900">Session Timeout</p>
                <p className="text-xs text-gray-400">Automatically log out after inactivity</p>
              </div>
              <Select
                value={profile?.sessionTimeout ?? "1_hour"}
                onValueChange={val => updateSecurity.mutate({ sessionTimeout: val })}>
                <SelectTrigger className="w-32 rounded-xl border-gray-200 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="30_min">30 Minutes</SelectItem>
                  <SelectItem value="1_hour">1 Hour</SelectItem>
                  <SelectItem value="4_hours">4 Hours</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-gray-100 p-4">
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                <EyeOff className="w-5 h-5 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900">Privacy Mode</p>
                <p className="text-xs text-gray-400">Hide sensitive financial information</p>
              </div>
              <Switch
                checked={!!profile?.privacyMode}
                onCheckedChange={checked => updateSecurity.mutate({ privacyMode: checked })}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>
          </div>
        </div>

        {/* Export & Sharing */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-xl font-black text-gray-900 mb-5">Export &amp; Sharing</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-4 rounded-2xl border border-gray-100 p-4">
              <Download className="w-5 h-5 text-gray-500" />
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">Export Financial Data</p>
                <p className="text-xs text-gray-400">Download your transactions as CSV or JSON</p>
              </div>
              <Button
                onClick={() => setShowExportDialog(true)}
                className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold h-9 text-sm px-5">
                Export
              </Button>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-gray-100 p-4">
              <Share2 className="w-5 h-5 text-gray-500" />
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">Share Financial Insights</p>
                <p className="text-xs text-gray-400">Share reports with trusted contacts via email</p>
              </div>
              <Button onClick={() => { setShowShareDialog(true); setShareSuccess(false); setShareError(""); }}
                className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold h-9 text-sm px-5">
                Share
              </Button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6">
          <h2 className="text-xl font-black text-red-600 mb-4">Danger Zone</h2>
          <div className="flex items-center justify-between rounded-2xl border border-red-100 bg-red-50 p-4">
            <div>
              <p className="text-sm font-bold text-gray-900">Delete Account</p>
              <p className="text-xs text-gray-500">Permanently delete your account and all data</p>
            </div>
            <Button onClick={() => setShowDeleteConfirm(true)}
              className="rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold h-9 text-sm px-5">
              Delete Account
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="rounded-2xl bg-gray-900 border-0 text-white max-w-xs">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-base font-semibold text-center">
              Are you sure you want to Delete Account
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-3 mt-2">
            <AlertDialogCancel className="flex-1 bg-white text-gray-900 hover:bg-gray-100 border-white font-semibold rounded-xl">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteAccount.mutate()}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl">
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Export Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={showExportDialog} onOpenChange={v => { if (!v) setShowExportDialog(false); }}>
        <DialogContent className="sm:max-w-sm rounded-3xl border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Export Financial Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              {/** biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
<label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Transaction Type</label>
              <Select value={exportType} onValueChange={val => setExportType(val as any)}>
                <SelectTrigger className="w-full rounded-xl border-gray-200 bg-gray-50 h-12 text-sm">
                  <SelectValue placeholder="All Transactions" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Transactions</SelectItem>
                  <SelectItem value="income">Income Only</SelectItem>
                  <SelectItem value="expense">Expenses Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              {/** biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
<label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Period</label>
              <Select value={exportPeriod} onValueChange={setExportPeriod}>
                <SelectTrigger className="w-full rounded-xl border-gray-200 bg-gray-50 h-12 text-sm">
                  <SelectValue placeholder="This Month" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                  <SelectItem value="this_year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              {/** biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
<label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Format</label>
              <div className="grid grid-cols-2 gap-3">
                {(["csv", "json"] as const).map(fmt => (
                  <button key={fmt} type="button" onClick={() => setExportFormat(fmt)}
                    className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 py-5 transition font-semibold text-sm ${
                      exportFormat === fmt ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"
                    }`}>
                    <span className="text-2xl">{fmt === "csv" ? "📊" : "📄"}</span>
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={() => setShowExportDialog(false)}
                className="flex-1 rounded-xl h-12 text-sm font-bold border-gray-200">Cancel</Button>
              <Button onClick={handleExport} disabled={exporting}
                className="flex-1 rounded-xl h-12 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50">
                {exporting ? "Preparing..." : "Download"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Share Insights Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showShareDialog} onOpenChange={v => { if (!v) setShowShareDialog(false); }}>
        <DialogContent className="sm:max-w-sm rounded-3xl border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-900">Share Financial Insights</DialogTitle>
          </DialogHeader>

          {shareSuccess ? (
            <div className="flex flex-col items-center py-6 gap-3">
              <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
                <Mail className="w-7 h-7 text-green-500" />
              </div>
              <p className="text-sm font-bold text-gray-900">Email client opened!</p>
              <p className="text-xs text-gray-400 text-center">Check your email app to send the summary to {shareEmail}.</p>
            </div>
          ) : (
            <div className="space-y-4 mt-2">
              <div>
                {/** biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
<label className="block text-sm font-bold text-gray-700 mb-1.5">Share With (Email)</label>
                <input type="email" placeholder="Enter email address"
                  value={shareEmail} onChange={e => { setShareEmail(e.target.value); setShareError(""); }}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none transition" />
              </div>

              <div>
                {/** biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
<label className="block text-sm font-bold text-gray-700 mb-2">Include in Summary</label>
                <div className="space-y-2.5">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={shareBudget} onChange={e => setShareBudget(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-500" />
                    <span className="text-sm text-gray-700">Budget Progress</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={shareGoals} onChange={e => setShareGoals(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-500" />
                    <span className="text-sm text-gray-700">Savings Goals</span>
                  </label>
                </div>
              </div>

              <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3 text-xs text-yellow-800 leading-relaxed">
                This will open your email client with a pre-filled summary. Only share with trusted contacts.
              </div>

              {shareError && <p className="text-sm text-red-500">{shareError}</p>}

              <div className="flex gap-3 pt-1">
                <Button variant="outline" onClick={() => setShowShareDialog(false)}
                  className="flex-1 rounded-xl h-12 text-sm font-bold border-gray-200">Cancel</Button>
                <Button onClick={handleShare} disabled={shareSending}
                  className="flex-1 rounded-xl h-12 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50">
                  {shareSending ? "Opening..." : "Share via Email"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}