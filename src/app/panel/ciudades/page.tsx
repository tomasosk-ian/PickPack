import { Title } from "~/components/title";
import { AddCityDialog } from "../add-city-dialog";
import { List, ListTile } from "~/components/list";
import { api } from "~/trpc/server";

export default async function Home() {
  const cities = await api.city.get.query();

  return (
    <section className="space-y-2">
      <div className="flex justify-between">
        <Title>Ciudades</Title>
        <AddCityDialog />
      </div>
      <List>
        {cities.map((city) => {
          return (
            <ListTile
              href={`/panel/ciudades/${city.identifier}`}
              title={city.name}
            />
          );
        })}
      </List>
    </section>
  );
}
