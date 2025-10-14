"use client"
import HomePage from "../_components/home_page";
import { useEffect, useState } from "react";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import ButtonCustomComponent from "~/components/buttonCustom";

export function HomeEntityClient({
  entityId,
  lang,
  needsKey,
}: {
  entityId: string;
  lang?: string;
  needsKey: boolean;
}) {
  const [isShowingHome, setShowingHome] = useState(false);
  const [claveInput, setClaveInput] = useState("");
  const [jwt, setJwt] = useState<string | undefined>();

  const { data: cities = [] } = api.city.listFromEntity.useQuery({ entityId, jwt });
  const { mutateAsync, isLoading } = api.config.signEntityKey.useMutation();

  useEffect(() => {
    if (!needsKey) {
      setJwt("");
      setShowingHome(true);
    }
  }, []);

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
    : <div className="w-full h-[100vh] flex items-center justify-center">
        <div className="w-[200px] h-[30%] flex items-center justify-center flex-col">
          <p className="text-2xl font-semibold mb-3">Ingrese la clave</p>
          <div className="flex flex-row gap-4">
            <Input
              value={claveInput}
              onChange={(e) => setClaveInput(e.target.value)}
              placeholder="Clave"
              disabled={isLoading}
            />

            <ButtonCustomComponent disabled={claveInput.length === 0 || isLoading} onClick={process} text="Continuar" />
          </div>
        </div>  
      </div>
  );
}