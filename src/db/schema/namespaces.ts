import { pgSchema } from "drizzle-orm/pg-core";

/** Logical namespaces only; importing these does not execute CREATE SCHEMA. */
export const appSchema = pgSchema("app");
export const securitySchema = pgSchema("security");
