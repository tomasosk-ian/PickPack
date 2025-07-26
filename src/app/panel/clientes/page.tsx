import { api } from "~/trpc/server";
import { type ClientTableRecord } from "./columns";
import { PageCliente } from "./page-client";

export default async function Home() {
  const clientes = await api.client.getGroupedByEmail.query();

  const uniqueClientes = Object.values(clientes)
    .map((clientList) => clientList[0])
    .filter((client): client is ClientTableRecord => client !== undefined);

  return <PageCliente uniqueClientes={uniqueClientes} />;
}
