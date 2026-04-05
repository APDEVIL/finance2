"use client";
import { useState } from "react";
import { api } from "@/trpc/react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";
import {
  UtensilsCrossed, ShoppingCart, Car, Zap, Gift, TrendingUp, Download,
  Calendar, ArrowUpCircle, Clock, CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

// --- PDF & Excel Imports ---
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx"; // <-- NEW EXCEL IMPORT

const PIE_COLORS = ["#7C3AED","#EF4444","#3B82F6","#10B981","#F59E0B","#EC4899","#14B8A6","#F97316"];

const CATEGORY_ICONS: Record<string, any> = {
  dining_out: UtensilsCrossed,
  groceries: ShoppingCart,
  transportation: Car,
  utilities: Zap,
  other_expense: Gift,
  salary: TrendingUp,
  freelance: CreditCard,
};

function formatINR(amount: number) {
  return "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(amount);
}

export default function ReportsPage() {
  const [range, setRange]         = useState<"this_month"|"last_month"|"last_3_months"|"last_6_months"|"this_year">("last_3_months");
  const [showExport, setShowExport] = useState(false);
  const [exportType, setExportType] = useState<"all"|"income"|"expense">("all");
  const [exportPeriod, setExportPeriod] = useState("this_month");
  
  // --- Updated State to include "excel" ---
  const [exportFormat, setExportFormat] = useState<"csv"|"json"|"pdf"|"excel">("csv");
  const [exporting,    setExporting]    = useState(false);

  const { data: monthlyTrend = [] }     = api.transaction.monthlyTrend.useQuery({ months: 9 });
  const { data: expenseBreakdown = [] } = api.transaction.categoryBreakdown.useQuery({ type: "expense", range });
  const { data: incomeBreakdown  = [] } = api.transaction.categoryBreakdown.useQuery({ type: "income",  range });
  const { data: analytics }             = api.transaction.analyticsStats.useQuery();

  // Fetches transactions for export whenever the export dialog is open
  const { data: exportTransactions = [] } = api.transaction.list.useQuery(
    { type: exportType === "all" ? "all" : exportType, limit: 5000 },
    { enabled: showExport }
  );

  const rangeLabels: Record<string, string> = {
    this_month: "This Month",
    last_month: "Last Month",
    last_3_months: "Last 3 Months",
    last_6_months: "Last 6 Months",
    this_year: "This Year",
  };

  function getDateRange(period: string): { from: string; to: string } {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (period === "this_month")    return { from: fmt(new Date(y, m, 1)),     to: fmt(new Date(y, m + 1, 0)) };
    if (period === "last_month")    return { from: fmt(new Date(y, m - 1, 1)), to: fmt(new Date(y, m, 0)) };
    if (period === "last_3_months") return { from: fmt(new Date(y, m - 2, 1)), to: fmt(new Date(y, m + 1, 0)) };
    return { from: `${y}-01-01`, to: `${y}-12-31` };
  }

  function escapeCSV(val: string | number) {
    const s = String(val);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  function handleExport() {
    setExporting(true);
    const { from, to } = getDateRange(exportPeriod);
    const filtered = exportTransactions.filter(t => t.date >= from && t.date <= to);

    if (exportFormat === "csv") {
      const rows = [
        ["Date","Description","Category","Type","Amount (INR)","Notes"].map(escapeCSV).join(","),
        ...filtered.map(t =>
          [t.date, t.description, t.category.replace(/_/g, " "), t.type, t.amount.toFixed(2), t.notes ?? ""]
            .map(escapeCSV).join(",")
        ),
      ].join("\n");
      const blob = new Blob([rows], { type: "text/csv;charset=utf-8;" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `finance-report-${exportPeriod}-${exportType}.csv`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } 
    else if (exportFormat === "pdf") {
      const doc = new jsPDF();
      
      doc.setFontSize(20);
      doc.setTextColor(31, 41, 55);
      doc.text("Financial Report", 14, 22);
      
      doc.setFontSize(11);
      doc.setTextColor(107, 114, 128);
      doc.text(`Period: ${rangeLabels[exportPeriod] || exportPeriod}`, 14, 30);
      doc.text(`Type: ${exportType === "all" ? "All Transactions" : exportType === "income" ? "Income Only" : "Expenses Only"}`, 14, 36);

      const tableData = filtered.map(t => [
        t.date,
        t.description,
        t.category.replace(/_/g, " "),
        t.type,
        formatINR(t.amount),
        t.notes ?? ""
      ]);

      autoTable(doc, {
        startY: 42,
        head: [['Date', 'Description', 'Category', 'Type', 'Amount', 'Notes']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [249, 250, 251] }
      });

      doc.save(`finance-report-${exportPeriod}-${exportType}.pdf`);
    } 
    // --- NEW EXPORT LOGIC FOR EXCEL ---
    else if (exportFormat === "excel") {
      // Map data for Excel (leaving amount as number so Excel can do math on it)
      const excelData = filtered.map(t => ({
        Date: t.date,
        Description: t.description,
        Category: t.category.replace(/_/g, " "),
        Type: t.type,
        "Amount (INR)": t.amount, 
        Notes: t.notes ?? ""
      }));

      // Create a new workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      
      // Add sheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
      
      // Save file
      XLSX.writeFile(workbook, `finance-report-${exportPeriod}-${exportType}.xlsx`);
    }
    // --- END NEW EXCEL LOGIC ---
    else {
      const payload = {
        exportedAt: new Date().toISOString(),
        period: exportPeriod, type: exportType,
        transactions: filtered.map(t => ({
          date: t.date, description: t.description, category: t.category,
          type: t.type, amount: t.amount, notes: t.notes ?? null,
        })),
        summary: {
          totalIncome:   filtered.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0),
          totalExpenses: filtered.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0),
          count: filtered.length,
        },
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `finance-report-${exportPeriod}-${exportType}.json`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    }

    setExporting(false);
    setShowExport(false);
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="border-b border-gray-100 bg-white px-8 py-5">
        <h1 className="text-2xl font-bold text-gray-900">Reports &amp; Analytics</h1>
        <p className="text-sm text-gray-400 mt-0.5">Analyze your spending patterns and financial trends</p>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* Financial Reports Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-black text-gray-800" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Financial Reports
            </h2>
            <div className="flex items-center gap-2">
              <Select value={range} onValueChange={val => setRange(val as any)}>
                <SelectTrigger className="w-40 rounded-xl border-gray-200 h-10 text-sm">
                  <SelectValue>{rangeLabels[range]}</SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {Object.entries(rangeLabels).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => setShowExport(true)}
                className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md h-10">
                <Download className="w-4 h-4 mr-2" /> Export
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            {/* Line Chart */}
            <div>
              <h3 className="text-xl font-black text-gray-700 mb-4" style={{ fontFamily: "'Instrument Serif', serif" }}>
                Income vs Expenses Trend
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={monthlyTrend} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} />
                  <Tooltip formatter={(value) => typeof value === "number" ? formatINR(value) : value}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }} />
                  <Legend iconType="circle" iconSize={8} />
                  <Line type="monotone" dataKey="income"   stroke="#10B981" strokeWidth={2.5} dot={{ r: 4 }} name="Incomes"  />
                  <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2.5} dot={{ r: 4 }} name="Expenses" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            <div>
              <h3 className="text-xl font-black text-gray-700 mb-4" style={{ fontFamily: "'Instrument Serif', serif" }}>
                Expense Distribution
              </h3>
              {expenseBreakdown.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-sm text-gray-400">
                  No expense data for this period
                </div>
              ) : (
                <div className="flex gap-6">
                  <ResponsiveContainer width={180} height={180}>
                    <PieChart>
                      <Pie data={expenseBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                        dataKey="amount" paddingAngle={3}>
                        {expenseBreakdown.map((_, i) => (
                          // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => typeof v === "number" ? formatINR(v) : v}
                        contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb" }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2.5 self-center">
                    {expenseBreakdown.slice(0, 6).map((item, i) => {
                      const Icon = CATEGORY_ICONS[item.category] ?? Gift;
                      return (
                        <div key={item.category} className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] + "20" }}>
                            <Icon style={{ width: 14, height: 14, color: PIE_COLORS[i % PIE_COLORS.length] }} />
                          </div>
                          <span className="text-sm text-gray-600 capitalize flex-1 truncate">
                            {item.category.replace(/_/g, " ")}
                          </span>
                          <span className="text-sm font-bold text-gray-700 shrink-0">
                            {item.percentage.toFixed(2).replace(".", ",")}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Spending + Income Sources */}
        <div className="grid grid-cols-2 gap-4">
          {/* Top Spending */}
          <div className="bg-gray-50 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-gray-900">Top Spending Categories</h3>
              <Select defaultValue="last_month">
                <SelectTrigger className="w-36 rounded-xl bg-white border-gray-200 h-9 text-xs">
                  <SelectValue>Last Month</SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              {expenseBreakdown.slice(0, 4).map((item, i) => {
                const Icon = CATEGORY_ICONS[item.category] ?? Gift;
                const bgColors = ["bg-red-100","bg-green-100","bg-blue-100","bg-pink-100"];
                const iconColors = ["text-red-500","text-green-600","text-blue-500","text-pink-500"];
                return (
                  <div key={item.category} className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                    <div className={`w-11 h-11 rounded-xl ${bgColors[i % bgColors.length]} flex items-center justify-center shrink-0`}>
                      <Icon style={{ width: 20, height: 20 }} className={iconColors[i % iconColors.length]} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-gray-900 capitalize">{item.category.replace(/_/g, " ")}</p>
                      <p className="text-xs text-gray-400">{item.count} Transactions</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-gray-900">{formatINR(item.amount)}</p>
                      <p className="text-xs font-semibold text-red-500">{item.percentage.toFixed(1)}% of Total</p>
                    </div>
                  </div>
                );
              })}
              {expenseBreakdown.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No expenses this period</p>
              )}
            </div>
          </div>

          {/* Income Sources */}
          <div className="bg-gray-50 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-gray-900">Income Sources</h3>
              <Select defaultValue="last_month">
                <SelectTrigger className="w-36 rounded-xl bg-white border-gray-200 h-9 text-xs">
                  <SelectValue>Last Month</SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              {incomeBreakdown.slice(0, 4).map((item, i) => {
                const Icon = CATEGORY_ICONS[item.category] ?? TrendingUp;
                const bgColors = ["bg-green-100","bg-blue-100","bg-pink-100","bg-yellow-100"];
                const iconColors = ["text-green-600","text-blue-500","text-pink-500","text-yellow-600"];
                return (
                  <div key={item.category} className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                    <div className={`w-11 h-11 rounded-xl ${bgColors[i % bgColors.length]} flex items-center justify-center shrink-0`}>
                      <Icon style={{ width: 20, height: 20 }} className={iconColors[i % iconColors.length]} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-gray-900 capitalize">{item.category.replace(/_/g, " ")}</p>
                      <p className="text-xs text-gray-400">{item.category === "salary" ? "Monthly Income" : item.category === "freelance" ? "Project Work" : "Dividends & returns"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-green-600">+{formatINR(item.amount)}</p>
                      <p className="text-xs text-gray-400">{item.percentage.toFixed(1)}% of Income</p>
                    </div>
                  </div>
                );
              })}
              {incomeBreakdown.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No income this period</p>
              )}
            </div>
          </div>
        </div>

        {/* Analytics Stats */}
        {analytics && (
          <div className="grid grid-cols-4 gap-4">
            {[
              {
                label: "Average Weekly Spend",
                value: formatINR(analytics.avgWeeklySpend),
                badge: "Weekly",
                badgeColor: "bg-blue-100 text-blue-600",
                icon: Calendar,
                iconColor: "text-blue-500",
                sub: `${analytics.weeklyChange > 0 ? "↑" : "↓"}${Math.abs(analytics.weeklyChange).toFixed(0)}% From Last Week`,
                subColor: analytics.weeklyChange > 0 ? "text-red-500" : "text-green-500",
              },
              {
                label: "Most Active Day",
                value: analytics.mostActiveDay,
                badge: "Peak Time",
                badgeColor: "bg-purple-100 text-purple-600",
                icon: Clock,
                iconColor: "text-purple-500",
                sub: "28% of Transactions",
                subColor: "text-gray-400",
              },
              {
                label: "Avg Transaction",
                value: formatINR(analytics.avgTransaction),
                badge: "Avg",
                badgeColor: "bg-green-100 text-green-600",
                icon: CreditCard,
                iconColor: "text-green-500",
                sub: `${analytics.totalTransactions} Transactions`,
                subColor: "text-gray-400",
              },
              {
                label: "Savings Rate",
                value: `${analytics.savingsRate.toFixed(1)}%`,
                badge: "Rate",
                badgeColor: "bg-red-100 text-red-500",
                icon: TrendingUp,
                iconColor: "text-red-500",
                sub: `↑${analytics.savingsRateChange}% From Last Month`,
                subColor: "text-green-500",
              },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <stat.icon className={`w-8 h-8 ${stat.iconColor}`} />
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${stat.badgeColor}`}>
                    {stat.badge}
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-medium mb-1">{stat.label}</p>
                <p className="text-xl font-black text-gray-900">{stat.value}</p>
                <p className={`text-[11px] font-semibold mt-1 ${stat.subColor}`}>{stat.sub}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export Dialog */}
      <Dialog open={showExport} onOpenChange={v => { if (!v) setShowExport(false); }}>
        <DialogContent className="sm:max-w-sm rounded-3xl border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Export Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
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

            {/* --- UPDATED FORMAT BUTTONS (2x2 Grid for 4 items) --- */}
            <div className="grid grid-cols-2 gap-3">
              {(["csv","json","pdf","excel"] as const).map(fmt => (
                <button key={fmt} type="button" onClick={() => setExportFormat(fmt)}
                  className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 py-5 transition font-semibold text-sm ${
                    exportFormat === fmt ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"
                  }`}>
                  <span className="text-2xl">
                    {fmt === "csv" ? "📊" : fmt === "json" ? "📄" : fmt === "pdf" ? "📑" : "📗"}
                  </span>
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={() => setShowExport(false)}
                className="flex-1 rounded-xl h-12 text-sm font-bold border-gray-200">Cancel</Button>
              <Button onClick={handleExport} disabled={exporting}
                className="flex-1 rounded-xl h-12 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50">
                {exporting ? "Preparing..." : "Download"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}