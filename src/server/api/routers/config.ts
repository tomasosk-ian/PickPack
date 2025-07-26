import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { db, schema } from "~/server/db";
import { eq } from "drizzle-orm";
import { PrivateConfigKeys, type PublicConfigKeys } from "~/lib/config";
import { TRPCError } from "@trpc/server";

export const configRouter = createTRPCRouter({
  getKey: publicProcedure
    .input(z.object({ key: z.custom<PublicConfigKeys>() }))
    .query(async ({ input, ctx }) => {
      return await ctx.db.query.publicConfig.findFirst({
        where: eq(schema.publicConfig.key, input.key)
      });
    }),
  getPrivateKey: publicProcedure
    .input(z.object({ key: z.custom<PrivateConfigKeys>() }))
    .query(async ({ input, ctx }) => {
      if (!ctx.session || ctx.session.sessionClaims?.metadata.role !== 'admin') {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: "no es admin" });
      }

      return await ctx.db.query.privateConfig.findFirst({
        where: eq(schema.privateConfig.key, input.key)
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


      await db.insert(schema.publicConfig)
        .values(input)
        .onConflictDoUpdate({
          target: schema.publicConfig.key,
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

      await db.insert(schema.privateConfig)
        .values(input)
        .onConflictDoUpdate({
          target: schema.privateConfig.key,
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

      return await ctx.db.query.publicConfig.findMany({});
    }),
  listPrivateAdmin: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.session || ctx.session.sessionClaims?.metadata.role !== 'admin') {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: "no es admin" });
      }

      return await ctx.db.query.privateConfig.findMany({});
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
        .where(eq(schema.publicConfig.key, input.key));

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
        .where(eq(schema.privateConfig.key, input.key));

      return "ok";
    }),
});
