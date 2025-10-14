import { HomeWithEntity } from "../page";

export default async function Page(props: {
  params: { entityId: string };
}) {
  return <HomeWithEntity entityId={props.params.entityId} />;
}