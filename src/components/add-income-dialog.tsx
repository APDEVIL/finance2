"use client";
import { useState } from "react";
import { api } from "@/trpc/react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const INCOME_CATEGORIES = [
  { value: "salary",       label: "Salary"       },
  { value: "freelance",    label: "Freelance"    },
  { value: "investment",   label: "Investment"   },
  { value: "other_income", label: "Other Income" },
];

export function AddIncomeDialog({
  open, onClose, onSuccess,
}: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ amount: "", category: "", date: "", notes: "", description: "" });
  const utils = api.useUtils();

  const add = api.transaction.add.useMutation({
    onSuccess: () => {
      void utils.transaction.list.invalidate();
      void utils.transaction.summary.invalidate();
      onSuccess();
      onClose();
      setForm({ amount: "", category: "", date: "", notes: "", description: "" });
    },
  });

  function handleSubmit() {
    if (!form.amount || !form.category || !form.date) return;
    add.mutate({
      type: "income",
      amount: parseFloat(form.amount),
      category: form.category as any,
      description: form.description || form.category.replace(/_/g, " "),
      notes: form.notes || undefined,
      date: form.date,
    });
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md rounded-3xl border-0 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-gray-900">Add Income</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            {/** biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
<label className="block text-sm font-bold text-gray-700 mb-1.5">Amount</label>
            <input
              type="number" min="0" step="0.01"
              placeholder="Enter Money (eg: ₹00)"
              value={form.amount}
              onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-green-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-100 transition"
            />
          </div>

          <div>
            {/** biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
<label className="block text-sm font-bold text-gray-700 mb-1.5">Category</label>
            <Select onValueChange={val => setForm(p => ({ ...p, category: val }))}>
              <SelectTrigger className="w-full rounded-xl border-gray-200 bg-gray-50 h-12 text-sm">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {INCOME_CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            {/** biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
<label className="block text-sm font-bold text-gray-700 mb-1.5">Date</label>
            <input type="date"
              value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-green-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-100 transition"
            />
          </div>

          <div>
            {/** biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
<label className="block text-sm font-bold text-gray-700 mb-1.5">Notes (Optional)</label>
            <textarea
              placeholder="Add the note about the income"
              rows={3}
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-green-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-100 transition resize-none"
            />
          </div>

          {add.error && <p className="text-sm text-red-500">{add.error.message}</p>}

          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={onClose}
              className="flex-1 rounded-xl h-12 text-sm font-bold border-gray-200 text-gray-600 hover:bg-gray-50">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={add.isPending || !form.amount || !form.category || !form.date}
              className="flex-1 rounded-xl h-12 text-sm font-bold text-white bg-green-600 hover:bg-green-500 disabled:opacity-50">
              {add.isPending ? "Adding..." : "Add Income"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
