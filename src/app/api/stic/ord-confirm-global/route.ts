import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "~/server/db";
import { sticEvtWebhookConfirmedOrderSchema } from "~/lib/stic/models";
import { sticProcessOrder } from "../[entityId]/ord-confirm/lib";
import { eq } from "drizzle-orm";

export async function POST(
  request: NextRequest,
) {
  // TODO: levantar una entidad equis
  const entidad = await db.query.companies.findFirst({
    where: eq(schema.companies.id, "default")
  });

  const entityId = entidad?.id;
  if (!entidad || !entityId) {
    console.error(`[${entityId}] stic ord-confirm-global no entity`);
    return NextResponse.json(null, { status: 404 });
  }

  const requestBody = await request.json();
  const parsedBody = await sticEvtWebhookConfirmedOrderSchema.safeParseAsync(requestBody);
  if (parsedBody.error) {
    console.error(`[${entityId}] stic ord-confirm invalid body`, requestBody, "with errors", parsedBody.error);
    return NextResponse.json(null, { status: 400 });
  }

  const body = parsedBody.data;
  return await sticProcessOrder({ entidad, entityId, body });
}

