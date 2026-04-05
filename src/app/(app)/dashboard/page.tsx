// src/app/(app)/dashboard/page.tsx
"use client";
import { useState } from "react";
import { api } from "@/trpc/react";
import {
  TrendingUp, TrendingDown, Wallet, PiggyBank,
  MinusCircle, PlusCircle, ShoppingCart, Car, UtensilsCrossed,
  Plane, Shield,
} from "lucide-react";
import { AddExpenseDialog } from "@/components/add-expense-dialog";
import { AddIncomeDialog  } from "@/components/add-income-dialog";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";

const CATEGORY_ICONS: Record<string, any> = {
  groceries: ShoppingCart,
  transportation: Car,
  dining_out: UtensilsCrossed,
  travel: Plane,
  utilities: Shield,
};

const GOAL_COLORS = ["bg-blue-500", "bg-purple-500", "bg-teal-500", "bg-pink-500", "bg-orange-500"];
const BUDGET_COLORS: Record<number, string> = {
  0: "bg-green-500",
  70: "bg-yellow-500",
  90: "bg-red-500",
};

function getBudgetColor(pct: number) {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 70) return "bg-yellow-500";
  return "bg-green-500";
}

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export default function DashboardPage() {
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddIncome,  setShowAddIncome]  = useState(false);

  const { data: summary } = api.transaction.summary.useQuery();
  const { data: budgets = [] } = api.budget.list.useQuery();
  const { data: goals   = [] } = api.goal.list.useQuery();
  const { data: profile }     = api.profile.me.useQuery();

  const utils = api.useUtils();
  function refetchAll() {
    void utils.transaction.summary.invalidate();
    void utils.budget.list.invalidate();
  }

  const statCards = [
    {
      label: "Total Income",
      value: summary?.totalIncome ?? 0,
      icon: TrendingUp,
      iconBg: "bg-green-50",
      iconColor: "text-green-500",
      trend: "up",
    },
    {
      label: "Total Expenses",
      value: summary?.totalExpenses ?? 0,
      icon: TrendingDown,
      iconBg: "bg-red-50",
      iconColor: "text-red-500",
      trend: "down",
    },
    {
      label: "Current Balance",
      value: summary?.currentBalance ?? 0,
      icon: Wallet,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-500",
      trend: "neutral",
    },
    {
      label: "Savings Goals",
      value: summary?.savingsGoals ?? 0,
      icon: PiggyBank,
      iconBg: "bg-purple-50",
      iconColor: "text-purple-500",
      trend: "up",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Page Header */}
      <div className="border-b border-gray-100 bg-white px-8 py-5">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Welcome back{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}. Here&apos;s your financial overview.
        </p>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-4">
          {statCards.map(card => (
            <div key={card.label}
              className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center shrink-0`}>
                  <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 font-medium">{card.label}</p>
                  <p className={`text-xl font-bold mt-0.5 ${
                    profile?.privacyMode ? "blur-sm select-none" : ""
                  } ${card.label === "Total Income" ? "text-green-600" :
                     card.label === "Total Expenses" ? "text-red-500" :
                     "text-gray-900"}`}>
                    {formatINR(card.value)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button type="button" onClick={() => setShowAddExpense(true)}
            className="rounded-2xl p-5 flex items-center justify-between text-white font-bold text-xl shadow-md hover:shadow-lg transition-all active:scale-[0.99]"
            style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}>
            <div>
              <p className="text-sm font-medium opacity-80 mb-1">Quick Action</p>
              <p className="text-2xl font-black">Add Expenses</p>
            </div>
            <MinusCircle className="w-12 h-12 opacity-90" />
          </button>
          <button type="button" onClick={() => setShowAddIncome(true)}
            className="rounded-2xl p-5 flex items-center justify-between text-white font-bold text-xl shadow-md hover:shadow-lg transition-all active:scale-[0.99]"
            style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}>
            <div>
              <p className="text-sm font-medium opacity-80 mb-1">Quick Action</p>
              <p className="text-2xl font-black">Add Income</p>
            </div>
            <PlusCircle className="w-12 h-12 opacity-90" />
          </button>
        </div>

        {/* Budget Tracking + Savings Goals */}
        <div className="grid grid-cols-2 gap-4">
          {/* Budget Tracking */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">Budget Tracking</h2>
              <Link href="/budget-goals" className="text-sm text-teal-600 font-semibold hover:underline">
                View All
              </Link>
            </div>
            {budgets.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <p className="text-sm text-gray-400">No budgets set yet.</p>
                <Link href="/budget-goals" className="mt-2 text-xs text-teal-600 font-semibold hover:underline">
                  Add your first budget →
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {budgets.slice(0, 3).map(b => {
                  const Icon = CATEGORY_ICONS[b.category] ?? ShoppingCart;
                  const pct  = Math.min(b.percentage, 100);
                  return (
                    <div key={b.id}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {b.category.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${getBudgetColor(pct)}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Savings Goals Progress */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">Saving Goals Progress</h2>
              <Link href="/budget-goals" className="text-sm text-teal-600 font-semibold hover:underline">
                View All
              </Link>
            </div>
            {goals.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <p className="text-sm text-gray-400">No savings goals set yet.</p>
                <Link href="/budget-goals" className="mt-2 text-xs text-teal-600 font-semibold hover:underline">
                  Add your first goal →
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {goals.slice(0, 3).map((g, i) => {
                  const pct   = g.targetAmount > 0 ? Math.min((g.savedAmount / g.targetAmount) * 100, 100) : 0;
                  const color = GOAL_COLORS[i % GOAL_COLORS.length]!;
                  const GoalIcon = g.name.toLowerCase().includes("vacation") ? Plane
                    : g.name.toLowerCase().includes("emergency") ? Shield
                    : PiggyBank;
                  return (
                    <div key={g.id} className="rounded-xl border border-gray-100 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <GoalIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-semibold text-gray-800">{g.name}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${color}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <AddExpenseDialog open={showAddExpense} onClose={() => setShowAddExpense(false)} onSuccess={refetchAll} />
      <AddIncomeDialog  open={showAddIncome}  onClose={() => setShowAddIncome(false)}  onSuccess={refetchAll} />
    </div>
  );
}