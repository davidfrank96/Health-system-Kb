import type { PoolConfig } from "pg";
export function connectionOptions(
	env: Record<string, string | undefined>,
	purpose?: "web" | "migrator" | "collector",
): PoolConfig;
export function requireApprovedTest(
	env: Record<string, string | undefined>,
): void;
export const postgresMajor: number;
export function checkVersion(client: import("pg").Client): Promise<void>;
