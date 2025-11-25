import { db, schema } from "~/server/db";
import { SticOrder, sticOrderListRequestSchema, sticOrderListResponseSchema } from "./models";
import { PrivateConfigKeys } from "../config";
import { eq } from "drizzle-orm";

const TiendaSticApiServer = 'https://api.batitienda.com/2023_06';

export class TiendaStic {
  private apiKey: string;

  constructor (apiKey: string) {
    this.apiKey = apiKey;
  }

  private postRequest(endpoint: string, body: unknown): Promise<Response> {
    endpoint = endpoint.trim();
    if (!endpoint.startsWith("/")) {
      endpoint = "/" + endpoint;
    }
  
    return fetch(TiendaSticApiServer + endpoint, {
      method: "POST",
      headers: [
        ["Content-Type", "application/json"],
        ["Authorization", "Bearer " + this.apiKey],
      ],
      body: JSON.stringify(body),
    });
  }

  public async getOrder(id: number): Promise<SticOrder>  {
    const body: typeof sticOrderListRequestSchema._input = {
      fetch: {
        billing: false,
        customer: false,
        discount: false,
        externalSynchronization: false,
        items: false,
        notes: false,
        packing: false,
        payment: false,
        shipping: true,
        summary: false,
      },
      filter: {
        order_ids: [id]
      }
    };
    
    const response = await this.postRequest("/order/list", body);
    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(`[${id}] (${response.status}) TiendaStic error response Order List: ${responseText}`);
    }

    let responseJson;
    try {
      responseJson = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`[${id}] (${response.status}) TiendaStic error invalid json (JSON parse) Order List: ${responseText}`);
    }

    const validatedJson = sticOrderListResponseSchema.safeParse(responseJson);
    if (validatedJson.error) {
      throw new Error(`[${id}] (${response.status}) TiendaStic error invalid json (ZOD parse) Order List: ${responseText}, with errors: ${JSON.stringify(validatedJson.error)}`);
    }

    if (validatedJson.data.results.length !== 1) {
      throw new Error(`[${id}] (${response.status}) TiendaStic order not found or invalid results: ${validatedJson.data.results.length}, complete response: ${JSON.stringify(responseJson)}`);
    }

    return validatedJson.data.results[0]!;
  }
}

export async function tiendastic(): Promise<TiendaStic> {
  const pKey: PrivateConfigKeys = 'batitienda_key';
  const key = await db.query.privateConfig.findFirst({
    where: eq(schema.privateConfig.key, pKey)
  });

  if (!key) {
    throw new Error("tiendastic(): no batitienda key");
  }

  return new TiendaStic(key.value);
}
