import type { Check } from "./model.mjs";
export const limits: {
	endpoints: number;
	attempts: number;
	concurrency: number;
	timeoutMs: number;
	deadlineMs: number;
	reserveMs: number;
	bytes: number;
};
export interface Authority {
	urls: readonly string[];
	ca?: string;
}
export function fixtureAuthority(
	env: Record<string, string | undefined>,
	urls: string[],
	options?: { ca?: string },
): Authority;
export function publicAddress(value: string): boolean;
export function canonicalTarget(raw: string): string;
export function resolveTarget(
	raw: string,
	approved: string[],
	resolver?: (
		host: string,
		options: object,
	) => Promise<{ address: string; family: number }[]>,
): Promise<{ url: URL; address: { address: string; family: number } }>;
export function failureCategory(error: unknown): string;
export function retryable(result: Partial<Check>): boolean;
export function probe(
	raw: string,
	expectedCodes: number[],
	options?: {
		signal?: AbortSignal;
		authority?: Authority;
		approved?: string[];
		timeoutMs?: number;
		resolver?: (
			host: string,
			options: object,
		) => Promise<{ address: string; family: number }[]>;
	},
): Promise<Omit<Check, "attempts">>;
