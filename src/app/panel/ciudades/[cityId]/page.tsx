import { Title } from "~/components/title";
import { api } from "~/trpc/server";
import CityPage from "./city-page";

export default async function Channel(props: { params: { cityId: string } }) {
  const city = await api.city.getById.query({ cityId: props.params.cityId });

  if (!city) {
    return <Title>No se encontró el canal</Title>;
  }

  return <CityPage city={city} />;
}
