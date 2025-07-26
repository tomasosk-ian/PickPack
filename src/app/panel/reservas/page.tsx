import { api } from "~/trpc/server";

import ReservesComponent from "./reserves-component";

export default async function Home() {
  const activesReserves = await api.reserve.getActive.query();
  const allReserves = await api.reserve.get.query();
  const stores = await api.store.get.query();
  return <ReservesComponent
      activesReserves={activesReserves}
      allReserves={allReserves}
      stores={stores}
    />;
}
