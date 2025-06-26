import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { db, schema } from "~/server/db";
import { and, eq } from "drizzle-orm";
import { PrivateConfigKeys, type PublicConfigKeys } from "~/lib/config";
import { TRPCError } from "@trpc/server";

export const configRouter = createTRPCRouter({
  getKey: publicProcedure
    .input(z.object({
      key: z.custom<PublicConfigKeys>(),
      entityId: z.string().min(1),
    }))
    .query(async ({ input, ctx }) => {
      return await ctx.db.query.publicConfig.findFirst({
        where: and(
          eq(schema.publicConfig.key, input.key),
          eq(schema.publicConfig.entidadId, input.entityId),
        )
      });
    }),
  getKeyProt: protectedProcedure
    .input(z.object({
      key: z.custom<PublicConfigKeys>(),
    }))
    .query(async ({ input, ctx }) => {
      return await ctx.db.query.publicConfig.findFirst({
        where: and(
          eq(schema.publicConfig.key, input.key),
          eq(schema.publicConfig.entidadId, ctx.orgId ?? ""),
        )
      });
    }),
  getPrivateKey: protectedProcedure
    .input(z.object({
      key: z.custom<PrivateConfigKeys>(),
    }))
    .query(async ({ input, ctx }) => {
      if (!ctx.session || ctx.session.sessionClaims?.metadata.role !== 'admin') {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: "no es admin" });
      }

      return await ctx.db.query.privateConfig.findFirst({
        where: and(
          eq(schema.privateConfig.key, input.key),
          eq(schema.privateConfig.entidadId, ctx.orgId ?? ""),
        )
      });
    }),
  setPublicKeyAdmin: protectedProcedure
    .input(z.object({
      key: z.custom<PublicConfigKeys>(),
      value: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session || ctx.session.sessionClaims?.metadata.role !== 'admin') {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: "no es admin" });
      }

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
      if (!ctx.session || ctx.session.sessionClaims?.metadata.role !== 'admin') {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: "no es admin" });
      }

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
      if (!ctx.session || ctx.session.sessionClaims?.metadata.role !== 'admin') {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: "no es admin" });
      }

      return await ctx.db.query.publicConfig.findMany({
        where: eq(schema.publicConfig.entidadId, ctx.orgId ?? "")
      });
    }),
  listPrivateAdmin: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.session || ctx.session.sessionClaims?.metadata.role !== 'admin') {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: "no es admin" });
      }

      return await ctx.db.query.privateConfig.findMany({
        where: eq(schema.privateConfig.entidadId, ctx.orgId ?? "")
      });
    }),
  deletePublicKeyAdmin: protectedProcedure
    .input(z.object({
      key: z.custom<PublicConfigKeys>(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session || ctx.session.sessionClaims?.metadata.role !== 'admin') {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: "no es admin" });
      }

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
      if (!ctx.session || ctx.session.sessionClaims?.metadata.role !== 'admin') {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: "no es admin" });
      }

      await db.delete(schema.privateConfig)
        .where(and(
          eq(schema.privateConfig.key, input.key),
          eq(schema.privateConfig.entidadId, ctx.orgId ?? ""),
        ));

      return "ok";
    }),
});
