CREATE TABLE `test_cities` (
	`identifier` text(255) PRIMARY KEY NOT NULL,
	`name` text(255) NOT NULL,
	`description` text(255) NOT NULL,
	`image` text(255)
);
--> statement-breakpoint
CREATE TABLE `test_clients` (
	`identifier` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text(255),
	`surname` text(255),
	`email` text(255),
	`prefijo` integer,
	`telefono` integer,
	`dni` text(255)
);
--> statement-breakpoint
CREATE TABLE `test_coindate` (
	`identifier` text(255) PRIMARY KEY NOT NULL,
	`description` text(255),
	`value` real
);
--> statement-breakpoint
CREATE TABLE `test_cupones` (
	`identifier` text(255) PRIMARY KEY NOT NULL,
	`codigo` text(255),
	`tipo_descuento` text(255),
	`valor_descuento` real,
	`cantidad_usos` real,
	`fecha_desde` text,
	`fecha_hasta` text,
	`usos` real
);
--> statement-breakpoint
CREATE TABLE `test_feedata` (
	`identifier` text(255) PRIMARY KEY NOT NULL,
	`description` text(255),
	`coin` text(255),
	`size` integer,
	`localId` text,
	`value` real,
	`discount` real
);
--> statement-breakpoint
CREATE TABLE `test_lockers` (
	`identifier` text(255) PRIMARY KEY NOT NULL,
	`name` text(255) NOT NULL,
	`description` text(255)
);
--> statement-breakpoint
CREATE TABLE `test_pagos` (
	`identifier` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mpMetaJson` text,
	`idTransactionsJson` text
);
--> statement-breakpoint
CREATE TABLE `test_privateConfig` (
	`identifier` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `test_publicConfig` (
	`identifier` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `test_reservas` (
	`identifier` text(255) PRIMARY KEY,
	`NroSerie` text(255),
	`IdSize` integer,
	`IdBox` integer,
	`IdFisico` integer,
	`Token1` integer,
	`FechaCreacion` text(255),
	`FechaInicio` text(255),
	`FechaFin` text(255),
	`Contador` integer,
	`Confirmado` integer DEFAULT false,
	`Modo` text(255),
	`Cantidad` integer,
	`IdTransaction` integer,
	`client` text(255),
	`nReserve` integer,
	`mpPagadoOk` integer DEFAULT false
);
--> statement-breakpoint
CREATE TABLE `test_reservasToClients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`clientId` integer
);
--> statement-breakpoint
CREATE TABLE `test_sizes` (
	`id` integer PRIMARY KEY NOT NULL,
	`alto` integer,
	`ancho` integer,
	`profundidad` integer,
	`nombre` text(255),
	`cantidad` integer,
	`cantidadSeleccionada` integer,
	`tarifa` text(255),
	`image` text(255)
);
--> statement-breakpoint
CREATE TABLE `test_stores` (
	`identifier` text(255) PRIMARY KEY NOT NULL,
	`name` text(255) NOT NULL,
	`image` text(255),
	`cityId` text(255) NOT NULL,
	`address` text(255),
	`organizationName` text(255),
	`description` text(255)
);
--> statement-breakpoint
CREATE TABLE `test_stores_lockers` (
	`storeId` text(255) NOT NULL,
	`serieLocker` text(255) NOT NULL,
	PRIMARY KEY(`serieLocker`, `storeId`)
);
--> statement-breakpoint
CREATE TABLE `test_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`confirm` integer DEFAULT false,
	`confirmedAt` text DEFAULT (CURRENT_DATE),
	`client` text(255),
	`amount` integer,
	`nReserve` integer
);
--> statement-breakpoint
CREATE TABLE `test_userdata` (
	`identifier` text(255) PRIMARY KEY NOT NULL,
	`name` text(255) NOT NULL,
	`last_name` text(255) NOT NULL,
	`email` text(255) NOT NULL,
	`tel` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_email` ON `test_clients` (`email`);--> statement-breakpoint
CREATE INDEX `local_id_idx` ON `test_feedata` (`localId`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_local_size` ON `test_feedata` (`size`,`localId`);--> statement-breakpoint
CREATE INDEX `idx_client` ON `test_reservas` (`client`);--> statement-breakpoint
CREATE INDEX `idx_nReserve` ON `test_reservas` (`nReserve`);--> statement-breakpoint
CREATE INDEX `idx_IdBox` ON `test_reservas` (`IdBox`);--> statement-breakpoint
CREATE INDEX `idx_IdBox_FechaFin` ON `test_reservas` (`IdBox`,`FechaFin`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_nReserve_Token1` ON `test_reservas` (`nReserve`,`Token1`);--> statement-breakpoint
CREATE INDEX `idx_cityId` ON `test_stores` (`cityId`);--> statement-breakpoint
CREATE INDEX `store_idx` ON `test_stores_lockers` (`storeId`);