import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "~/server/db";
import { sticEvtWebhookConfirmedOrderSchema } from "~/lib/stic/models";
import { sticProcessOrder } from "./lib";

export async function POST(
  request: NextRequest,
  { params: { entityId } }: { params: { entityId: string } },
) {
  const entidad = await db.query.companies.findFirst({
    where: eq(schema.companies.id, entityId)
  });

  if (!entidad) {
    console.error(`[${entityId}] stic ord-confirm entity not found`);
    await db.insert(schema.errorLogs).values({ text: `(entidad ID: ${entityId}) Webhook Stic: entidad no encontrada` });
    return NextResponse.json(null, { status: 404 });
  }

  const requestBody = await request.json();
  const parsedBody = await sticEvtWebhookConfirmedOrderSchema.safeParseAsync(requestBody);
  if (parsedBody.error) {
    console.error(`[${entityId}] stic ord-confirm invalid body`, requestBody, "with errors", parsedBody.error);
    await db.insert(schema.errorLogs).values({ text: `(entidad ID: ${entityId}) Webhook Stic: recibido cuerpo inválido con errores: ${JSON.stringify(parsedBody.error)}` });
    return NextResponse.json(null, { status: 400 });
  }

  const body = parsedBody.data;
  return await sticProcessOrder({ entidad, entityId, body });
}

