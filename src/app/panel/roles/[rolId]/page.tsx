import { Title } from "~/components/title";
import { api } from "~/trpc/server";
import UserPage from "./page-client";

export default async function Home(props: { params: { rolId: string } }) {
  const { roles } = await api.user.self.query();
  const rol = await api.user.getRol.query({ id: (await props.params).rolId });
  if (!rol) {
    return <Title>Rol no encontrado</Title>;
  }

  const tengoElRol = roles.find((v) => v.id === rol.id);
  return (
    <UserPage
      rol={rol}
      tengoElRolAsignado={typeof tengoElRol !== "undefined"}
    />
  );
}
