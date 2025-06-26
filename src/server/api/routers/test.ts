import { db, schema } from "~/server/db";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { eq, isNull } from "drizzle-orm";
import { trpcTienePermisoCtx } from "~/lib/roles";
import { PERMISO_ADMIN } from "~/lib/permisos";

// esfuerzo dudoso de no repetir ejecuciones de migraciones
let lastMigration = 0;

export const testRouter = createTRPCRouter({
  migrateToEntities: protectedProcedure
    .mutation(async ({ ctx }) => {
      await trpcTienePermisoCtx(ctx, PERMISO_ADMIN);
      
      if (Date.now() - lastMigration > 60000 * 60) {
        lastMigration = Date.now();
      } else {
        return;
      }

      await db.transaction(async (db) => {
        let defaultEntidad = await db.query.companies.findFirst({
          where: eq(schema.companies.id, "default")
        });

        if (!defaultEntidad) {
          const [res] = await db.insert(schema.companies)
            .values({
              id: "default",
              name: "Default",
            })
            .returning();

          defaultEntidad = res!;
        }

        await db.update(schema.clients)
          .set({ entidadId: "default" })
          .where(isNull(schema.clients.entidadId));
        await db.update(schema.stores)
          .set({ entidadId: "default" })
          .where(isNull(schema.stores.entidadId));
        await db.update(schema.transactions)
          .set({ entidadId: "default" })
          .where(isNull(schema.transactions.entidadId));
        await db.update(schema.sizes)
          .set({ entidadId: "default" })
          .where(isNull(schema.sizes.entidadId));
        await db.update(schema.reservas)
          .set({ entidadId: "default" })
          .where(isNull(schema.reservas.entidadId));
        await db.update(schema.publicConfig)
          .set({ entidadId: "default" })
          .where(isNull(schema.publicConfig.entidadId));
        await db.update(schema.privateConfig)
          .set({ entidadId: "default" })
          .where(isNull(schema.privateConfig.entidadId));
        await db.update(schema.feeData)
          .set({ entidadId: "default" })
          .where(isNull(schema.feeData.entidadId));
        await db.update(schema.cuponesData)
          .set({ entidadId: "default" })
          .where(isNull(schema.cuponesData.entidadId));
        await db.update(schema.pagos)
          .set({ entidadId: "default" })
          .where(isNull(schema.pagos.entidadId));

        lastMigration = Date.now();
      });
    })
});