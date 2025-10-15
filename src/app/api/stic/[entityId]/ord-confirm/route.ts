import { and, eq, ilike } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import type { PrivateConfigKeys } from "~/lib/config";
import { db, schema } from "~/server/db";
import { createId } from "~/lib/utils";
import { sticEvtWebhookConfirmedOrderSchema } from "~/lib/stic/models";
import { getAvailability } from "~/server/api/routers/sizes";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { dcmCreateToken1, dcmGetToken, DCMv2TokenCreate } from "../../../../../lib/dcm";
import { env } from "~/env";
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
  let client = await getHookClientByEmail(body.CustomerName, body.CustomerEmail, entityId);

  const [newReservaToClient] = await db
    .insert(schema.reservasToClients)
    .values({
      clientId: client.identifier,
    })
    .returning();

  const reservaToClient = newReservaToClient!;
  const nReserve = reservaToClient.identifier;

  // TODO: CAMBIAR
  // Agarra cualquier store, cualquier locker.
  let { store, locker, lockerSizeId } = await findAnyStoreAndLocker(entityId);

  if (!store || !locker || !lockerSizeId) {
    console.error(`[${entityId}] stic ord-confirm no store or locker available`, store, locker);
    return NextResponse.json(null, { status: 500 });
  }

  const reserveData: DCMv2TokenCreate = {
    IdSize: Number(lockerSizeId),
    FechaInicio: new Date().toISOString(),
    Confirmado: true,
    Cantidad: 1,
  };

  const tokenEmpresa = await getTokenEmpresa(entityId);
  if (!tokenEmpresa) {
    console.error(`[${entityId}] stic ord-confirm no token empresa for dcm`);
    return NextResponse.json(null, { status: 500 });
  }

  const token1 = await dcmCreateToken1(locker.serie, reserveData, tokenEmpresa);
  const tokenData = await dcmGetToken(locker.serie, token1, tokenEmpresa);

  const newReserveId = createId();
  let [reserve] = await db.insert(schema.reservas)
    .values({
      identifier: newReserveId,
      NroSerie: locker.serie,
      IdSize: locker.size.id,
      IdBox: tokenData?.IdBox,
      IdFisico: tokenData?.IdBox,
      Token1: Number(token1), // ASUMO token numérico!!
      FechaCreacion: tokenData?.FechaCreacion ?? new Date().toISOString(),
      FechaInicio: tokenData?.FechaInicio ?? reserveData.FechaInicio,
      FechaFin: tokenData?.FechaFin ?? reserveData.FechaFin,
      Contador: reserveData.Contador,
      Confirmado: reserveData.Confirmado,
      Modo: reserveData.Modo,
      Cantidad: reserveData.Cantidad,
      IdTransaction: null, // sin API de reservas
      client: body.CustomerEmail,
      nReserve,
      entidadId: entityId,
      status: "pendiente_ubic",
    })
    .returning();

  const [tx] = await db.insert(schema.transactions)
    .values({
      amount: body.TotalAmount,
      client: String(client.identifier),
      confirm: true,
      entidadId: entityId,
      nReserve: nReserve,
    })
    .returning();

  const transaction = tx!;
  const tokensYTamaños: [string, string][] = [
    [token1, locker.size.nombre ?? ""]
  ];

  const storeName = store.name;
  const storeAddress = store.address;
  const fechaInicio = reserve?.FechaInicio ?? "-";
  const fechaFin = reserve?.FechaFin ?? "-";
  const transactionAmount = transaction.amount ?? "";
  const coin = "";
  const backofficeEmail = store.backofficeEmail;

  await sendBackofficeEmail({ tokensYTamaños, backofficeEmail, storeName, storeAddress, nReserve, fechaInicio, fechaFin, coin, transactionAmount, entityId });
}

async function sendBackofficeEmail({
  tokensYTamaños,
  backofficeEmail,
  storeName,
  storeAddress,
  nReserve,
  fechaInicio,
  fechaFin,
  coin,
  transactionAmount,
  entityId
}: {
  tokensYTamaños: [string, string][];
  backofficeEmail: string | null;
  storeName: string;
  storeAddress: string | null;
  nReserve: number;
  fechaInicio: string;
  fechaFin: string;
  coin: string;
  transactionAmount: string | number;
  entityId: string;
}) {
  try {
    var QRCode = require("qrcode");
    const attachments: {
      filename: string;
      content: any;
      type: string;
      disposition: string;
      contentId: string;
    }[] = [];
    await Promise.all(
      tokensYTamaños.map(async (token, index) => {
        const img = await QRCode.toDataURL(token[0]!.toString(), {
          type: "png",
        });

        const qrCode = img.split(";base64,").pop();
        if (qrCode) {
          attachments.push({
            filename: `QR_${token[0]}_${token[1]}.png`,
            content: qrCode,
            type: "image/png",
            disposition: "attachment",
            contentId: `qr_code_${index}`,
          });
        }
      })
    );

    if (!backofficeEmail) {
      console.error(`[${entityId}] stic ord-confirm sin backoffice email para store`, storeName);
      return;
    }

    const sgMail = require("@sendgrid/mail");
    sgMail.setApiKey(env.SENDGRID_API_KEY);

    const msg = {
      to: backofficeEmail,
      from: `${env.MAIL_SENDER}`,
      subject: `PICKPACK: Confirmación de reserva de locker`,
      html: `

      <body>
      <p>Estimado/a Backoffice,</p>
      <p>Nos complace confirmar que tu reserva en ${storeName} en ${storeAddress} ha sido exitosamente procesada. </p>


      <p><strong>N° Reserva</strong></p>
      <p><strong>${nReserve}</strong></p>


      <p><strong>Período</strong></p>
      <p>Entrega desde              ${fechaInicio}</p>
      <p>Recogida hasta             ${fechaFin}</p>

      <p><strong>Códigos de acceso (Tokens)</strong></p>

      <p>
        ${tokensYTamaños
          .map((x) => {
            return `El código de acceso (token) para guardar su paquete es <strong>${x[0]} (${x[1]})</strong><br>`;
          })
          .join("")}
      </p>
      <hr>
      <p><strong>Precio Total</strong>         ${ /* moneda ??*/coin} ${transactionAmount}</p>

      <p>Atentamente,</p>
      <p>el equipo de <strong>PickPack</strong></p>


    </body>`,
      attachments: attachments,
    };
    sgMail
      .send(msg)
      .then(() => {
        console.log("Email sent");
      })
      .catch((e: any) => {
        console.log(e);
      });
  } catch (error) {
    console.error(`[${entityId}] stic ord-confirm error`, error);
  }
}

async function getTokenEmpresa(entityId: string) {
  const tk: PrivateConfigKeys = 'token_empresa';
  const tkValue = await db.query.privateConfig.findFirst({
    where: and(
      eq(schema.privateConfig.key, tk),
      eq(schema.privateConfig.entidadId, entityId)
    )
  });

  const token = tkValue?.value ?? null;
  return token;
}

async function getHookClientByEmail(name: string, email: string, entityId: string) {
  let client = await db.query.clients.findFirst({
    where: and(
      ilike(schema.clients.email, email),
      eq(schema.clients.entidadId, entityId)
    )
  });

  if (!client) {
    const [newClient] = await db.insert(schema.clients)
      .values({
        email: email,
        name: name,
        entidadId: entityId,
      }).returning();

    client = newClient!;
  }
  return client;
}

async function findAnyStoreAndLocker(entityId: string) {
  const allPossibleStores = await db.query.stores.findMany({
    where: eq(schema.stores.entidadId, entityId),
    with: {
      lockers: true,
    },
    columns: {
      address: true,
      name: true,
      cityId: true,
      description: true,
      entidadId: true,
      identifier: true,
      backofficeEmail: true,
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
      ([lockerSizeId, locker]) => locker.cantidadSumada > 0
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

  return { store, locker, lockerSizeId };
}

