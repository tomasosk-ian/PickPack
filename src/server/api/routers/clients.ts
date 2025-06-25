import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import type { RouterOutputs } from "~/trpc/shared";
import { db, schema } from "~/server/db";
import { clients } from "~/server/db/schema";
import { TRPCError } from "@trpc/server";

export const clientsRouter = createTRPCRouter({
  get: publicProcedure
    .input(z.object({
      entidadId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      const result = ctx.db.query.clients.findMany({
        orderBy: (client, { asc }) => [asc(client.email)],
        where: eq(schema.clients.entidadId, input.entidadId),
      });
      return result;
    }),
  getGroupedByEmail: publicProcedure
    .input(z.object({
      entidadId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      const clients = await ctx.db.query.clients.findMany({
        orderBy: (client, { asc }) => [asc(client.email)],
        where: eq(schema.clients.entidadId, input.entidadId),
      });

      // Group by email using JavaScript
      const groupedByEmail = clients.reduce(
        (acc, client) => {
          if (!acc[client.email!]) {
            acc[client.email!] = [];
          }
          acc[client.email!]!.push(client);
          return acc;
        },
        {} as Record<string, typeof clients>,
      );
      return groupedByEmail;
    }),
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(0).max(1023).nullable().optional(),
        surname: z.string().min(0).max(1023).nullable().optional(),
        email: z.string().min(0).max(1023).nullable().optional(),
        prefijo: z.number().nullable().optional(),
        telefono: z.number().nullable().optional(),
        dni: z.string().min(0).max(1023).optional().nullable(),
        entidadId: z.string().min(0).max(1023),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: verificar permisos
      const client = await ctx.db.query.clients.findFirst({
        where: and(
          eq(schema.clients.email, input.email!),
          eq(schema.clients.entidadId, input.entidadId),
        ),
      });

      if (!client) {
        const result = await db.insert(schema.clients).values({
          name: input.name,
          surname: input.surname,
          email: input.email,
          prefijo: input.prefijo,
          telefono: input.telefono,
          dni: input.dni,
        });
        const id = parseInt(result.lastInsertRowid?.toString()!);
        return { id };
      } else {
        const id = parseInt(client.identifier?.toString()!);
        return { id };
      }
    }),
  getById: protectedProcedure
    .input(
      z.object({
        identifier: z.number().optional(),
      }),
    )
    .query(async ({ input }) => {
      if (input.identifier) {
        const client = await db.query.clients.findFirst({
          where: eq(schema.clients.identifier, input.identifier),
        });

        return client;
      }
    }),
  getByEmail: publicProcedure
    .input(
      z.object({
        email: z.string(),
        entidadId: z.string()
      }),
    )
    .query(async ({ input }) => {
      const client = await db.query.clients.findFirst({
        where: and(
          eq(schema.clients.email, input.email),
          eq(schema.clients.entidadId, input.entidadId),
        ),
      });

      return client;
    }),
  change: protectedProcedure
    .input(
      z.object({
        identifier: z.number(),
        name: z.string().min(0).max(1023).optional().nullable(),
        surname: z.string().min(0).max(1023).optional().nullable(),
        email: z.string().min(0).max(1023).optional().nullable(),
        prefijo: z.number().optional().nullable(),
        telefono: z.number().optional().nullable(),
        dni: z.string().min(0).max(1023).optional().nullable(),
      }),
    )
    .mutation(({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: "Sin entidad" });
      }

      return ctx.db
        .update(clients)
        .set(input)
        .where(and(
          eq(clients.identifier, input.identifier),
          eq(clients.entidadId, ctx.orgId),
        ));
    }),
  delete: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: "Sin entidad" });
      }

      await db
        .delete(schema.clients)
        .where(and(
          eq(clients.identifier, input.id),
          eq(clients.entidadId, ctx.orgId),
        ));
    }),
});

export type Client = RouterOutputs["client"]["get"][number];
