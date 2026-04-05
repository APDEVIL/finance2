"use client";
import { useState } from "react";
import { api } from "@/trpc/react";
import { TrendingUp, TrendingDown, Pencil, Trash2, MinusCircle, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddExpenseDialog } from "@/components/add-expense-dialog";
import { AddIncomeDialog  } from "@/components/add-income-dialog";
import { EditTransactionDialog } from "@/components/edit-transaction-dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const CATEGORIES = [
  { value: "all",            label: "All Categories"  },
  { value: "salary",         label: "Salary"          },
  { value: "freelance",      label: "Freelance"       },
  { value: "groceries",      label: "Groceries"       },
  { value: "dining_out",     label: "Dining"          },
  { value: "transportation", label: "Transportation"  },
  { value: "utilities",      label: "Utilities"       },
  { value: "entertainment",  label: "Entertainment"   },
  { value: "healthcare",     label: "Healthcare"      },
  { value: "shopping",       label: "Shopping"        },
  { value: "travel",         label: "Travel"          },
  { value: "other_expense",  label: "Other"           },
];

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(amount);
}

export default function TransactionsPage() {
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddIncome,  setShowAddIncome]  = useState(false);
  const [editTxn,        setEditTxn]        = useState<any>(null);
  const [deleteTxnId,    setDeleteTxnId]    = useState<string | null>(null);
  const [category,       setCategory]       = useState("all");
  const [dateFilter,     setDateFilter]     = useState("");

  const utils = api.useUtils();
  const { data: transactions = [] } = api.transaction.list.useQuery({
    category,
    dateFrom: dateFilter || undefined,
  });

  const deleteMutation = api.transaction.delete.useMutation({
    onSuccess: () => {
      void utils.transaction.list.invalidate();
      void utils.transaction.summary.invalidate();
      setDeleteTxnId(null);
    },
  });

  function refetch() {
    void utils.transaction.list.invalidate();
    void utils.transaction.summary.invalidate();
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="border-b border-gray-100 bg-white px-8 py-5">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage your income and expenses</p>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* Action bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <button type="button" onClick={() => setShowAddExpense(true)}
            className="flex items-center gap-2.5 rounded-2xl px-6 py-3 text-white font-bold text-sm shadow-md hover:shadow-lg transition"
            style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}>
            <MinusCircle className="w-5 h-5" />
            Add Expenses
          </button>
          <button type="button" onClick={() => setShowAddIncome(true)}
            className="flex items-center gap-2.5 rounded-2xl px-6 py-3 text-white font-bold text-sm shadow-md hover:shadow-lg transition"
            style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}>
            <PlusCircle className="w-5 h-5" />
            Add Income
          </button>
          <div className="ml-auto flex items-center gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-44 rounded-xl border-gray-200 bg-white h-10 text-sm shadow-sm">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm h-10 shadow-sm focus:border-teal-400 focus:outline-none" />
          </div>
        </div>

        {/* Transactions table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Date","Description","Category","Type","Amount","Actions"].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-sm text-gray-400">
                    No transactions yet. Add your first one!
                  </td>
                </tr>
              ) : transactions.map(txn => (
                <tr key={txn.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">
                    {new Date(txn.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        txn.type === "income" ? "bg-green-50" : "bg-red-50"
                      }`}>
                        {txn.type === "income"
                          ? <TrendingUp className="w-4 h-4 text-green-500" />
                          : <TrendingDown className="w-4 h-4 text-red-500" />}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{txn.description}</p>
                        {txn.notes && <p className="text-xs text-gray-400 mt-0.5">{txn.notes}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-gray-700 capitalize">
                    {txn.category.replace(/_/g, " ")}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                      txn.type === "income"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-600"
                    }`}>
                      {txn.type === "income" ? "Income" : "Expense"}
                    </span>
                  </td>
                  <td className={`px-5 py-4 text-sm font-bold ${
                    txn.type === "income" ? "text-green-600" : "text-gray-800"
                  }`}>
                    {formatINR(txn.amount)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setEditTxn(txn)}
                        className="p-1.5 rounded-lg text-teal-500 hover:bg-teal-50 transition">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => setDeleteTxnId(txn.id)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AddExpenseDialog open={showAddExpense} onClose={() => setShowAddExpense(false)} onSuccess={refetch} />
      <AddIncomeDialog  open={showAddIncome}  onClose={() => setShowAddIncome(false)}  onSuccess={refetch} />
      <EditTransactionDialog transaction={editTxn} open={!!editTxn} onClose={() => setEditTxn(null)} onSuccess={refetch} />

      <AlertDialog open={!!deleteTxnId} onOpenChange={v => { if (!v) setDeleteTxnId(null); }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The transaction will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTxnId && deleteMutation.mutate({ id: deleteTxnId })}
              className="rounded-xl bg-red-600 hover:bg-red-500 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

