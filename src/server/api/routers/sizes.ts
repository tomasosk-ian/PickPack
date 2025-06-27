import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { env } from "~/env";
import { trpcTienePermisoCtxAny } from "~/lib/roles";
import { createId } from "~/lib/utils";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { db, schema } from "~/server/db";

async function sizesList(localId: string | null, entityId: string | null): Promise<z.infer<typeof responseValidator>> {
  const sizeResponse = await fetch(`${env.SERVER_URL}/api/size`);

  // Handle the response from the external API
  if (!sizeResponse.ok) {
    // Extract the error message from the response
    const errorResponse = await sizeResponse.json();
    // Throw an error or return the error message
    return errorResponse.message || "Unknown error";
  }

  const reservedBoxData = await sizeResponse.json();
  const allLocales = await db.query.stores.findMany({
    where: eq(schema.stores.entidadId, entityId ?? "")
  });

  const validatedData = responseValidator.parse(reservedBoxData);
  await Promise.all(
    validatedData.map(async (v) => {
      let fee;
      if (typeof localId === 'string') {
        fee = await db.query.feeData.findFirst({
          where: and(
            eq(schema.feeData.size, v.id),
            eq(schema.feeData.localId, localId),
          ),
        });

        if (!entityId) {
          const store = await db.query.stores.findFirst({
            where: eq(schema.stores.identifier, localId)
          });

          if (store) {
            entityId = store.entidadId ?? entityId;
          }
        }
      } else if (typeof entityId === 'string') {
        if (allLocales.length > 0) {
          fee = await db.query.feeData.findFirst({
            where: and(
              eq(schema.feeData.size, v.id),
              inArray(schema.feeData.localId, allLocales.map(v => v.identifier)),
            ),
          });
        }
      } else {
        fee = await db.query.feeData.findFirst({
          where: eq(schema.feeData.size, v.id),
        });
      }

      v.tarifa = fee?.identifier;

      const existingSize = await db.query.sizes.findFirst({
        where: eq(schema.sizes.id, v.id), // Utiliza el nombre correcto del campo
      });

      if (existingSize) {
        // Si el tamaño ya existe, actualiza los datos
        await db
          .update(schema.sizes)
          .set({
            ...v,
          })
          .where(eq(schema.sizes.id, v.id));
      } else {
        // Si el tamaño no existe, insértalo
        await db.insert(schema.sizes).values({
          ...v,
          entidadId: entityId ?? fee?.entidadId,
        });
      }
    }),
  );

  // });
  return validatedData;
}

async function disponibilidad(nroSerieLocker: string, inicio: string | null, fin: string | null): Promise<z.infer<typeof responseValidator>> {
  const sizeResponse = await fetch(
    `${env.SERVER_URL}/api/token/disponibilidadlocker/${nroSerieLocker}/${inicio}/${fin}`,
  );

  // Handle the response from the external API
  if (!sizeResponse.ok) {
    const errorResponse = await sizeResponse.json();
    // Throw an error or return the error message
    return errorResponse.message || "Unknown error";
  }


  const reservedBoxData = await sizeResponse.json();
  const validatedData = responseValidator.parse(reservedBoxData);
  return validatedData;
}

type LockerSize = z.infer<typeof responseValidator>[number];
async function sizeExpand(v: LockerSize, localId: string): Promise<LockerSize> {
  const fee = await db.query.feeData.findFirst({
    where: and(
      eq(schema.feeData.size, v.id),
      eq(schema.feeData.localId, localId),
    ),
  });

  let entityId = null;
  const store = await db.query.stores.findFirst({
    where: eq(schema.stores.identifier, localId)
  });

  if (store) {
    entityId = store.entidadId ?? entityId;
  }
  
  v.tarifa = fee?.identifier;

  const existingSize = await db.query.sizes.findFirst({
    where: eq(schema.sizes.id, v.id), // Utiliza el nombre correcto del campo
  });

  if (existingSize) {
    // Si el tamaño ya existe, actualiza los datos
    await db
      .update(schema.sizes)
      .set({
        ...v,
      })
      .where(eq(schema.sizes.id, v.id));
    v.image = existingSize.image;
  } else {
    // Si el tamaño no existe, insértalo
    await db.insert(schema.sizes).values({
      ...v,
      entidadId: entityId ?? fee?.entidadId,
    });
  }

  return v;
}

export const sizeRouter = createTRPCRouter({
  get: publicProcedure
    .input(
      z.object({
        store: z.string().nullable(),
      }),
    )
    .query(async ({ input }) => {
      return sizesList(input.store, null);
    }),
  getProt: protectedProcedure
    .input(
      z.object({
        store: z.string().nullable(),
      }),
    )
    .query(async ({ input, ctx }) => {
      return sizesList(input.store, ctx.orgId ?? "");
    }),
  getAvailability: publicProcedure
    .input(
      z.object({
        store: z.string(),
        inicio: z.string().nullable(),
        fin: z.string().nullable(),
      }),
    )
    .query(async ({ input }) => {
      const store = await db.query.stores.findFirst({
        where: eq(schema.stores.identifier, input.store),
        with: {
          lockers: true
        }
      });

      if (!store) {
        throw 'NOT_FOUND';
      }

      const sizesLockersMap: Record<number, {
        lockers: {
          serie: string,
          cantidad: number,
          size: LockerSize,
        }[],
        size: LockerSize, // solo sirve para referenciar por id y nombre
        cantidadSumada: number,
      }> = {};

      for (const locker of store.lockers) {
        const disp = await disponibilidad(locker.serieLocker, input.inicio, input.fin);
        for (const lockerSize of disp) {
          if (sizesLockersMap[lockerSize.id]) {
            sizesLockersMap[lockerSize.id]!.lockers.push({
              serie: locker.serieLocker,
              cantidad: lockerSize.cantidad ?? 0,
              size: await sizeExpand(lockerSize, store.identifier),
            });
            sizesLockersMap[lockerSize.id]!.cantidadSumada += (lockerSize.cantidad ?? 0);
          } else {
            sizesLockersMap[lockerSize.id] = {
              lockers: [{
                serie: locker.serieLocker,
                cantidad: lockerSize.cantidad ?? 0,
                size: await sizeExpand(lockerSize, store.identifier),
              }],
              size: await sizeExpand(lockerSize, store.identifier),
              cantidadSumada: lockerSize.cantidad ?? 0,
            };
          }
        }
      }

      return Object.fromEntries(Object.entries(sizesLockersMap).filter(v => typeof v[1].size.tarifa === 'string'));
    }),

  getById: protectedProcedure
    .input(
      z.object({
        sizeId: z.number(),
      }),
    )
    .query(async ({ input, ctx }) => {
      await trpcTienePermisoCtxAny(ctx, [
        "panel:locales",
        "panel:sizes"
      ]);

      const sizeResponse = await fetch(`${env.SERVER_URL}/api/size`);

      // Handle the response from the external API
      if (!sizeResponse.ok) {
        // Extract the error message from the response
        const errorResponse = await sizeResponse.json();
        // Throw an error or return the error message
        return errorResponse.message || "Unknown error";
      }

      const reservedBoxData = await sizeResponse.json();

      const validatedData = responseValidator.parse(reservedBoxData);

      const size = validatedData.find((item) => item.id === input.sizeId);
      // const store = await db.query.stores.findFirst({
      //   where: eq(schema.stores.identifier, input.storeId),
      //   with: {
      //     city: true,
      //   },
      // });

      return size;
    }),

  changeImage: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        image: z.string().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await trpcTienePermisoCtxAny(ctx, [
        "panel:locales",
        "panel:sizes"
      ]);

      return ctx.db
        .update(schema.sizes)
        .set({ image: input.image })
        .where(eq(schema.sizes.id, input.id));
    }),
});

const sizeValidator = z.object({
  id: z.number(),
  nombre: z.string().nullable(),
  alto: z.number(),
  ancho: z.number().nullable(),
  profundidad: z.number().nullable(),
  cantidad: z.number().nullable().optional(),
  cantidadSeleccionada: z.number().nullable().optional().default(0),
  tarifa: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
});
export type Size = z.infer<typeof sizeValidator>;

const responseValidator = z.array(sizeValidator);
