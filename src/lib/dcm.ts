import { z } from "zod";
import { env } from "~/env";

// los nullish los puse a criterio para no poner precondiciones tan estrictas
export const dcmV2TokenSchema = z.object({
  id: z.number().nullish(),
  idLocker: z.number().nullish(),
  idSize: z.number(),
  idBox: z.number().nullish(),
  token1: z.string(),
  fechaCreacion: z.string(),
  fechaInicio: z.string().nullish(),
  fechaFin: z.string().nullish(),
  contador: z.number(),
  cantidad: z.number(),
  confirmado: z.boolean(),
  modo: z.string().nullish(),
});

export type DCMv2Token = typeof dcmV2TokenSchema._output;

export const dcmV2TokenCreateSchema = dcmV2TokenSchema
  .partial()
  .required({ idSize: true });

export type DCMv2TokenCreate = typeof dcmV2TokenCreateSchema._output;

export async function dcmCreateToken1(lockerSerie: string, reserve: DCMv2TokenCreate, bearerToken: string): Promise<string> {
  const reservationResponse = await fetch(
    `${env.SERVER_URL}/api/v2/token/${lockerSerie}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + bearerToken,
      },
      body: JSON.stringify(reserve),
    }
  );

  if (!reservationResponse.ok) {
    const errorResponse = await reservationResponse.text();
    throw new Error("Error DCM dcmCreateToken: " + errorResponse);
  } else {
    return await reservationResponse.text();
  }
}

export async function dcmGetToken(lockerSerie: string, token1: string, bearerToken: string): Promise<DCMv2Token> {
  const reservationResponse = await fetch(
    `${env.SERVER_URL}/api/v2/token/${lockerSerie}/${token1}`,
    {
      method: "GET",
      headers: {
        "Authorization": "Bearer " + bearerToken,
      }
    }
  );

  if (!reservationResponse.ok) {
    const errorResponse = await reservationResponse.text();
    throw new Error("Error DCM dcmGetToken: " + errorResponse);
  } else {
    const output: unknown = await reservationResponse.json();
    const outputParsed = await dcmV2TokenSchema.safeParseAsync(output);
    if (outputParsed.error) {
      console.error("dcmGetToken parse error:", outputParsed.error, output);
      throw new Error("Error DCM dcmGetToken parsing");
    }

    return outputParsed.data;
  }
}
