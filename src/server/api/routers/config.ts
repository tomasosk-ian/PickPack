import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { db, schema } from "~/server/db";
import { and, eq } from "drizzle-orm";
import { PrivateConfigKeys, type PublicConfigKeys } from "~/lib/config";
import { TRPCError } from "@trpc/server";
import { trpcTienePermisoCtx } from "~/lib/roles";
import jwt from "jsonwebtoken";
import { timingSafeEqual } from "crypto";
import { entityJwtSecret } from "~/lib/entity";

export const configRouter = createTRPCRouter({
  needsEntityKey: publicProcedure
    .input(z.object({
      entityId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const key: PrivateConfigKeys = "entidad_lockers_privados_key";
      const res = (await ctx.db.query.privateConfig.findFirst({
        where: and(
          eq(schema.publicConfig.key, key),
          eq(schema.publicConfig.entidadId, input.entityId),
        )
      })) ?? null;

      return res !== null && res.value !== "";
    }),
  signEntityKey: publicProcedure
    .input(z.object({
      entityId: z.string(),
      key: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const key: PrivateConfigKeys = "entidad_lockers_privados_key";
      const res = (await ctx.db.query.privateConfig.findFirst({
        where: and(
          eq(schema.publicConfig.key, key),
          eq(schema.publicConfig.entidadId, input.entityId),
        )
      })) ?? null;

      if (!res) {
        return null;
      }

      const inputKeyBuf = Buffer.from(input.key, 'utf8');
      const storedKeyBuf = Buffer.from(res.value, 'utf8');

      if (inputKeyBuf.length !== storedKeyBuf.length) {
        return null;
      }

      if (!timingSafeEqual(inputKeyBuf, storedKeyBuf)) {
        return null;
      }

      return jwt.sign({
        exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hora
        data: 'entity_key'
      }, entityJwtSecret());
    }),
  getKey: publicProcedure
    .input(z.object({
      key: z.custom<PublicConfigKeys>(),
      entityId: z.string().min(1),
    }))
    .query(async ({ input, ctx }) => {
      return (await ctx.db.query.publicConfig.findFirst({
        where: and(
          eq(schema.publicConfig.key, input.key),
          eq(schema.publicConfig.entidadId, input.entityId),
        )
      })) ?? null;
    }),
  getKeyProt: protectedProcedure
    .input(z.object({
      key: z.custom<PublicConfigKeys>(),
    }))
    .query(async ({ input, ctx }) => {
      return (await ctx.db.query.publicConfig.findFirst({
        where: and(
          eq(schema.publicConfig.key, input.key),
          eq(schema.publicConfig.entidadId, ctx.orgId ?? ""),
        )
      })) ?? null;
    }),
  getPrivateKey: protectedProcedure
    .input(z.object({
      key: z.custom<PrivateConfigKeys>(),
    }))
    .query(async ({ input, ctx }) => {
      await trpcTienePermisoCtx(ctx, "panel:params");
      return (await ctx.db.query.privateConfig.findFirst({
        where: and(
          eq(schema.privateConfig.key, input.key),
          eq(schema.privateConfig.entidadId, ctx.orgId ?? ""),
        )
      })) ?? null;
    }),
  setPublicKeyAdmin: protectedProcedure
    .input(z.object({
      key: z.custom<PublicConfigKeys>(),
      value: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      await trpcTienePermisoCtx(ctx, "panel:params");
      if (!ctx.orgId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: "Sin entidad" });
      }

      await db.insert(schema.publicConfig)
        .values({
          ...input,
          entidadId: ctx.orgId ?? "",
        })
        .onConflictDoUpdate({
          target: [schema.publicConfig.key, schema.publicConfig.entidadId],
          set: {
            value: input.value
          }
        })
        .returning();

      return "ok";
    }),
  setPrivateKeyAdmin: protectedProcedure
    .input(z.object({
      key: z.custom<PrivateConfigKeys>(),
      value: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      await trpcTienePermisoCtx(ctx, "panel:params");
      if (!ctx.orgId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: "Sin entidad" });
      }

      await db.insert(schema.privateConfig)
        .values({
          ...input,
          entidadId: ctx.orgId ?? "",
        })
        .onConflictDoUpdate({
          target: [schema.privateConfig.key, schema.privateConfig.entidadId],
          set: {
            value: input.value
          }
        })
        .returning();

      return "ok";
    }),
  listPublicAdmin: protectedProcedure
    .query(async ({ ctx }) => {
      await trpcTienePermisoCtx(ctx, "panel:params");
      return await ctx.db.query.publicConfig.findMany({
        where: eq(schema.publicConfig.entidadId, ctx.orgId ?? "")
      });
    }),
  listPrivateAdmin: protectedProcedure
    .query(async ({ ctx }) => {
      await trpcTienePermisoCtx(ctx, "panel:params");
      return await ctx.db.query.privateConfig.findMany({
        where: eq(schema.privateConfig.entidadId, ctx.orgId ?? "")
      });
    }),
  deletePublicKeyAdmin: protectedProcedure
    .input(z.object({
      key: z.custom<PublicConfigKeys>(),
    }))
    .mutation(async ({ ctx, input }) => {
      await trpcTienePermisoCtx(ctx, "panel:params");
      await db.delete(schema.publicConfig)
        .where(and(
          eq(schema.publicConfig.key, input.key),
          eq(schema.publicConfig.entidadId, ctx.orgId ?? ""),
        ));

      return "ok";
    }),
  deletePrivateKeyAdmin: protectedProcedure
    .input(z.object({
      key: z.custom<PrivateConfigKeys>(),
    }))
    .mutation(async ({ ctx, input }) => {
      await trpcTienePermisoCtx(ctx, "panel:params");
      await db.delete(schema.privateConfig)
        .where(and(
          eq(schema.privateConfig.key, input.key),
          eq(schema.privateConfig.entidadId, ctx.orgId ?? ""),
        ));

      return "ok";
    }),
});
