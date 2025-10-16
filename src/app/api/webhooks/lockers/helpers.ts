import {
  LockerWebhook,
  TokenRequestCreationBody,
  TokenRequestEditionBody,
} from "./types";
import sendgrid from "@sendgrid/mail";
import { Html, render } from "@react-email/components";
import { db } from "~/server/db";
import { env } from "~/env";
import { stores, storesLockers } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { basename } from "node:path";

const base_url = `${env.SERVER_URL}/api/v2/token`;

export async function addTokenToServer(
  token: TokenRequestCreationBody,
  lockerSerial: string,
  bearerToken: string,
) {
  const response = await fetch(`${base_url}/${lockerSerial}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(token),
  });
  return response;
}

export async function editTokenToServer(
  token: TokenRequestEditionBody,
  lockerSerial: string,
  bearerToken: string,
) {
  const response = await fetch(`${base_url}/${lockerSerial}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(token),
  });

  return response;
}

export async function sendPackageDeliveredEmail({
  to,
  lockerAddress,
  checkoutTime,
  userToken,
}: {
  to: string;
  lockerAddress: string;
  checkoutTime: string;
  userToken: string;
}) {
  var QRCode = require("qrcode");
  // Generar data URL del QR
  const dataUrl: string = await QRCode.toDataURL(userToken, { type: "png" });
  // Extraer solo el Base64 (sin el prefijo "data:image/png;base64,")
  const base64 = dataUrl.split(";base64,").pop()!;
  const fechaFin = checkoutTime.split("T")[0];
  const horaFin = checkoutTime.split("T")[1];
  sendgrid.setApiKey(env.SENDGRID_API_KEY);
  const msg = {
    to,
    from: env.MAIL_SENDER,
    subject: "PICKPACK: Paquete listo para ser recogido",
    html: `
			<body>

				<p>El paquete destinado a su locker reservado en ${lockerAddress} fue entregado. Le recordamos que el tiempo límite para pasarlo a buscar es ${horaFin} del ${fechaFin}</p>

				<p><strong>Su código de acceso (Token) para retirar su paquete es ${userToken}</strong></p>

				<p>Atentamente,</p>
				<p>el equipo de <strong>PickPack</strong></p>

			</body>`,
    attachments: [
      {
        filename: `QR_${userToken}.png`,
        content: base64,
        type: "image/png",
        disposition: "attachment",
        contentId: "qr_code_delivery",
      },
    ],
  };
  try {
    console.log("ANTES DE MAIL DE PAQUETE LISTO");
    console.time("MAIL DE AVISO DE PAQUETE LISTO");
    await sendgrid.send(msg);
    console.timeEnd("MAIL DE AVISO DE PAQUETE LISTO");
  } catch (error) {
    console.log("Hubo un problema al enviar el mail. El error fue:", error);
  }
}

export async function sendGoodbyeEmail({ to }: { to: string }) {
  // const qrCode = await QRCode.toDataURL(userToken);

  sendgrid.setApiKey(env.SENDGRID_API_KEY);
  const msg = {
    to,
    from: env.MAIL_SENDER,
    subject: "PICKPACK: paquete recogido",
    html: `
			<body>

				<p>Gracias por confiar en <strong>PickPack</strong>, esperamos que nuestro servicio haya sido de su agrado.</p>

				<p>Atentamente,</p>
				<p>el equipo de <strong>PickPack</strong></p>

			</body>`,
    // attachments: [
    // 	{
    // 		filename: `${userToken}.png`,
    // 		content: qrCode,
    // 		type: 'image/png',
    // 		disposition: 'attachment'
    // 	}
    // ],
  };
  try {
    console.log("ANTES DE MAIL DE DESPEDIDA");
    console.time("MAIL DE DESPEDIDA");
    await sendgrid.send(msg);
    console.timeEnd("MAIL DE DESPEDIDA");
  } catch (error) {
    console.log("Hubo un problema al enviar el mail. El error fue:", error);
  }
}
export async function sendEmailTest(
  { to }: { to: string },
  { body }: { body: LockerWebhook },
) {
  // const qrCode = await QRCode.toDataURL(userToken);

  sendgrid.setApiKey(env.SENDGRID_API_KEY);
  const msg = {
    to,
    from: env.MAIL_SENDER,
    subject: "prueba wh",
    html: `
			<body>
<p>${body.data}
</p>
				<p>${body.descripcion}
</p>
<p>${body.evento}
</p>
<p>${body.fechaCreacion}
</p>
<p>${body.nroSerieLocker}
</p>
			</body>`,
    // attachments: [
    // 	{
    // 		filename: `${userToken}.png`,
    // 		content: qrCode,
    // 		type: 'image/png',
    // 		disposition: 'attachment'
    // 	}
    // ],
  };
  try {
    console.log("ANTES DE MAIL DE DESPEDIDA");
    console.time("MAIL DE DESPEDIDA");
    await sendgrid.send(msg);
    console.timeEnd("MAIL DE DESPEDIDA");
  } catch (error) {
    console.log("Hubo un problema al enviar el mail. El error fue:", error);
  }
}
export function isWithinDates(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const now = new Date(Date.now());
  return startDate <= now && now <= endDate;
}

export function addMinutes(base: string, toAdd: number): string {
  const baseDate = new Date(base);
  baseDate.setMinutes(baseDate.getMinutes() + toAdd - 60 * 3); //GMT-3
  return baseDate.toISOString().split(".")[0]!;
}

export async function getTokenUseExtraTime(lockerSerial: string) {
  const tokenUseExtraTimeDbResult = await db
    .select({ tokenUseExtraTime: stores.firstTokenUseTime })
    .from(stores)
    .innerJoin(storesLockers, eq(stores.identifier, storesLockers.storeId))
    .where(eq(storesLockers.serieLocker, lockerSerial));
  const { tokenUseExtraTime } = tokenUseExtraTimeDbResult[0]!;
  return tokenUseExtraTime;
}

export async function editTokenToServerWithStoreExtraTime(
  token: string,
  webhook: LockerWebhook,
  bearerToken: string,
) {
  const tokenUseExtraTime = await getTokenUseExtraTime(webhook.nroSerieLocker);

  const tokenEndDate = addMinutes(webhook.fechaCreacion, tokenUseExtraTime!);

  const tokenEditBody: TokenRequestEditionBody = {
    token1: token,
    fechaFin: tokenEndDate,
    idBox: -1, //Necesita este valor para que mantenga el box que ya tenía asignado
  };

  console.log(
    "Petición al servidor para editar con el siguiente body:",
    tokenEditBody,
  );

  const editDeliveryTokenResponse = await editTokenToServer(
    tokenEditBody,
    webhook.nroSerieLocker,
    bearerToken,
  );

  return editDeliveryTokenResponse;
}

export async function getLockerAddress(lockerSerial: string) {
  const lockerAddressDbResult = await db
    .select({ lockerAddress: stores.address })
    .from(stores)
    .innerJoin(storesLockers, eq(stores.identifier, storesLockers.storeId))
    .where(eq(storesLockers.serieLocker, lockerSerial));
  const { lockerAddress } = lockerAddressDbResult[0]!;
  return lockerAddress;
}
