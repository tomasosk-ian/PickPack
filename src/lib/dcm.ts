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

export const dcmV2SizeSchema = z.object({
  id: z.number(),
  nombre: z.string().nullish(),
  ancho: z.number().nullish(),
  alto: z.number().nullish(),
  profundidad: z.number().nullish(),
});

export type DCMv2Size = typeof dcmV2SizeSchema._output;

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
    console.error("Error request dcmGetToken:", errorResponse, "para los datos", lockerSerie, reserve);
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

  const response = await reservationResponse.text();
  if (!reservationResponse.ok) {
    throw new Error("Error DCM dcmGetToken: " + response);
  } else {
    try {
      const outputParsed = await dcmV2TokenSchema.safeParseAsync(JSON.parse(response));
      if (outputParsed.error) {
        console.error("dcmGetToken parse error:", outputParsed.error, response);
        throw new Error("Error DCM dcmGetToken parsing");
      }

      return outputParsed.data;
    } catch (e) {
      console.error("Error request dcmGetToken:", e, response, "para los datos", lockerSerie, token1);
      throw new Error("Error DCM dcmGetToken as json");
    }
  }
}

export async function dcmGetLockerSizes(lockerSerie: string, bearerToken: string): Promise<DCMv2Size[]> {
  const reservationResponse = await fetch(
    `${env.SERVER_URL}/api/v2/token/tamaños/${lockerSerie}`,
    {
      method: "GET",
      headers: {
        "Authorization": "Bearer " + bearerToken,
      }
    }
  );

  const response = await reservationResponse.text();
  if (!reservationResponse.ok) {
    throw new Error("Error DCM dcmGetLockerSizes: " + response);
  } else {
    try {
      const outputParsed = await dcmV2SizeSchema.array().safeParseAsync(JSON.parse(response));
      if (outputParsed.error) {
        console.error("dcmGetLockerSizes parse error:", outputParsed.error, response);
        throw new Error("Error DCM dcmGetLockerSizes parsing");
      }

      return outputParsed.data;
    } catch (e) {
      console.error("Error request dcmGetLockerSizes:", e, response, "para los datos", lockerSerie);
      throw new Error("Error DCM dcmGetLockerSizes as json");
    }
  }
}
