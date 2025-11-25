import { trpcTienePermisoCtx } from "~/lib/roles";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { db, schema } from "~/server/db";
import { desc } from "drizzle-orm";

export const logsRouter = createTRPCRouter({
  listRecent: protectedProcedure
    .query(async ({ ctx, input }) => {
      await trpcTienePermisoCtx(ctx, "panel:logs");
      const res = await db.query.errorLogs.findMany({
        limit: 500,
        orderBy: desc(schema.errorLogs.id),
      });

      return res;
    }),
})