import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";
import { appRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc", req, router: appRouter,
    createContext: (p0) => createTRPCContext(p0, { req }),
    onError: process.env.NODE_ENV === "development"
      ? ({ path, error }) => console.error(`❌ tRPC on ${path}: ${error.message}`)
      : undefined,
  });

export { handler as GET, handler as POST };


