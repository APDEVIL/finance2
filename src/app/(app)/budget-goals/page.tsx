"use client";
import { useState } from "react";
import { api } from "@/trpc/react";
import {
  ShoppingCart, Car, UtensilsCrossed, Zap, Gamepad2, HeartPulse,
  ShoppingBag, GraduationCap, Home, Plane, CircleDollarSign,
  PiggyBank, Shield, Trash2, PlusCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const BUDGET_CATEGORY_ICONS: Record<string, any> = {
  groceries: ShoppingCart,
  dining_out: UtensilsCrossed,
  transportation: Car,
  utilities: Zap,
  entertainment: Gamepad2,
  healthcare: HeartPulse,
  shopping: ShoppingBag,
  education: GraduationCap,
  rent: Home,
  travel: Plane,
  other_expense: CircleDollarSign,
};

const BUDGET_PROGRESS_COLORS = [
  "bg-pink-500","bg-teal-500","bg-yellow-500","bg-green-500",
  "bg-blue-500","bg-purple-500","bg-orange-500","bg-red-500",
];

function getBudgetBarColor(pct: number) {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 70) return "bg-yellow-500";
  return BUDGET_PROGRESS_COLORS[0];
}

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(amount);
}

const GOAL_COLORS = [
  "bg-blue-500","bg-purple-500","bg-teal-500","bg-pink-500","bg-orange-500",
];

export default function BudgetGoalsPage() {
  const [showAddBudget,  setShowAddBudget]  = useState(false);
  const [showAddGoal,    setShowAddGoal]    = useState(false);
  const [deleteBudgetId, setDeleteBudgetId] = useState<string | null>(null);
  const [deleteGoalId,   setDeleteGoalId]   = useState<string | null>(null);

  // ── NEW: contribute state ──
  const [contributeGoal, setContributeGoal] = useState<{ id: string; name: string; remaining: number } | null>(null);
  const [contributeAmount, setContributeAmount] = useState("");
  const [contributeError,  setContributeError]  = useState("");

  const [budgetForm, setBudgetForm] = useState({ category: "", amount: "", date: "" });
  const [goalForm,   setGoalForm]   = useState({ name: "", targetAmount: "", targetDate: "", priority: "high" });

  const utils = api.useUtils();
  const { data: budgets = [] } = api.budget.list.useQuery();
  const { data: goals   = [] } = api.goal.list.useQuery();

  const addBudget = api.budget.add.useMutation({
    onSuccess: () => {
      void utils.budget.list.invalidate();
      setShowAddBudget(false);
      setBudgetForm({ category: "", amount: "", date: "" });
    },
  });

  const addGoal = api.goal.add.useMutation({
    onSuccess: () => {
      void utils.goal.list.invalidate();
      setShowAddGoal(false);
      setGoalForm({ name: "", targetAmount: "", targetDate: "", priority: "high" });
    },
  });

  const deleteBudget = api.budget.delete.useMutation({
    onSuccess: () => { void utils.budget.list.invalidate(); setDeleteBudgetId(null); },
  });

  const deleteGoal = api.goal.delete.useMutation({
    onSuccess: () => { void utils.goal.list.invalidate(); setDeleteGoalId(null); },
  });

  // ── NEW: contribute mutation ──
  const contribute = api.goal.contribute.useMutation({
    onSuccess: () => {
      void utils.goal.list.invalidate();
      void utils.transaction.summary.invalidate();
      setContributeGoal(null);
      setContributeAmount("");
      setContributeError("");
    },
    onError: (err) => setContributeError(err.message),
  });

  function handleContribute() {
    if (!contributeGoal) return;
    const amt = parseFloat(contributeAmount);
    if (!amt || amt <= 0) { setContributeError("Enter a valid amount."); return; }
    if (amt > contributeGoal.remaining) {
      setContributeError(`Amount exceeds remaining ₹${contributeGoal.remaining.toFixed(0)}.`);
      return;
    }
    setContributeError("");
    contribute.mutate({ id: contributeGoal.id, amount: amt });
  }

  const EXPENSE_CATEGORIES = [
    { value: "groceries",      label: "Groceries"      },
    { value: "dining_out",     label: "Dining Out"     },
    { value: "transportation", label: "Transportation" },
    { value: "utilities",      label: "Utilities"      },
    { value: "entertainment",  label: "Entertainment"  },
    { value: "healthcare",     label: "Healthcare"     },
    { value: "shopping",       label: "Shopping"       },
    { value: "other_expense",  label: "Other"          },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="border-b border-gray-100 bg-white px-8 py-5">
        <h1 className="text-2xl font-bold text-gray-900">Budget &amp; Savings Goals</h1>
        <p className="text-sm text-gray-400 mt-0.5">Track your budgets and savings progress</p>
      </div>

      <div className="px-8 py-6 space-y-8">
        {/* Monthly Budget Tracking */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-gray-900">Monthly Budget Tracking</h2>
            <Button onClick={() => setShowAddBudget(true)}
              className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md">
              + Add Budget
            </Button>
          </div>
          {budgets.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center shadow-sm">
              <p className="text-sm text-gray-400">No budgets set. Add your first budget to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {budgets.map((b) => {
                const Icon = BUDGET_CATEGORY_ICONS[b.category] ?? CircleDollarSign;
                const pct  = Math.min(b.percentage, 100);
                const barColor = getBudgetBarColor(pct);
                const resetDate = b.resetDate ? new Date(b.resetDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Jan 1";
                return (
                  <div key={b.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-pink-50 flex items-center justify-center">
                          <Icon className="w-4.5 h-4.5 text-pink-500" style={{ width: 18, height: 18 }} />
                        </div>
                        <div>
                          <p className="font-black text-gray-900 text-base capitalize">
                            {b.category.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-gray-400">Monthly Budget</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => setDeleteBudgetId(b.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-red-400 hover:bg-red-50 transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex justify-between text-sm mt-3 mb-2">
                      <span className="font-bold text-gray-700">Spent: {formatINR(b.spent)}</span>
                      <span className="font-black text-gray-900">Budget: {formatINR(b.amount)}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-2">
                      <span>Period: {b.period === "monthly" ? "Monthly" : b.period}</span>
                      <span>Resets: {resetDate}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Saving Goals */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-gray-900">Saving Goals</h2>
            <Button onClick={() => setShowAddGoal(true)}
              className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md">
              + Add Goal
            </Button>
          </div>
          {goals.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center shadow-sm">
              <p className="text-sm text-gray-400">No savings goals yet. Set your first goal!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {goals.map((g, i) => {
                const pct   = g.targetAmount > 0 ? Math.min((g.savedAmount / g.targetAmount) * 100, 100) : 0;
                const color = GOAL_COLORS[i % GOAL_COLORS.length]!;
                const GoalIcon = g.name.toLowerCase().includes("vacation") ? Plane
                  : g.name.toLowerCase().includes("emergency") ? Shield
                  : PiggyBank;
                const resetDate = g.targetDate ? new Date(g.targetDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Jan 1";
                const remaining = Math.max(g.targetAmount - g.savedAmount, 0);
                const isComplete = pct >= 100;
                return (
                  <div key={g.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                          <GoalIcon className="w-4.5 h-4.5 text-blue-500" style={{ width: 18, height: 18 }} />
                        </div>
                        <div>
                          <p className="font-black text-gray-900 text-base">{g.name}</p>
                          <p className="text-xs text-gray-400 capitalize">{g.priority} priority</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => setDeleteGoalId(g.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-red-400 hover:bg-red-50 transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex justify-between text-sm mt-3 mb-2">
                      <span className="font-bold text-gray-700">Saved: {formatINR(g.savedAmount)}</span>
                      <span className="font-black text-gray-900">Target: {formatINR(g.targetAmount)}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-2">
                      <span>{pct.toFixed(0)}% complete</span>
                      <span>Target: {resetDate}</span>
                    </div>

                    {/* ── Fund Goal button ── */}
                    {!isComplete && (
                      <button
                        type="button"
                        onClick={() => {
                          setContributeGoal({ id: g.id, name: g.name, remaining });
                          setContributeAmount("");
                          setContributeError("");
                        }}
                        className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 py-2 text-xs font-bold text-blue-600 hover:bg-blue-100 transition">
                        <PlusCircle className="w-3.5 h-3.5" />
                        Fund Goal
                      </button>
                    )}
                    {isComplete && (
                      <div className="mt-3 w-full flex items-center justify-center rounded-xl bg-green-50 py-2 text-xs font-bold text-green-600">
                        🎉 Goal Achieved!
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Budget Dialog */}
      <Dialog open={showAddBudget} onOpenChange={v => { if (!v) setShowAddBudget(false); }}>
        <DialogContent className="sm:max-w-md rounded-3xl border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-900">Add Budget</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              {/** biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
<label className="block text-sm font-bold text-gray-700 mb-1.5">Category</label>
              <Select value={budgetForm.category} onValueChange={val => setBudgetForm(p => ({ ...p, category: val }))}>
                <SelectTrigger className="w-full rounded-xl border-gray-200 bg-gray-50 h-12 text-sm">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {EXPENSE_CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              {/** biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
<label className="block text-sm font-bold text-gray-700 mb-1.5">Budget Amount</label>
              <input type="number" min="0" step="0.01" placeholder="0.00"
                value={budgetForm.amount}
                onChange={e => setBudgetForm(p => ({ ...p, amount: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-blue-400 focus:bg-white focus:outline-none transition"
              />
            </div>
            <div>
              {/** biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
<label className="block text-sm font-bold text-gray-700 mb-1.5">Date</label>
              <input type="date"
                value={budgetForm.date}
                onChange={e => setBudgetForm(p => ({ ...p, date: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-blue-400 focus:bg-white focus:outline-none transition"
              />
            </div>
            {addBudget.error && <p className="text-sm text-red-500">{addBudget.error.message}</p>}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={() => setShowAddBudget(false)}
                className="flex-1 rounded-xl h-12 text-sm font-bold border-gray-200">Cancel</Button>
              <Button onClick={() => addBudget.mutate({ category: budgetForm.category, amount: parseFloat(budgetForm.amount), resetDate: budgetForm.date || undefined })}
                disabled={!budgetForm.category || !budgetForm.amount || addBudget.isPending}
                className="flex-1 rounded-xl h-12 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50">
                {addBudget.isPending ? "Adding..." : "Add Budget"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Goal Dialog */}
      <Dialog open={showAddGoal} onOpenChange={v => { if (!v) setShowAddGoal(false); }}>
        <DialogContent className="sm:max-w-md rounded-3xl border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-900">Add Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              {/** biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
<label className="block text-sm font-bold text-gray-700 mb-1.5">Goal Name</label>
              <input type="text" placeholder="e.g. Vacation Fund"
                value={goalForm.name}
                onChange={e => setGoalForm(p => ({ ...p, name: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-blue-400 focus:bg-white focus:outline-none transition"
              />
            </div>
            <div>
              {/** biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
<label className="block text-sm font-bold text-gray-700 mb-1.5">Target Amount</label>
              <input type="number" min="0" step="0.01" placeholder="0.00"
                value={goalForm.targetAmount}
                onChange={e => setGoalForm(p => ({ ...p, targetAmount: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-blue-400 focus:bg-white focus:outline-none transition"
              />
            </div>
            <div>
              {/** biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
<label className="block text-sm font-bold text-gray-700 mb-1.5">Target Date</label>
              <input type="date"
                value={goalForm.targetDate}
                onChange={e => setGoalForm(p => ({ ...p, targetDate: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-blue-400 focus:bg-white focus:outline-none transition"
              />
            </div>
            <div>
              {/** biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
<label className="block text-sm font-bold text-gray-700 mb-1.5">Priority</label>
              <Select value={goalForm.priority} onValueChange={val => setGoalForm(p => ({ ...p, priority: val }))}>
                <SelectTrigger className="w-full rounded-xl border-gray-200 bg-gray-50 h-12 text-sm">
                  <SelectValue placeholder="High Priority" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="low">Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {addGoal.error && <p className="text-sm text-red-500">{addGoal.error.message}</p>}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={() => setShowAddGoal(false)}
                className="flex-1 rounded-xl h-12 text-sm font-bold border-gray-200">Cancel</Button>
              <Button onClick={() => addGoal.mutate({ name: goalForm.name, targetAmount: parseFloat(goalForm.targetAmount), targetDate: goalForm.targetDate || undefined, priority: goalForm.priority as any })}
                disabled={!goalForm.name || !goalForm.targetAmount || addGoal.isPending}
                className="flex-1 rounded-xl h-12 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50">
                {addGoal.isPending ? "Adding..." : "Add Goal"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Fund Goal Dialog ── */}
      <Dialog open={!!contributeGoal} onOpenChange={v => { if (!v) { setContributeGoal(null); setContributeAmount(""); setContributeError(""); } }}>
        <DialogContent className="sm:max-w-sm rounded-3xl border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-900">
              Fund Goal — {contributeGoal?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-xs text-gray-400">
              Remaining to reach target:{" "}
              <span className="font-bold text-gray-700">
                {formatINR(contributeGoal?.remaining ?? 0)}
              </span>
            </p>
            <div>
              {/** biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
<label className="block text-sm font-bold text-gray-700 mb-1.5">Amount to Add</label>
              <input
                type="number" min="1" step="0.01" placeholder="Enter amount (e.g. ₹500)"
                value={contributeAmount}
                onChange={e => { setContributeAmount(e.target.value); setContributeError(""); }}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-blue-400 focus:bg-white focus:outline-none transition"
              />
            </div>
            {contributeError && <p className="text-sm text-red-500">{contributeError}</p>}
            <div className="flex gap-3 pt-1">
              <Button variant="outline"
                onClick={() => { setContributeGoal(null); setContributeAmount(""); setContributeError(""); }}
                className="flex-1 rounded-xl h-12 text-sm font-bold border-gray-200">
                Cancel
              </Button>
              <Button
                onClick={handleContribute}
                disabled={!contributeAmount || contribute.isPending}
                className="flex-1 rounded-xl h-12 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50">
                {contribute.isPending ? "Adding..." : "Add Funds"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Budget */}
      <AlertDialog open={!!deleteBudgetId} onOpenChange={v => { if (!v) setDeleteBudgetId(null); }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this budget.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteBudgetId && deleteBudget.mutate({ id: deleteBudgetId })}
              className="rounded-xl bg-red-600 hover:bg-red-500 text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Goal */}
      <AlertDialog open={!!deleteGoalId} onOpenChange={v => { if (!v) setDeleteGoalId(null); }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this savings goal.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteGoalId && deleteGoal.mutate({ id: deleteGoalId })}
              className="rounded-xl bg-red-600 hover:bg-red-500 text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}