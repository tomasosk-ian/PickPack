import { db, schema } from "~/server/db";
import { PrivateConfigKeys } from "./config";
import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";

export function entityJwtSecret() {
  // En realidad debería ser por entorno pero el sistema de clave de entidad tampoco es tan riguroso.
  // Se puede generar un secret de estos con openssl rand.
  // Tiene que ser único por entidad (o por entorno)
  const EntitySecret = "dPy/hD8F1dN0efMWkiIduYFRBDFD/ehVJXewU2UpcIw=";
  return EntitySecret;
}

export async function trpcEntityJwtValidate(entityId: string, jwtStr?: string) {
  const key: PrivateConfigKeys = "entidad_lockers_privados_key";
  const res = (await db.query.publicConfig.findFirst({
    where: and(
      eq(schema.publicConfig.key, key),
      eq(schema.publicConfig.entidadId, entityId),
    )
  })) ?? null;

  if (!jwtStr && !res) {
    return;
  }

  if (!jwtStr && res) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: "Sin clave en entidad con clave" });
  }

  if (jwtStr && !res) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: "No se pedía clave en entidad sin clave" });
  }

  try {
    var _decoded = jwt.verify(jwtStr!, entityJwtSecret(), { ignoreExpiration: false });
  } catch (e) {
    console.debug("trpcEntityJwtValidate", e);
    throw new TRPCError({ code: 'UNAUTHORIZED', message: "Clave inválida" });
  }
}