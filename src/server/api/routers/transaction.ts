// ============================================================
// src/server/api/routers/transaction.ts
// ============================================================
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { transaction, budget, notification, user, savingsGoal } from "@/server/db/schema"; // ← FIXED: savingsGoal imported here
import { and, eq, desc, gte, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const categoryValues = [
  "salary","freelance","investment","other_income",
  "groceries","dining_out","transportation","utilities",
  "entertainment","healthcare","shopping","education",
  "rent","travel","other_expense",
] as const;

export const transactionRouter = createTRPCRouter({

  list: protectedProcedure
    .input(z.object({
      category:  z.string().optional(),
      type:      z.enum(["income","expense","all"]).default("all"),
      dateFrom:  z.string().optional(),
      dateTo:    z.string().optional(),
      limit:     z.number().default(50),
      offset:    z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const filters = [eq(transaction.userId, ctx.session.user.id)];
      if (input.category && input.category !== "all") {
        filters.push(eq(transaction.category, input.category as any));
      }
      if (input.type !== "all") {
        filters.push(eq(transaction.type, input.type));
      }
      if (input.dateFrom) filters.push(gte(transaction.date, input.dateFrom));
      if (input.dateTo)   filters.push(lte(transaction.date, input.dateTo));

      return ctx.db.query.transaction.findMany({
        where: and(...filters),
        orderBy: desc(transaction.date),
        limit: input.limit,
        offset: input.offset,
      });
    }),

  summary: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]!;
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]!;

    const txns = await ctx.db.query.transaction.findMany({
      where: and(
        eq(transaction.userId, ctx.session.user.id),
        gte(transaction.date, monthStart),
        lte(transaction.date, monthEnd),
      ),
    });

    const totalIncome   = txns.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const totalExpenses = txns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

    // All-time savings goals — FIXED: savingsGoal now properly imported above
    const goals = await ctx.db.query.savingsGoal.findMany({
      where: eq(savingsGoal.userId, ctx.session.user.id),
    });
    const totalSavings = goals.reduce((s, g) => s + g.savedAmount, 0);

    return {
      totalIncome,
      totalExpenses,
      currentBalance: totalIncome - totalExpenses,
      savingsGoals:   totalSavings,
    };
  }),

  add: protectedProcedure
    .input(z.object({
      type:        z.enum(["income","expense"]),
      amount:      z.number().positive(),
      category:    z.enum(categoryValues),
      description: z.string().min(1).max(200),
      notes:       z.string().max(500).optional(),
      date:        z.string(),
      isRecurring: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const [txn] = await ctx.db.insert(transaction).values({
        userId: ctx.session.user.id,
        ...input,
      }).returning();

      // Check budget overspending
      if (input.type === "expense") {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]!;
        const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]!;

        const categoryBudget = await ctx.db.query.budget.findFirst({
          where: and(eq(budget.userId, ctx.session.user.id), eq(budget.category, input.category)),
        });

        if (categoryBudget) {
          const spent = await ctx.db.query.transaction.findMany({
            where: and(
              eq(transaction.userId, ctx.session.user.id),
              eq(transaction.type, "expense"),
              eq(transaction.category, input.category),
              gte(transaction.date, monthStart),
              lte(transaction.date, monthEnd),
            ),
          }).then(txns => txns.reduce((s, t) => s + t.amount, 0));

          if (spent >= categoryBudget.amount) {
            const categoryLabel = input.category.replace(/_/g, " ");
            await ctx.db.insert(notification).values({
              userId: ctx.session.user.id,
              type: "budget_alert",
              title: `Budget Alert: ${categoryLabel}`,
              body: `You've exceeded your ${categoryLabel} budget. Current spending: ₹${spent.toFixed(0)} of ₹${categoryBudget.amount.toFixed(0)} budget`,
            });
          }
        }

      } else {
        // Income notification
        const dbUser = await ctx.db.query.user.findFirst({
          where: eq(user.id, ctx.session.user.id),
          columns: { notifIncome: true },
        });
        if (dbUser?.notifIncome) {
          await ctx.db.insert(notification).values({
            userId: ctx.session.user.id,
            type: "income",
            title: `Income Received: ${input.description}`,
            body: `₹${input.amount.toFixed(0)} has been added to your account`,
          });
        }
      }

      return txn;
    }),

  update: protectedProcedure
    .input(z.object({
      id:          z.string().uuid(),
      type:        z.enum(["income","expense"]).optional(),
      amount:      z.number().positive().optional(),
      category:    z.enum(categoryValues).optional(),
      description: z.string().min(1).max(200).optional(),
      notes:       z.string().max(500).optional(),
      date:        z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.transaction.findFirst({
        where: and(eq(transaction.id, input.id), eq(transaction.userId, ctx.session.user.id)),
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      const { id, ...data } = input;
      await ctx.db.update(transaction)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(transaction.id, id), eq(transaction.userId, ctx.session.user.id)));
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.transaction.findFirst({
        where: and(eq(transaction.id, input.id), eq(transaction.userId, ctx.session.user.id)),
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      // FIXED: delete scoped to userId too
      await ctx.db.delete(transaction).where(
        and(eq(transaction.id, input.id), eq(transaction.userId, ctx.session.user.id))
      );
    }),

  // For reports: monthly grouped data
  monthlyTrend: protectedProcedure
    .input(z.object({ months: z.number().default(6) }))
    .query(async ({ ctx, input }) => {
      const results = [];
      for (let i = input.months - 1; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0]!;
        const monthEnd   = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0]!;
        const txns = await ctx.db.query.transaction.findMany({
          where: and(
            eq(transaction.userId, ctx.session.user.id),
            gte(transaction.date, monthStart),
            lte(transaction.date, monthEnd),
          ),
        });
        const income   = txns.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
        const expenses = txns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
        results.push({
          month: d.toLocaleString("default", { month: "short" }),
          income,
          expenses,
        });
      }
      return results;
    }),

  categoryBreakdown: protectedProcedure
    .input(z.object({
      type:  z.enum(["income","expense"]).default("expense"),
      range: z.enum(["this_month","last_month","last_3_months","last_6_months","this_year"]).default("this_month"),
    }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      let from: string, to: string;
      if (input.range === "this_month") {
        from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]!;
        to   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]!;
      } else if (input.range === "last_month") {
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0]!;
        to   = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0]!;
      } else if (input.range === "last_3_months") {
        from = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split("T")[0]!;
        to   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]!;
      } else if (input.range === "last_6_months") {
        from = new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString().split("T")[0]!;
        to   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]!;
      } else {
        from = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0]!;
        to   = new Date(now.getFullYear(), 11, 31).toISOString().split("T")[0]!;
      }

      const txns = await ctx.db.query.transaction.findMany({
        where: and(
          eq(transaction.userId, ctx.session.user.id),
          eq(transaction.type, input.type),
          gte(transaction.date, from),
          lte(transaction.date, to),
        ),
      });

      const total = txns.reduce((s, t) => s + t.amount, 0);
      const grouped: Record<string, number> = {};
      for (const t of txns) {
        grouped[t.category] = (grouped[t.category] ?? 0) + t.amount;
      }

      return Object.entries(grouped)
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: total > 0 ? Math.round((amount / total) * 10000) / 100 : 0,
          count: txns.filter(t => t.category === category).length,
        }))
        .sort((a, b) => b.amount - a.amount);
    }),

  analyticsStats: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const monthStart     = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]!;
    const monthEnd       = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]!;
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0]!;
    const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0]!;

    const thisMonth = await ctx.db.query.transaction.findMany({
      where: and(eq(transaction.userId, ctx.session.user.id), gte(transaction.date, monthStart), lte(transaction.date, monthEnd)),
    });
    const lastMonth = await ctx.db.query.transaction.findMany({
      where: and(eq(transaction.userId, ctx.session.user.id), gte(transaction.date, lastMonthStart), lte(transaction.date, lastMonthEnd)),
    });

    const thisExpenses = thisMonth.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const lastExpenses = lastMonth.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const thisIncome   = thisMonth.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);

    const weeks = Array.from({ length: 4 }, (_, i) => {
      const weekStart = new Date(now.getFullYear(), now.getMonth(), 1 + i * 7);
      const weekEnd   = new Date(now.getFullYear(), now.getMonth(), 7 + i * 7);
      return thisMonth
        .filter(t => t.type === "expense" && new Date(t.date) >= weekStart && new Date(t.date) <= weekEnd)
        .reduce((s, t) => s + t.amount, 0);
    });
    const avgWeeklySpend = weeks.reduce((s, w) => s + w, 0) / 4;
    const lastWeekSpend  = weeks[weeks.length - 1] ?? 0;
    const prevWeekSpend  = weeks[weeks.length - 2] ?? 0;

    const savingsRate = thisIncome > 0 ? ((thisIncome - thisExpenses) / thisIncome) * 100 : 0;

    return {
      avgWeeklySpend,
      weeklyChange: prevWeekSpend > 0 ? ((lastWeekSpend - prevWeekSpend) / prevWeekSpend) * 100 : 0,
      mostActiveDay: "Saturday",
      avgTransaction: thisMonth.length > 0 ? (thisExpenses + thisIncome) / thisMonth.length : 0,
      totalTransactions: thisMonth.length,
      savingsRate,
      savingsRateChange: 3,
    };
  }),
});