import { NextRequest, NextResponse } from "next/server";
import {
  EVENTS,
  type TokenUseResponseData,
  type LockerWebhook,
  type TokenRequestCreationBody,
} from "./types";
import { db, schema } from "~/server/db";
import { Reserve } from "~/server/api/routers/reserves";
import { reservas } from "~/server/db/schema";
import { and, eq } from "drizzle-orm";
import {
  addTokenToServer,
  isWithinDates,
  sendPackageDeliveredEmail,
  sendGoodbyeEmail,
  editTokenToServerWithStoreExtraTime,
  getLockerAddress,
  getTokenUseExtraTime,
  addMinutes,
  sendEmailTest,
} from "./helpers";
import { PrivateConfigKeys } from "~/lib/config";

const tk: PrivateConfigKeys = "token_empresa";

export async function POST(request: NextRequest) {
  const webhook: LockerWebhook = await request.json();

  console.log(webhook);

  switch (webhook.evento) {
    case EVENTS.TOKEN_USE_RESPONSE:
      await tokenUseResponseHandler(webhook);
      return NextResponse.json({ status: 200 });
    default:
      return NextResponse.json({ status: 200 });
  }
}

async function tokenUseResponseHandler(webhook: LockerWebhook) {
  const storeRelation = await db.query.storesLockers.findFirst({
    where: eq(schema.storesLockers.serieLocker, webhook.nroSerieLocker),
  });
  if (!storeRelation) {
    console.log("error, nro de serie no asignado a ningún local");
    return;
  }

  const store = await db.query.stores.findFirst({
    where: eq(schema.stores.identifier, storeRelation.storeId),
    columns: {
      address: true,
      cityId: true,
      description: true,
      entidadId: true,
      identifier: true,
      image: true,
      name: true,
      organizationName: true,
      firstTokenUseTime: true,
    }
  });

  if (!store || !store.entidadId) {
    console.log("error, entidad no encontrada");
    return;
  }
  const bearer_token = (
    await db.query.privateConfig.findFirst({
      where: and(
        eq(schema.privateConfig.key, tk),
        eq(schema.privateConfig.entidadId, store.entidadId),
      ),
    })
  )?.value!;

  const webhookData: TokenUseResponseData = JSON.parse(
    webhook.data as unknown as string,
  );

  if (webhookData.Respuesta === "Rechazado") {
    return;
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
      console.log(`Token de usuario ${webhookData.Token}, uso repetido`);
      return;
    }

    console.log(`Token de usuario ${webhookData.Token}, primer uso`);

    const tokenUseExtraTime = await getTokenUseExtraTime(
      webhook.nroSerieLocker,
    );

    const reservationEndDate = addMinutes(
      webhook.fechaCreacion,
      tokenUseExtraTime!,
    );
    await db
      .update(reservas)
      .set({ Token2Used: true, FechaFin: reservationEndDate })
      .where(eq(reservas.identifier, userTokenReservation.identifier!));

    const editUserTokenResponse = await editTokenToServerWithStoreExtraTime(
      webhookData.Token,
      webhook,
      bearer_token,
    );
    if (!editUserTokenResponse.ok) {
      //TODO: Manejar el caso en el que falla el servidor, enviando un mail a algún administrador por ejemplo
      const error = await editUserTokenResponse.text();
      console.log(
        `El servidor falló editando el token de usuario ${webhookData.Token} con el siguiente mensaje de error: ${error}`,
      );
    }
    await sendGoodbyeEmail({ to: userTokenReservation!.client! });
    return;
  }

  const deliveryTokenReservation = lockerReservations.find((reservation) => {
    return reservation.Token1 === parseInt(webhookData.Token);
  });
  if (deliveryTokenReservation?.Token2) {
    console.log(`Token de repartidor ${webhookData.Token}, uso repetido`);
    return;
  }

  console.log(`Token de repartidor ${webhookData.Token}, primer uso`);

  await db
    .update(reservas)
    .set({ IdFisico: webhookData.Box })
    .where(eq(reservas.identifier, deliveryTokenReservation?.identifier!));

  const editDeliveryTokenResponse = await editTokenToServerWithStoreExtraTime(
    webhookData.Token,
    webhook,
    bearer_token,
  );
  console.log("Bearer token:", bearer_token);

  if (!editDeliveryTokenResponse.ok) {
    const error = await editDeliveryTokenResponse.text();
    console.log(
      `El servidor falló editando el token de repartidor ${webhookData.Token} con el siguiente mensaje de error: ${error}`,
    );
    return;
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
    const error = await userTokenCreationResponse.text();
    console.log(
      `El servidor falló creando un nuevo token de usuario para el token de repartidor ${webhookData.Token} con el siguiente mensaje de error: ${error}`,
    );
    console.log("Con el siguiente body:", newToken);
    console.log("Bearer token:", bearer_token);
    return;
  }
  const token2 = await userTokenCreationResponse.text();
  await db
    .update(reservas)
    .set({ Token2: parseInt(token2) })
    .where(eq(reservas.identifier, deliveryTokenReservation?.identifier!));

  const lockerAddress = await getLockerAddress(webhook.nroSerieLocker);
  await sendPackageDeliveredEmail({
    to: deliveryTokenReservation?.client!,
    checkoutTime: deliveryTokenReservation?.FechaFin!,
    userToken: token2,
    lockerAddress: lockerAddress!,
  });
}
