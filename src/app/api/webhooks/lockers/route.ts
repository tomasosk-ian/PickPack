import { NextRequest, NextResponse } from "next/server";
import {
  EVENTS,
  type TokenUseResponseData,
  type LockerWebhook,
  type TokenRequestCreationBody,
} from "./types";
import { db } from "~/server/db";
import { Reserve } from "~/server/api/routers/reserves";
import { reservas } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import {
  addTokenToServer,
  isWithinDates,
  sendPackageDeliveredEmail,
  sendGoodbyeEmail,
  editTokenToServerWithStoreExtraTime,
  getLockerAddress,
} from "./helpers";
import { env } from "~/env";

const bearer_token = env.TOKEN_EMPRESA!;

export async function POST(request: NextRequest) {
  if (!bearer_token) {
    console.error("!bearer_token, falta env.TOKEN_EMPRESA");
    return NextResponse.json({ status: 500 });
  }
  const webhook: LockerWebhook = await request.json();

  switch (webhook.evento) {
    case EVENTS.TOKEN_USE_RESPONSE:
      await tokenUseResponseHandler(webhook);
      return NextResponse.json({ status: 200 });
    default:
      return NextResponse.json({ status: 200 });
  }
}

async function tokenUseResponseHandler(webhook: LockerWebhook) {

  const webhookData: TokenUseResponseData = JSON.parse(
    webhook.data as unknown as string,
  );

  if (webhookData.Respuesta === "Rechazado") {
    return
  }

  const lockerReservations: Reserve[] = await db
    .select()
    .from(reservas)
    .where(eq(reservas.NroSerie, webhook.nroSerieLocker));
  const userTokenReservation = lockerReservations.find((reservation) => {
    return (
      reservation.Token2 === parseInt(webhookData.Token) &&
      isWithinDates(reservation.FechaInicio!, reservation.FechaFin!)
    );
  });

  if (userTokenReservation) {
    if (userTokenReservation.Token2Used) {
      return
    }

    await db
      .update(reservas)
      .set({ Token2Used: true })
      .where(eq(reservas.identifier, userTokenReservation.identifier!));

    const editDeliveryTokenResponse = await editTokenToServerWithStoreExtraTime(
      webhookData.Token,
      webhook,
      bearer_token
    )
    if (!editDeliveryTokenResponse.ok) {
      //TODO: Manejar el caso en el que falla el servidor, enviando un mail a algún administrador por ejemplo
      console.log("El servidor falló editando un token")
    }
    await sendGoodbyeEmail({ to: userTokenReservation!.client! });
    return
  }

  const deliveryTokenReservation = lockerReservations.find((reservation) => {
    return reservation.Token1 === parseInt(webhookData.Token);
  });
  if (deliveryTokenReservation?.Token2) {
    return
  }
  await db
    .update(reservas)
    .set({ IdFisico: webhookData.Box })
    .where(eq(reservas.identifier, deliveryTokenReservation?.identifier!));

  const editDeliveryTokenResponse = await editTokenToServerWithStoreExtraTime(
    webhookData.Token,
    webhook,
    bearer_token
  )
  if (!editDeliveryTokenResponse.ok) {
    const error = await editDeliveryTokenResponse.text();
    console.log("Token edition error message:", error);
    return
  }
  const newTokenStartDate = webhook.fechaCreacion.split(".")[0];

  const newToken: TokenRequestCreationBody = {
    idSize: deliveryTokenReservation?.IdSize!,
    idBox: webhookData.Box!,
    fechaInicio: newTokenStartDate,
    fechaFin: deliveryTokenReservation?.FechaFin!,
    confirmado: true,
  };
  const userTokenCreationResponse = await addTokenToServer(
    newToken,
    webhook.nroSerieLocker,
    bearer_token,
  );
  if (!userTokenCreationResponse.ok) {
    const userTokenCreationError = await userTokenCreationResponse.text();
    console.log("Token creation error message:", userTokenCreationError);
    return
  }
  const token2 = await userTokenCreationResponse.text();
  await db
    .update(reservas)
    .set({ Token2: parseInt(token2) })
    .where(eq(reservas.identifier, deliveryTokenReservation?.identifier!));

  const lockerAddress = await getLockerAddress(webhook.nroSerieLocker)
  await sendPackageDeliveredEmail({
    to: deliveryTokenReservation?.client!,
    checkoutTime: deliveryTokenReservation?.FechaFin!,
    userToken: token2,
    lockerAddress: lockerAddress!,
  });
}

