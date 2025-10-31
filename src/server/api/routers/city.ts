import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { createId } from "~/lib/utils";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { cities } from "~/server/db/schema";
import { RouterOutputs } from "~/trpc/shared";
import { db, schema } from "~/server/db";
import { trpcTienePermisoCtx } from "~/lib/roles";
import { PERMISO_ADMIN } from "~/lib/permisos";
import { trpcEntityJwtValidate } from "~/lib/entity";

export const cityRouter = createTRPCRouter({
  listNonEmpty: publicProcedure.query(({ ctx }) => {
    const result = ctx.db.query.cities.findMany({
      where: (table, { exists }) => exists(
        db.select()
          .from(schema.stores)
          .where(
            eq(schema.stores.cityId, table.identifier),
          )
      ),
      orderBy: (cities, { desc }) => [desc(cities.identifier)],
    });

    return result;
  }),

  listAll: protectedProcedure.query(({ ctx }) => {
    const result = ctx.db.query.cities.findMany({
      orderBy: (cities, { desc }) => [desc(cities.identifier)],
    });

    return result;
  }),

  listFromEntity: publicProcedure
    .input(z.object({
      entityId: z.string(),
      jwt: z.string().optional(),
    }))
    .query(async ({ input }) => {
      await trpcEntityJwtValidate(input.entityId, input.jwt);

      const result = await db.query.cities.findMany({
        where: (table, { exists }) => exists(
          db.select()
            .from(schema.stores)
            .where(and(
              eq(schema.stores.cityId, table.identifier),
              eq(schema.stores.entidadId, input.entityId),
            ))
        ),
        orderBy: (cities, { desc }) => [desc(cities.identifier)],
      });

      return result;
    }),

  getCity: publicProcedure.input(z.string()).query(({ ctx, input }) => {
    return ctx.db.query.cities.findFirst({
      where: eq(cities.identifier, input),
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(0).max(1023),
        description: z.string().min(0).max(1023),
        image: z.string().min(0).max(1023),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await trpcTienePermisoCtx(ctx, PERMISO_ADMIN);

      const identifier = createId();

      await db.insert(schema.cities).values({
        identifier,
        name: input.name,
        description: input.description,
        image: input.image,
      });

      return { identifier };
    }),
  getById: protectedProcedure
    .input(
      z.object({
        cityId: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      await trpcTienePermisoCtx(ctx, PERMISO_ADMIN);
      const channel = await db.query.cities.findFirst({
        where: eq(schema.cities.identifier, input.cityId),
      });

      return channel;
    }),
  change: protectedProcedure
    .input(
      z.object({
        identifier: z.string(),
        name: z.string(),
        image: z.string().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await trpcTienePermisoCtx(ctx, PERMISO_ADMIN);
      return ctx.db
        .update(cities)
        .set({ name: input.name, image: input.image })
        .where(eq(cities.identifier, input.identifier));
    }),

  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await trpcTienePermisoCtx(ctx, PERMISO_ADMIN);
      await db
        .delete(schema.cities)
        .where(eq(schema.cities.identifier, input.id));
    }),
});

export type City = RouterOutputs["city"]["listNonEmpty"][number];
