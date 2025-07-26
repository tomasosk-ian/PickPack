import { auth, clerkClient } from "@clerk/nextjs/server";
import { List, ListTile } from "~/components/list";
import { Title } from "~/components/title";
import { Badge } from "~/components/ui/badge";
import { Roles } from "~/lib/globals";

export default async function Home() {
  const response = await clerkClient.users.getUserList();
  return (
    <>
      <Title>Usuarios</Title>
      <List>
        {response.data.map((user) => (
          <ListTile
            href={`/panel/usuarios/${user.id}`}
            // key={user.id}
            // leading={<UserAvatarCircle user={user} />}
            title={
              <div className="flex">
                {user.emailAddresses[0]?.emailAddress}{" "}
                {user.fullName && (
                  <div className="px-3">
                    <Badge>{user.fullName}</Badge>
                  </div>
                )}
                {user.publicMetadata.role as Roles}
              </div>
            }
            //   subtitle={<p>{user.role}</p>}
          />
        ))}
      </List>
    </>
  );
}
