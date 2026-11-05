import type { Client } from "pg";
export function testClient(purpose?: "web" | "migrator"): Promise<Client>;
