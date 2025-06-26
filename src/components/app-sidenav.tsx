"use client"
import Sidenav, { SidenavItem, SidenavSeparator } from "./sidenav";
import {
  AlignStartVerticalIcon,
  CloudIcon,
  CogIcon,
  DollarSignIcon,
  GroupIcon,
  KeyRound,
  ReceiptIcon,
  UserIcon,
  LayoutDashboardIcon,
  PercentCircleIcon,
  AreaChartIcon,
  BanIcon,
} from "lucide-react";
import { About } from "./about-dialog";
import { usePerms } from "./perms-provider";
import SelectEntidad from "./selector-entidad";

export default function AppSidenav() {
  const { isAdmin } = usePerms();

  return (
    <div className="text-xs">
      <Sidenav>
        <SelectEntidad />

        {isAdmin && <SidenavSeparator>Mantenimiento</SidenavSeparator>}
        {isAdmin && (
          <SidenavItem icon={<UserIcon />} href="/panel/usuarios">
            Usuarios
          </SidenavItem>
        )}
        {isAdmin && (
          <SidenavItem icon={<BanIcon />} disabled={true}>
            Roles
          </SidenavItem>
        )}
        {isAdmin && (
          <SidenavItem icon={<KeyRound />} disabled={true}>
            Permisos
          </SidenavItem>
        )}
        {isAdmin && (
          <SidenavItem
            icon={<AreaChartIcon />}
            disabled={false}
            href="/panel/reportes"
          >
            Reportes
          </SidenavItem>
        )}{" "}
        {isAdmin && (
          <SidenavItem
            icon={<CogIcon />}
            disabled={false}
            href="/panel/parametros"
          >
            Parámetros
          </SidenavItem>
        )}
        <SidenavSeparator>Administración</SidenavSeparator>
        <SidenavItem icon={<LayoutDashboardIcon />} href="/panel/monitor">
          Monitor
        </SidenavItem>
        <SidenavItem icon={<CloudIcon />} href="/panel/ciudades">
          Ciudades{" "}
        </SidenavItem>
        <SidenavItem icon={<AlignStartVerticalIcon />} href="/panel/locales">
          Locales
        </SidenavItem>
        <SidenavItem icon={<GroupIcon />} href="/panel/tamanos">
          Tamaños
        </SidenavItem>
        <SidenavItem icon={<DollarSignIcon />} href="/panel/monedas">
          Monedas
        </SidenavItem>
        <SidenavItem icon={<CloudIcon />} href="/panel/clientes">
          Clientes{" "}
        </SidenavItem>
        <SidenavItem icon={<ReceiptIcon />} href="/panel/reservas">
          Reservas
        </SidenavItem>
        <SidenavItem icon={<PercentCircleIcon />} href="/panel/cupones">
          Cupones{" "}
        </SidenavItem>
        <div className="bottom-0 right-0 px-5">
          <About />
        </div>
      </Sidenav>
    </div>
  );
}
