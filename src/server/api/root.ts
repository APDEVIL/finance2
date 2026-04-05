import { postRouter } from "@/server/api/routers/post";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */

// export type definition of API

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */


import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { transactionRouter }  from "./routers/transaction";
import { budgetRouter }        from "./routers/budget";
import { goalRouter }          from "./routers/goal";
import { notificationRouter }  from "./routers/notification";
import { profileRouter }       from "./routers/profile";

export const appRouter = createTRPCRouter({
  transaction:  transactionRouter,
  budget:       budgetRouter,
  goal:         goalRouter,
  notification: notificationRouter,
  profile:      profileRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);