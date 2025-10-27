import dayjs from "dayjs";
import { and, eq, like, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { env } from "~/env";
import { PrivateConfigKeys } from "~/lib/config";
import { dcmCreateToken1, dcmGetLockerSizes, dcmGetToken, DCMv2TokenCreate } from "~/lib/dcm";
import { sticEvtWebhookConfirmedOrderSchema } from "~/lib/stic/models";
import { createId } from "~/lib/utils";
import { sizesList } from "~/server/api/routers/sizes";
import { db, schema } from "~/server/db";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

export async function sticProcessOrder({
  entityId,
  entidad,
  body,
}: {
  entityId: string,
  entidad: typeof schema.companies.$inferSelect,
  body: typeof sticEvtWebhookConfirmedOrderSchema._output,
}) {
  const client = await getHookClientByEmail(body.CustomerName, body.CustomerEmail, entityId);

  const [newReservaToClient] = await db
    .insert(schema.reservasToClients)
    .values({
      clientId: client.identifier,
    })
    .returning();

  const reservaToClient = newReservaToClient!;
  const nReserve = reservaToClient.identifier;

  const tokenEmpresa = await getTokenEmpresa(entityId);
  if (!tokenEmpresa) {
    console.error(`[${entityId}] stic ord-confirm no token empresa for dcm`);
    return NextResponse.json(null, { status: 500 });
  }

  // TODO: CAMBIAR
  // Agarra cualquier store, cualquier locker.
  const { store, locker, size } = await findAnyStoreAndLocker(entityId, tokenEmpresa);

  if (!store || !locker || !size) {
    console.error(`[${entityId}] stic ord-confirm no store or locker available`, store, locker);
    return NextResponse.json(null, { status: 500 });
  }

  const reserveData: DCMv2TokenCreate = {
    idSize: size.id,
    // fechaInicio: new Date().toISOString(),
    confirmado: true,
    cantidad: 1,
  };

  const token1 = await dcmCreateToken1(locker.serieLocker, reserveData, tokenEmpresa);
  const tokenData = await dcmGetToken(locker.serieLocker, token1, tokenEmpresa);

  const newReserveId = createId();
  const [reserve] = await db.insert(schema.reservas)
    .values({
      identifier: newReserveId,
      NroSerie: locker.serieLocker,
      IdSize: size.id,
      IdBox: tokenData?.idBox,
      IdFisico: tokenData?.idBox,
      Token1: Number(token1), // ASUMO token numérico!!
      FechaCreacion: tokenData?.fechaCreacion ?? new Date().toISOString(),
      FechaInicio: tokenData?.fechaInicio ?? reserveData.fechaInicio,
      FechaFin: tokenData?.fechaFin ?? reserveData.fechaFin,
      Contador: reserveData.contador,
      Confirmado: reserveData.confirmado,
      Modo: reserveData.modo,
      Cantidad: reserveData.cantidad,
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
    [token1, size.nombre ?? ""]
  ];

  const storeName = store.name;
  const storeAddress = store.address;
  const fechaInicio = reserve?.FechaInicio ?? "-";
  const fechaFin = reserve?.FechaFin ?? "-";
  const transactionAmount = transaction.amount ?? "";
  const coin = "";
  const backofficeEmail = store.backofficeEmail;

  await sendBackofficeEmail({ tokensYTamaños, backofficeEmail, storeName, storeAddress, nReserve, fechaInicio, fechaFin, coin, transactionAmount, entityId });
  return NextResponse.json(null, { status: 200 });
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

    if (!backofficeEmail || !backofficeEmail.includes("@")) {
      console.error(`[${entityId}] stic ord-confirm sin backoffice email para store`, storeName, backofficeEmail);
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
      like(sql`UPPER(${schema.clients.email})`, email.toUpperCase()),
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

// TODO: CAMBIAR ASIGNACION
// TODO: CAMBIAR ASIGNACION
// TODO: CAMBIAR ASIGNACION
// TODO: CAMBIAR ASIGNACION
// TODO: CAMBIAR ASIGNACION
async function findAnyStoreAndLocker(entityId: string, bearerToken: string) {
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

  let store = null, locker = null, size = null;
  for (const possibleStore of allPossibleStores) {
    const anyLocker = await db.query.storesLockers.findFirst({
      where: eq(schema.storesLockers.storeId, possibleStore.identifier)
    });

    if (!anyLocker) {
      continue;
    }

    const allPossibleSizes = await dcmGetLockerSizes(anyLocker.serieLocker, bearerToken);
    if (allPossibleSizes.length === 0) {
      continue;
    }

    size = allPossibleSizes.at(0)!;
    store = possibleStore;
    locker = anyLocker;
    break;
  }

  return { store, locker, lockerSerial: locker?.serieLocker ?? null, size };
}
