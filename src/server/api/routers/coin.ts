import { eq } from "drizzle-orm";
import { z } from "zod";
import { createId } from "~/lib/utils";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { cities, coinData, feeData } from "~/server/db/schema";
import { RouterOutputs } from "~/trpc/shared";
import { db, schema } from "~/server/db";

export const coinRouter = createTRPCRouter({
  get: publicProcedure.query(({ ctx }) => {
    const result = ctx.db.query.coinData.findMany({
      orderBy: (coinData, { desc }) => [desc(coinData.identifier)],
    });
    return result;
  }),
  getById: publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const channel = await db.query.coinData.findFirst({
        where: eq(schema.coinData.identifier, input.id),
      });

      return channel;
    }),
  create: publicProcedure
    .input(
      z.object({
        description: z.string().min(0).max(1023).nullable(),
        value: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: verificar permisos

      const identifier = createId();

      await db.insert(schema.coinData).values({
        identifier,
        description: input.description,
        value: input.value,
      });

      return { identifier };
    }),
  change: publicProcedure
    .input(
      z.object({
        identifier: z.string(),
        description: z.string().min(0).max(1023).nullable(),
        value: z.number(),
      }),
    )
    .mutation(({ ctx, input }) => {
      return ctx.db
        .update(coinData)
        .set({ description: input.description, value: input.value })
        .where(eq(coinData.identifier, input.identifier));
    }),

  delete: publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(schema.coinData)
        .where(eq(schema.coinData.identifier, input.id));
    }),
});

export type Coin = RouterOutputs["coin"]["get"][number];
