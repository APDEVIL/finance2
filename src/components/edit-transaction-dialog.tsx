"use client";
import { useState, useEffect } from "react";
import { api } from "@/trpc/react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ALL_CATEGORIES = [
  { value: "salary",         label: "Salary"         },
  { value: "freelance",      label: "Freelance"      },
  { value: "investment",     label: "Investment"     },
  { value: "other_income",   label: "Other Income"   },
  { value: "groceries",      label: "Groceries"      },
  { value: "dining_out",     label: "Dining Out"     },
  { value: "transportation", label: "Transportation" },
  { value: "utilities",      label: "Utilities"      },
  { value: "entertainment",  label: "Entertainment"  },
  { value: "healthcare",     label: "Healthcare"     },
  { value: "shopping",       label: "Shopping"       },
  { value: "education",      label: "Education"      },
  { value: "rent",           label: "Rent"           },
  { value: "travel",         label: "Travel"         },
  { value: "other_expense",  label: "Other Expense"  },
];

type Transaction = {
  id: string; type: "income" | "expense"; amount: number;
  category: string; description: string; notes: string | null; date: string;
};

export function EditTransactionDialog({
  transaction, open, onClose, onSuccess,
}: { transaction: Transaction | null; open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ amount: "", category: "", date: "", notes: "", description: "" });
  const utils = api.useUtils();

  useEffect(() => {
    if (transaction) {
      setForm({
        amount:      transaction.amount.toString(),
        category:    transaction.category,
        date:        transaction.date,
        notes:       transaction.notes ?? "",
        description: transaction.description,
      });
    }
  }, [transaction]);

  const update = api.transaction.update.useMutation({
    onSuccess: () => {
      void utils.transaction.list.invalidate();
      void utils.transaction.summary.invalidate();
      onSuccess();
      onClose();
    },
  });

  function handleSubmit() {
    if (!transaction) return;
    update.mutate({
      id:          transaction.id,
      amount:      parseFloat(form.amount),
      category:    form.category as any,
      description: form.description,
      notes:       form.notes || undefined,
      date:        form.date,
    });
  }

  const isExpense = transaction?.type === "expense";

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md rounded-3xl border-0 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-gray-900">
            Edit {isExpense ? "Expense" : "Income"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            {/** biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
<label className="block text-sm font-bold text-gray-700 mb-1.5">Description</label>
            <input type="text"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-teal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 transition"
            />
          </div>
          <div>
            {/** biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
<label className="block text-sm font-bold text-gray-700 mb-1.5">Amount</label>
            <input type="number" min="0" step="0.01"
              value={form.amount}
              onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-teal-400 focus:bg-white focus:outline-none transition"
            />
          </div>
          <div>
            <Select value={form.category} onValueChange={val => setForm(p => ({ ...p, category: val }))}>
              <SelectTrigger className="w-full rounded-xl border-gray-200 bg-gray-50 h-12 text-sm">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {ALL_CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <input type="date"
              value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-teal-400 focus:bg-white focus:outline-none transition"
            />
          </div>
          <div>
            <textarea placeholder="Notes (optional)" rows={2}
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-teal-400 focus:bg-white focus:outline-none transition resize-none"
            />
          </div>
          {update.error && <p className="text-sm text-red-500">{update.error.message}</p>}
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={onClose}
              className="flex-1 rounded-xl h-12 text-sm font-bold border-gray-200">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={update.isPending}
              className="flex-1 rounded-xl h-12 text-sm font-bold text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-50">
              {update.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}