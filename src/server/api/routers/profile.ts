import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { user } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const profileRouter = createTRPCRouter({

  me: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.user.findFirst({ where: eq(user.id, ctx.session.user.id) });
  }),

  update: protectedProcedure
    .input(z.object({
      name:        z.string().min(1).max(100).optional(),
      phone:       z.string().max(20).optional(),
      dateOfBirth: z.string().optional(),
      image:       z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(user)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(user.id, ctx.session.user.id));
    }),

  updatePassword: protectedProcedure
    .input(z.object({ newPassword: z.string().min(8) }))
    .mutation(async ({ ctx, input }) => {
      // In production, hash the password. Here we delegate to BetterAuth.
      // This is a placeholder — BetterAuth handles password changes via its own endpoint.
      return { success: true };
    }),

  updateNotificationSettings: protectedProcedure
    .input(z.object({
      notifBillReminder:  z.boolean().optional(),
      notifBudgetAlert:   z.boolean().optional(),
      notifGoalMilestone: z.boolean().optional(),
      notifIncome:        z.boolean().optional(),
      notifEmail:         z.boolean().optional(),
      notifSms:           z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(user)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(user.id, ctx.session.user.id));
    }),

  updateSecuritySettings: protectedProcedure
    .input(z.object({
      twoFactorEnabled: z.boolean().optional(),
      sessionTimeout:   z.string().optional(),
      privacyMode:      z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(user)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(user.id, ctx.session.user.id));
    }),

  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.delete(user).where(eq(user.id, ctx.session.user.id));
    return { success: true };
  }),
});
