import { initTRPC, TRPCError } from "@trpc/server";
import { type NextRequest } from "next/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { auth } from "@/server/better-auth/config";
import { db } from "@/server/db";

export const createTRPCContext = async (
  p0: unknown,
  opts: { req: NextRequest | { headers: Headers } }
) => {
  const session = await auth.api.getSession({ headers: new Headers(opts.req.headers) });
  return { db, session };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter    = t.router;
export const publicProcedure     = t.procedure;
export const protectedProcedure  = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, session: ctx.session } });
});


