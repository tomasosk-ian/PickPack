"use client"
import type { City } from "~/server/api/routers/city";
import HomePage from "../_components/home_page";
import { useState } from "react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { toast } from "sonner";

export function HomeEntityClient({
  entityId,
  lang,
  needsKey,
}: {
  entityId: string;
  lang?: string;
  needsKey: boolean;
}) {
  const [isShowingHome, setShowingHome] = useState(!needsKey);
  const [claveInput, setClaveInput] = useState("");
  const [jwt, setJwt] = useState<string | undefined>();

  const { data: cities = [] } = api.city.listFromEntity.useQuery({ entityId, jwt });
  const { mutateAsync, isLoading } = api.config.signEntityKey.useMutation();

  async function process() {
    try {
      const res = await mutateAsync({
        entityId,
        key: claveInput
      });

      if (res === null) {
        toast.error("Clave incorrecta");
        return;
      }

      setJwt(res);
      setShowingHome(true);
    } catch (e) {
      console.error("Error", e);
    }
  }

  return (
    isShowingHome
    ? <HomePage lang={lang} cities={cities} entityId={entityId} jwt={jwt} />
    : <div className="w-full h-full flex self-centerx">
        <p>Ingrese la clave</p>
        <Input
          value={claveInput}
          onChange={(e) => setClaveInput(e.target.value)}
          placeholder="Clave"
          disabled={isLoading}
        />

        <Button disabled={claveInput.length === 0 || isLoading} onClick={process}>
          Continuar
        </Button>
    </div>
  );
}