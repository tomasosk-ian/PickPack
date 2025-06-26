import { Title } from "~/components/title";
import { api } from "~/trpc/server";
import ClientPage from "./client-page";

export default async function Channel(props: { params: { clientId: string } }) {
  const client = await api.clients.getById.query({
    identifier: parseInt(props.params.clientId),
  });
  const reservasRecord = await api.reserve.getByClient.query({
    clientId: client?.identifier!,
  });
  if (!client) {
    return <Title>No se encontró el cliente.</Title>;
  }

  return <ClientPage client={client} reservasRecord={reservasRecord} />;
}
