import { Title } from "~/components/title";
import { api } from "~/trpc/server";
import ReservePage from "./reserve-page";
import { auth } from "@clerk/nextjs/server";

export default async function Reserve(props: { params: { nReserve: string } }) {
  const isAdmin = auth().protect().sessionClaims.metadata.role == "admin";
  const reserve = await api.reserve.getBynReserve.query({
    nReserve: parseInt(props.params.nReserve),
  });

  const stores = await api.store.listPublic.query();
  const store = stores.find((s) => s.lockers.some(l => l.serieLocker == reserve[0]!.NroSerie!))!

  const sizes = await api.size.getProt.query({
    store: null
  });

  const transaction = await api.transaction.getBynroReserve.query({
    nReserve: reserve[0]!.nReserve!,
  });
  // const size = await api.size.getById.query({ sizeId: reserve?.IdSize! });

  if (!reserve) {
    return <Title>No se encontró la reserva</Title>;
  }

  return (
    <ReservePage
      reserve={reserve}
      sizes={sizes}
      transaction={transaction}
      isAdmin={isAdmin}
      store={store}
    />
  );
}
