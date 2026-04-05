import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { savingsGoal, notification } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const goalRouter = createTRPCRouter({

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.savingsGoal.findMany({
      where: eq(savingsGoal.userId, ctx.session.user.id),
    });
  }),

  add: protectedProcedure
    .input(z.object({
      name:         z.string().min(1).max(100),
      targetAmount: z.number().positive(),
      targetDate:   z.string().optional(),
      priority:     z.enum(["high","medium","low"]).default("medium"),
      icon:         z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [goal] = await ctx.db.insert(savingsGoal).values({
        userId: ctx.session.user.id,
        ...input,
      }).returning();
      return goal;
    }),

  contribute: protectedProcedure
    .input(z.object({ id: z.string().uuid(), amount: z.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      const goal = await ctx.db.query.savingsGoal.findFirst({
        where: and(eq(savingsGoal.id, input.id), eq(savingsGoal.userId, ctx.session.user.id)),
      });
      if (!goal) throw new TRPCError({ code: "NOT_FOUND" });

      const newSaved = Math.min(goal.savedAmount + input.amount, goal.targetAmount);
      await ctx.db.update(savingsGoal)
        .set({ savedAmount: newSaved, updatedAt: new Date() })
        .where(eq(savingsGoal.id, input.id));

      const pct = (newSaved / goal.targetAmount) * 100;
      if (pct >= 100) {
        await ctx.db.insert(notification).values({
          userId: ctx.session.user.id,
          type: "goal_milestone",
          title: `Goal Achieved: ${goal.name}! 🎉`,
          body: `Congratulations! You've reached your ${goal.name} goal of ₹${goal.targetAmount.toFixed(0)}`,
        });
      } else if (pct >= 75 && pct < 80) {
        await ctx.db.insert(notification).values({
          userId: ctx.session.user.id,
          type: "goal_milestone",
          title: `Goal Milestone: ${goal.name}`,
          body: `You've reached 75% of your ${goal.name} goal. Only ₹${(goal.targetAmount - newSaved).toFixed(0)} to go!`,
        });
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.savingsGoal.findFirst({
        where: and(eq(savingsGoal.id, input.id), eq(savingsGoal.userId, ctx.session.user.id)),
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.delete(savingsGoal).where(eq(savingsGoal.id, input.id));
    }),
});
