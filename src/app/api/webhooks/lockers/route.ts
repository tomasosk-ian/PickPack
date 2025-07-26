import { NextRequest, NextResponse } from "next/server";
import { EVENTS, type TokenUseResponseData, type LockerWebhook, type TokenRequestEditionBody, type TokenRequestCreationBody } from "./types";
import { db } from "~/server/db";
import { Reserve } from "~/server/api/routers/reserves";
import { reservas, stores, storesLockers } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { addTokenToServer, editTokenToServer, isWithinDates, sendPackageDeliveredEmail, sendGoodbyeEmail, addMinutes } from "./helpers";
import { env } from "~/env";

const bearer_token = env.TOKEN_EMPRESA

export async function POST(request: NextRequest) {
	const webhook: LockerWebhook = await request.json()
	console.log(webhook)
	switch (webhook.evento) {
		case EVENTS.TOKEN_USE_RESPONSE:
			await tokenUseResponseHandler(webhook)
			return NextResponse.json({ status: 200 })
		default:
			return NextResponse.json({ status: 200 })
	}
}

async function tokenUseResponseHandler(webhook: LockerWebhook) {
	const webhookData: TokenUseResponseData = JSON.parse((webhook.data as unknown) as string)

	if (webhookData.Respuesta === 'Rechazado') return NextResponse.json({ status: 200 })

	const lockerReservations: Reserve[] = await db.select().from(reservas).where(eq(reservas.NroSerie, webhook.nroSerieLocker))
	const userTokenReservation = lockerReservations.find((reservation) => {
		return reservation.Token2 === parseInt(webhookData.Token) && isWithinDates(reservation.FechaInicio!, reservation.FechaFin!)
	})
	if (userTokenReservation) {
		//TODO: Evitar el reenviado de mail y cambiarle fecha fin al tiempo extra configurado
		await sendGoodbyeEmail({ to: userTokenReservation!.client! })
		return NextResponse.json({ status: 200 })
	}

	const deliveryTokenReservation = lockerReservations.find((reservation) => {
		return reservation.Token1 === parseInt(webhookData.Token)
	})
	if (deliveryTokenReservation?.Token2) {
		return NextResponse.json({ status: 200 })
	}
	// console.log('Reservation:', deliveryTokenReservation)
	await db.update(reservas)
		.set({ IdFisico: webhookData.Box })
		.where(eq(reservas.identifier, deliveryTokenReservation?.identifier!))

	const tokenUseExtraTimeDbResult = await db.select({ tokenUseExtraTime: stores.firstTokenUseTime }).from(stores)
		.innerJoin(storesLockers, eq(stores.identifier, storesLockers.storeId))
		.where(eq(storesLockers.serieLocker, webhook.nroSerieLocker))
	const { tokenUseExtraTime } = tokenUseExtraTimeDbResult[0]!

	const deliveryTokenEndDate = addMinutes(webhook.fechaCreacion, tokenUseExtraTime!)
	// console.log('webhook time:', webhook.fechaCreacion)
	// console.log('delivery token use time limit:', deliveryTokenEndDate)

	const tokenEditBody: TokenRequestEditionBody = {
		token1: deliveryTokenReservation?.Token1!.toString()!,
		fechaFin: deliveryTokenEndDate,
		idBox: -1, //Necesita este valor para que mantenga el box que ya tenía asignado
	}
	const editDeliveryTokenResponse = await editTokenToServer(tokenEditBody, webhook.nroSerieLocker, bearer_token)
	if (!editDeliveryTokenResponse.ok) {
		const error = await editDeliveryTokenResponse.text()
		console.log('Token edition error message:', error)
		return NextResponse.json({ status: 200 })
	}
	const newTokenStartDate = webhook.fechaCreacion.split('.')[0]
	console.log('user token use time limit:', deliveryTokenEndDate)

	const newToken: TokenRequestCreationBody = {
		idSize: deliveryTokenReservation?.IdSize!,
		idBox: webhookData.Box!,
		fechaInicio: newTokenStartDate,
		fechaFin: deliveryTokenReservation?.FechaFin!,
		confirmado: true
	}
	const userTokenCreationResponse = await addTokenToServer(newToken, webhook.nroSerieLocker, bearer_token)
	if (!userTokenCreationResponse.ok) {
		const userTokenCreationError = await userTokenCreationResponse.text()
		console.log('Token creation error message:', userTokenCreationError)
		return NextResponse.json({ status: 200 })
	}
	const token2 = await userTokenCreationResponse.text()
	await db.update(reservas)
		.set({ Token2: parseInt(token2) })
		.where(eq(reservas.identifier, deliveryTokenReservation?.identifier!))

	const lockerAddressDbResult = await db.select({ lockerAddress: stores.address }).from(stores)
		.innerJoin(storesLockers, eq(stores.identifier, storesLockers.storeId))
		.where(eq(storesLockers.serieLocker, webhook.nroSerieLocker))
	const { lockerAddress } = lockerAddressDbResult[0]!
	await sendPackageDeliveredEmail({
		to: deliveryTokenReservation?.client!,
		checkoutTime: deliveryTokenReservation?.FechaFin!,
		userToken: token2,
		lockerAddress: lockerAddress!
	})
}
