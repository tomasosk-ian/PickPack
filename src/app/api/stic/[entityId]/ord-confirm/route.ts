import { and, eq, ilike, inArray } from "drizzle-orm";
import { Payment } from "mercadopago";
import { NextRequest, NextResponse } from "next/server";
import type { PrivateConfigKeys } from "~/lib/config";
import { getMpClient } from "~/server/api/routers/mp";
import { db, schema } from "~/server/db";
import { api } from "~/trpc/server";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { createId } from "~/lib/utils";
import { getClientByEmail } from "~/server/api/routers/lockerReserveRouter";
import { MpMeta } from "~/lib/types";
import { sticEvtWebhookConfirmedOrderSchema } from "~/lib/stic/models";
import { env } from "~/env";
import { getAvailability } from "~/server/api/routers/sizes";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

export async function POST(
  request: NextRequest,
  { params: { entityId } }: { params: { entityId: string } },
) {
  const entidad = await db.query.companies.findFirst({
    where: eq(schema.companies.id, entityId)
  });

  if (!entidad) {
    console.error(`[${entityId}] stic ord-confirm entity not found`);
    return NextResponse.json(null, { status: 404 });
  }

  const requestBody = await request.json();
  const parsedBody = await sticEvtWebhookConfirmedOrderSchema.safeParseAsync(requestBody);
  if (parsedBody.error) {
    console.error(`[${entityId}] stic ord-confirm invalid body`, requestBody, "with errors", parsedBody.error);
    return NextResponse.json(null, { status: 400 });
  }

  const body = parsedBody.data;
  let client = await db.query.clients.findFirst({
    where: and(
      ilike(schema.clients.email, body.CustomerEmail),
      eq(schema.clients.entidadId, entityId),
    )
  });

  if (!client) {
    const [newClient] = await db.insert(schema.clients)
      .values({
        email: body.CustomerEmail,
        name: body.CustomerName,
        entidadId: entityId,
      }).returning();

    client = newClient!;
  }

  // TODO: CAMBIAR
  // Agarra cualquier store, cualquier locker.
  const allPossibleStores = await db.query.stores.findMany({
    where: eq(schema.stores.entidadId, entityId),
    with: {
      lockers: true,
    }
  });

  let store = null, locker = null, lockerSizeId = null;
  for (const possibleStore of allPossibleStores) {
    const availability = await getAvailability(possibleStore, {
      inicio: dayjs.utc().startOf("day").toISOString(),
      fin: dayjs.utc().endOf("day").toISOString(),
      store: possibleStore.identifier
    });

    const firstEntryWithAvailableCantidad = Object.entries(availability).find(
      ([lockerSizeId, locker]) => locker.cantidadSumada > 0,
    );

    if (!firstEntryWithAvailableCantidad) {
      continue;
    }

    lockerSizeId = firstEntryWithAvailableCantidad[0]!;
    const lockerData = firstEntryWithAvailableCantidad[1]!;
    const firstAvailableLockerData = lockerData.lockers.find(l => l.cantidad >= 1);
    locker = firstAvailableLockerData!;
    store = possibleStore;
  }

  if (!store || !locker || !lockerSizeId) {
    console.error(`[${entityId}] stic ord-confirm no store or locker available`, store, locker);
    return NextResponse.json(null, { status: 500 });
  }

  // const newReserveId = createId();
  // let [reserve] = await db.insert(schema.reservas).values({
  //   identifier: newReserveId,
  //   NroSerie: locker.serie,
  //   IdSize: locker.size.id,
  //   IdBox: null,
  //   IdFisico: null,
  //   Token1: input.Token1,
  //   FechaCreacion: new Date().toISOString(),
  //   FechaInicio: input.FechaInicio,
  //   FechaFin: input.FechaFin,
  //   Contador: input.Contador,
  //   Confirmado: input.Confirmado,
  //   Modo: input.Modo,
  //   Cantidad: input.Cantidad,
  //   IdTransaction: transaction.id,
  //   client: body.CustomerEmail,
  //   nReserve: input.nReserve,
  //   entidadId: input.entityId,
  // })
  // .returning();

  // {
  //   const reservationResponse = await fetch(
  //     `${env.SERVER_URL}/api/token/reservar/${locker.serie}`,
  //     {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //         // Add any additional headers needed for authentication or other purposes
  //       },
  //       body: JSON.stringify(reserve),
  //     },
  //   );

  //   // Handle the response from the external API
  //   if (!reservationResponse.ok) {
  //     // Extract the error message from the response
  //     const errorResponse = await reservationResponse.json();
  //     console.log(errorResponse);
  //     // Throw an error or return the error message
  //     return errorResponse.message || "Unknown error";
  //   } else {
  //   }

  //   const reservedBoxTransactionId = await reservationResponse.json();
  // }

  // const [tx] = await db.insert(schema.transactions)
  //   .values({
  //     amount: body.TotalAmount,
  //     client: String(client.identifier),
  //     confirm: true,
  //     entidadId: entityId,
  //   })
  //   .returning();

  // const transaction = tx!;

  // // confirm box
  // const reservationResponse = await fetch(
  //   `${env.SERVER_URL}/api/token/confirmar`,
  //   {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //     },
  //     body: `${input.idToken}`,
  //   },
  // );

  // await db
  //   .update(schema.reservas)
  //   .set({ Token1: reservedBoxData, nReserve: input.nReserve })
  //   .where(and(
  //     eq(schema.reservas.IdTransaction, input.idToken),
  //     eq(schema.reservas.entidadId, ent.id),
  //   ));

  // try {
  //   var QRCode = require("qrcode");
  //   const attachments: {
  //     filename: string;
  //     content: any;
  //     type: string;
  //     disposition: string;
  //     contentId: string;
  //   }[] = [];
  //   await Promise.all(
  //     input.token.map(async (token, index) => {
  //       const img = await QRCode.toDataURL(token[0]!.toString(), {
  //         type: "png",
  //       });

  //       const qrCode = img.split(";base64,").pop();
  //       if (qrCode) {
  //         attachments.push({
  //           filename: `QR_${token[0]}_${token[1]}.png`,
  //           content: qrCode,
  //           type: "image/png",
  //           disposition: "attachment",
  //           contentId: `qr_code_${index}`,
  //         });
  //       }
  //     }),
  //   );

  //   const sgMail = require("@sendgrid/mail");
  //   sgMail.setApiKey(env.SENDGRID_API_KEY);
  //   const msg = {
  //     to: input.to,
  //     from: `${env.MAIL_SENDER}`,
  //     subject: `PICKPACK: Confirmación de reserva de locker`,
  //     html: `
      
  //     <body>
  //     <p>Estimado/a ${input.client},</p>
  //     <p>Nos complace confirmar que tu reserva en ${input.local} en ${input.address} ha sido exitosamente procesada. </p>


  //     <p><strong>N° Reserva</strong></p>
  //     <p><strong>${input.nReserve}</strong></p>


  //     <p><strong>Período</strong></p>
  //     <p>Entrega desde              ${input.from}</p>
  //     <p>Recogida hasta             ${input.until}</p>
    
  //     <p><strong>Códigos de acceso (Tokens)</strong></p>

  //     <p>
  //       ${input.token
  //         .map((x) => {
  //           return `El código de acceso (token) para guardar su paquete es <strong>${x[0]} (${x[1]})</strong><br>`;
  //         })
  //         .join("")}
  //     </p>

  //     <hr>

  //     <p><strong>Precio Total</strong>         ${input.coin ?? ""} ${input.price}</p>

      
  //     <p>Atentamente,</p>
  //     <p>el equipo de <strong>PickPack</strong></p>
      
      
  //   </body>`,
  //     attachments: attachments,
  //   };
  //   sgMail
  //     .send(msg)
  //     .then(() => {
  //       console.log("Email sent");
  //     })
  //     .catch((e: any) => {
  //       console.log(e);
  //     });
  // } catch (error: any) {
  //   console.log("stic ord-confirm", error);
  // }
}

