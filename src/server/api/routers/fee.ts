import { eq } from "drizzle-orm";
import { z } from "zod";
import { createId } from "~/lib/utils";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { feeData, sizes } from "~/server/db/schema";
import type { RouterOutputs } from "~/trpc/shared";
import { db, schema } from "~/server/db";

export const feeRouter = createTRPCRouter({
  getByStore: publicProcedure
    .input(z.object({
      id: z.string()
    }))
    .query(async ({ ctx, input }) => {
      const result = ctx.db.query.feeData.findMany({
        where: eq(schema.feeData.localId, input.id),
        with: {
          store: true,
        },
        orderBy: (feeData, { desc }) => [desc(feeData.identifier)],
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
      const channel = await db.query.feeData.findFirst({
        where: eq(schema.feeData.identifier, input.id),
        with: {
          store: true,
        },
      });

      return channel;
    }),
  getBySize: publicProcedure
    .input(
      z.object({
        idSize: z.number(),
      }),
    )
    .query(async ({ input }) => {
      const channel = await db.query.feeData.findFirst({
        where: eq(schema.feeData.size, input.idSize),
        with: {
          store: true,
        },
      });

      return channel;
    }),
  create: publicProcedure
    .input(
      z.object({
        description: z.string().min(0).max(1023).nullable().optional(),
        value: z.number().nullable().optional(),
        coin: z.string().nullable().optional(),
        size: z.number().nullable().optional(),
        discount: z.number().nullable().optional(),
        localId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: verificar permisos

      const identifier = createId();

      await db.insert(schema.feeData).values({
        identifier,
        description: input.description,
        coin: input.coin,
        value: input.value,
        size: input.size,
        discount: input.discount,
        localId: input.localId,
      });

      return { identifier };
    }),
  change: publicProcedure
    .input(
      z.object({
        identifier: z.string(),
        description: z.string().min(0).max(1023).nullable(),
        value: z.number().nullable(),
        coin: z.string().nullable(),
        size: z.number().nullable(),
        discount: z.number().nullable(),
      }),
    )
    .mutation(({ ctx, input }) => {
      return ctx.db
        .update(feeData)
        .set({
          description: input.description,
          value: input.value,
          coin: input.coin,
          size: input.size,
          discount: input.discount,
        })
        .where(eq(feeData.identifier, input.identifier));
    }),

  delete: publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(schema.feeData)
        .where(eq(schema.feeData.identifier, input.id));

      await ctx.db
        .update(sizes)
        .set({ tarifa: null })
        .where(eq(sizes.tarifa, input.id));
    }),
});

export type Fee = RouterOutputs["fee"]["getByStore"][number];
