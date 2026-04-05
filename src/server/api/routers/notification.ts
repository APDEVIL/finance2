import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { notification } from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";

export const notificationRouter = createTRPCRouter({

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.notification.findMany({
      where: eq(notification.userId, ctx.session.user.id),
      orderBy: desc(notification.createdAt),
      limit: 50,
    });
  }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const unread = await ctx.db.query.notification.findMany({
      where: and(eq(notification.userId, ctx.session.user.id), eq(notification.isRead, false)),
      columns: { id: true },
    });
    return unread.length;
  }),

  markRead: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(notification).set({ isRead: true }).where(eq(notification.id, input.id));
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.update(notification)
      .set({ isRead: true })
      .where(eq(notification.userId, ctx.session.user.id));
  }),

  dismiss: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(notification).where(eq(notification.id, input.id));
    }),
});

import { and } from "drizzle-orm";

