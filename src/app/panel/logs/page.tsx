import { Title } from "~/components/title";
import { List, ListTile } from "~/components/list";
import { api } from "~/trpc/server";
import { tienePermiso } from "~/lib/permisos";
import { redirect } from "next/navigation";
import dayjs from "dayjs";

export default async function Home() {
  const { perms } = await api.user.self.query();
  if (!tienePermiso(perms, "logs")) {
    redirect("/accessdenied");
    return <></>;
  }

  const logs = await api.logs.listRecent.query();

  return (
    <section className="space-y-2">
      <div className="flex justify-between">
        <Title>Logs</Title>
      </div>
      <List>
        {logs.map((log) => {
          return (
            <ListTile
              title={log.text}
              subtitle={dayjs(log.date).format("DD/MM/YYYY HH:mm")}
            />
          );
        })}
      </List>
    </section>
  );
}
