import type { Client } from "pg";
export function testClient(purpose?: "web" | "migrator" | "collector"): Promise<Client>;
