import { getLocale } from "next-intl/server";
import { HomeHeader } from "../page";
import { api } from "~/trpc/server";
import { HomeEntityClient } from "./page-client";

export default async function Page(props: {
  params: { entityId: string };
}) {
  const locale = await getLocale();
  const needsKey = await api.config.needsEntityKey.query({ entityId: props.params.entityId })

  return <HomeHeader locale={locale}>
    <HomeEntityClient lang={locale} needsKey={needsKey} entityId={props.params.entityId} />
  </HomeHeader>;
}