// columns.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Reserve } from "~/server/api/routers/reserves";

export const ReservaStateTranslations: Record<NonNullable<Reserve['status']>, string> = {
  "pendiente_ubic": "Pendiente de ubic.",
  "ubicada": "Ubicada",
  "retirada": "Retirada",
};

// Definir el tipo de datos para la tabla de reservas.
export type ReserveTableRecord = {
  nReserve: number | null;
  externalNReserve: string | null;
  token1: number | null;
  token2: number | null;
  storeName?: string | null;
  client: string | null;
  status: Reserve['status']
};

export const columns: ColumnDef<ReserveTableRecord>[] = [
  {
    accessorKey: "nReserve",
    header: "N° Reserva",
    cell: ({ row }) => (
      <div className="text-center">{row.getValue("nReserve") || "-"}</div>
    ),
  },
  {
    accessorKey: "token1",
    header: "Token de repartidor",
    cell: ({ row }) => (
      <div className="text-center">{row.getValue("token1") || "-"}</div>
    ),
  },
  {
    accessorKey: "token2",
    header: "Token de usuario",
    cell: ({ row }) => (
      <div className="text-center">{row.getValue("token2") || "-"}</div>
    ),
  },
  {
    accessorKey: "storeName",
    header: "Local",
    cell: ({ row }) => (
      <div className="text-center">{row.getValue("storeName") || "-"}</div>
    ),
  },
  {
    accessorKey: "client",
    header: "Email",
    cell: ({ row }) => (
      <div className="text-center">{row.getValue("client") || "-"}</div>
    ),
  },
  {
    accessorKey: "externalNReserve",
    header: "N° Pedido",
    cell: ({ row }) => (
      <div className="text-center">{row.getValue("externalNReserve") || "-"}</div>
    ),
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => (
      <div className="text-center">{(row.getValue("status") ? ReservaStateTranslations[row.getValue("status") as keyof typeof ReservaStateTranslations] : null) || "-"}</div>
    ),
  },
];
