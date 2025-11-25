import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { trpcEntityJwtValidate } from "~/lib/entity";
import { trpcTienePermisoCtx } from "~/lib/roles";
import { createId } from "~/lib/utils";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { db, schema } from "~/server/db";
import { stores } from "~/server/db/schema";
import { RouterOutputs } from "~/trpc/shared";

export const storeRouter = createTRPCRouter({
  listPublic: publicProcedure
    .query(async () => {
      const stores = await db.query.stores.findMany({
        with: {
          city: true,
          lockers: true,
        },
        columns: {
          address: true,
          cityId: true,
          description: true,
          entidadId: true,
          identifier: true,
          image: true,
          name: true,
          organizationName: true,
          firstTokenUseTime: true,
        },
      });

      return filterPublicStores(stores);
    }),

  listFromEntity: publicProcedure
    .input(z.object({
      entityId: z.string(),
      jwt: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      await trpcEntityJwtValidate(input.entityId, input.jwt);

      const stores = await ctx.db.query.stores.findMany({
        where: eq(schema.stores.entidadId, input.entityId),
        with: {
          city: true,
          lockers: true
        },
        columns: {
          address: true,
          cityId: true,
          description: true,
          entidadId: true,
          identifier: true,
          image: true,
          name: true,
          organizationName: true,
          firstTokenUseTime: true,
        },
      });

      return stores;
    }),

  getProt: protectedProcedure
    .query(({ ctx }) => {
      const stores = ctx.db.query.stores.findMany({
        where: eq(schema.stores.entidadId, ctx.orgId ?? ""),
        with: {
          city: true,
          lockers: true,
        },
        columns: {
          address: true,
          cityId: true,
          description: true,
          entidadId: true,
          identifier: true,
          image: true,
          name: true,
          organizationName: true,
          firstTokenUseTime: true,
        },
      });
      return stores;
    }),

  getById: protectedProcedure
    .input(
      z.object({
        storeId: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      await trpcTienePermisoCtx(ctx, "panel:locales");
      const store = await db.query.stores.findFirst({
        where: eq(schema.stores.identifier, input.storeId),
        with: {
          city: true,
          lockers: true,
        },
      });

      return store;
    }),

  getByCityPublic: publicProcedure
    .input(
      z.object({
        cityId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const store = await db.query.stores.findMany({
        where: eq(schema.stores.cityId, input.cityId),
        with: {
          city: true,
          lockers: true,
        },
        columns: {
          address: true,
          cityId: true,
          description: true,
          entidadId: true,
          identifier: true,
          image: true,
          name: true,
          organizationName: true,
          firstTokenUseTime: true,
        },
      });

      return filterPublicStores(store);
    }),

  getByCityFromEntity: publicProcedure
    .input(
      z.object({
        cityId: z.string(),
        entityId: z.string(),
        jwt: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      await trpcEntityJwtValidate(input.entityId, input.jwt);

      const store = await db.query.stores.findMany({
        where: and(
          eq(schema.stores.cityId, input.cityId),
          eq(schema.stores.entidadId, input.entityId),
        ),
        with: {
          city: true,
          lockers: true,
        },
        columns: {
          address: true,
          cityId: true,
          description: true,
          entidadId: true,
          identifier: true,
          image: true,
          name: true,
          organizationName: true,
          firstTokenUseTime: true,
        },
      });

      return store;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        image: z.string().min(0).max(1023),
        cityId: z.string().min(0).max(1023),
        address: z.string().min(0).max(1023),
        organizationName: z.string().min(0).max(1023),
        description: z.string().min(0).max(1023),
        serieLocker: z.string().nullable(),
        backofficeEmail: z.string().max(255),
        batitiendaPickupPointId: z.string().max(255)
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await trpcTienePermisoCtx(ctx, "panel:locales");

      if (!ctx.orgId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: "Sin entidad" });
      }

      const identifier = createId();
      await ctx.db.insert(schema.stores).values({
        identifier,
        name: input.name,
        image: input.image,
        cityId: input.cityId,
        address: input.address,
        organizationName: input.organizationName,
        description: input.description,
        entidadId: ctx.orgId,
        backofficeEmail: input.backofficeEmail,
        stic_pickup_point_id: input.batitiendaPickupPointId,
      });

      if (input.serieLocker !== null) {
        await ctx.db.insert(schema.storesLockers)
          .values({
            storeId: identifier,
            serieLocker: input.serieLocker,
          });
      }

      return { identifier };
    }),
  change: protectedProcedure
    .input(
      z.object({
        identifier: z.string(),
        name: z.string(),
        image: z.string().nullable().optional(),
        cityId: z.string().min(0).max(1023),
        address: z.string().min(0).max(1023).nullable(),
        organizationName: z.string().min(0).max(1023),
        description: z.string().min(0).max(1023),
        serieLockers: z.array(z.string()).nullable(),
        serieLockersPrivados: z.array(z.string()).nullable(),
        firstTokenUseTime: z.number(),
        backofficeEmail: z.string().nullable(),
        batitiendaPickupPointId: z.string().max(255).nullable()
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await trpcTienePermisoCtx(ctx, "panel:locales");
      const a = await ctx.db.query.stores.findFirst({
        where: eq(schema.stores.identifier, input.identifier),
      });

      if (!a) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      const privados = input.serieLockersPrivados ?? [];
      return ctx.db.transaction(async (tx) => {
        await tx
          .update(stores)
          .set({
            name: input.name,
            image: input.image,
            cityId: input.cityId,
            address: input.address,
            description: input.description,
            organizationName: input.organizationName,
            firstTokenUseTime: input.firstTokenUseTime,
            backofficeEmail: input.backofficeEmail,
            stic_pickup_point_id: input.batitiendaPickupPointId,
          })
          .where(and(
            eq(stores.identifier, input.identifier),
            eq(stores.entidadId, ctx.orgId ?? ""),
          ));

        if (Array.isArray(input.serieLockers)) {
          await tx.delete(schema.storesLockers)
            .where(eq(schema.storesLockers.storeId, a.identifier));
          for (const l of input.serieLockers) {
            await tx.insert(schema.storesLockers)
              .values({
                storeId: a.identifier,
                serieLocker: l,
                isPrivate: privados.some(p => l === p),
              });
          }
        }
      });
    }),
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await trpcTienePermisoCtx(ctx, "panel:locales");
      await db
        .delete(schema.stores)
        .where(and(
          eq(schema.stores.identifier, input.id),
          eq(schema.stores.entidadId, ctx.orgId ?? ""),
        ));
    }),
});

export type Store = RouterOutputs["store"]["listPublic"][number];
export type StorePrivate = NonNullable<RouterOutputs["store"]["getById"]>;

// Solo los stores no privados (los que solo tienen lockers privados),
// y de aquellos solo los lockers públicos
function filterPublicStores(stores: { identifier: string; name: string; description: string | null; image: string | null; entidadId: string | null; cityId: string; address: string | null; organizationName: string | null; firstTokenUseTime: number | null; city: { identifier: string; name: string; description: string; image: string | null; }; lockers: { storeId: string; serieLocker: string; isPrivate: boolean | null; }[]; }[]) {
  let storesRes = [];
  for (const store of stores) {
    const privates = store.lockers.filter(l => l.isPrivate);
    const onlyHasPrivates = privates.length === store.lockers.length && privates.length > 0;
    if (!onlyHasPrivates) {
      storesRes.push({
        ...store,
        lockers: store.lockers.filter(l => !l.isPrivate),
      });
    }
  }
  return storesRes;
}

