import type { Authority } from "./probe.mjs";
export function runFixtures(
	env: Record<string, string | undefined>,
	authority: Authority,
	options?: {
		slot?: Date;
		timeoutMs?: number;
		deadlineMs?: number;
		onLocked?: (c: import("pg").Client) => Promise<void>;
	},
): Promise<{
	status: string;
	attempts: number;
	runId?: string;
	durationMs?: number;
	error?: string;
}>;
