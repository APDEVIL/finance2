import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { budget, transaction, notification } from "@/server/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const budgetRouter = createTRPCRouter({

  list: protectedProcedure.query(async ({ ctx }) => {
    const budgets = await ctx.db.query.budget.findMany({
      where: eq(budget.userId, ctx.session.user.id),
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]!;
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]!;

    return Promise.all(budgets.map(async b => {
      const spent = await ctx.db.query.transaction.findMany({
        where: and(
          eq(transaction.userId, ctx.session.user.id),
          eq(transaction.type, "expense"),
          eq(transaction.category, b.category),
          gte(transaction.date, monthStart),
          lte(transaction.date, monthEnd),
        ),
      }).then(txns => txns.reduce((s, t) => s + t.amount, 0));

      return { ...b, spent, percentage: b.amount > 0 ? Math.min((spent / b.amount) * 100, 100) : 0 };
    }));
  }),

  add: protectedProcedure
    .input(z.object({
      category:  z.string(),
      amount:    z.number().positive(),
      period:    z.enum(["weekly","monthly","yearly"]).default("monthly"),
      resetDate: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [b] = await ctx.db.insert(budget).values({
        userId: ctx.session.user.id,
        category: input.category as any,
        amount: input.amount,
        period: input.period,
        resetDate: input.resetDate,
      }).returning();
      return b;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.budget.findFirst({
        where: and(eq(budget.id, input.id), eq(budget.userId, ctx.session.user.id)),
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.delete(budget).where(eq(budget.id, input.id));
    }),
});

