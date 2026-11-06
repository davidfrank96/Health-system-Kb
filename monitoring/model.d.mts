export const SLOT: number;
export const FRESH: number;
export function slotOf(now: Date | string | number): number;
export type Condition =
	| "healthy"
	| "degraded"
	| "down"
	| "unknown"
	| "maintenance";
export type Quality = "fresh" | "stale" | "missing" | "error";
export interface State {
	condition: Condition;
	lastSlot: number | null;
	lastObserved: string | null;
	lastSuccess: string | null;
	failures: number;
	successes: number;
	slow: number;
	fast: number;
	firstFailure: string | null;
	firstRecovery: string | null;
	open: boolean;
	gap: boolean;
	slowWarning?: boolean;
}
export interface Check {
	outcome: "success" | "failure" | "unknown";
	failure: string | null;
	httpStatus: number | null;
	latencyMs: number | null;
	observedAt: string;
	attempts: number;
	slot?: string;
	maintenance?: boolean;
	collectedAt?: string;
}
export interface Counts {
	expected: number;
	success: number;
	failure: number;
	unknown: number;
	excluded: number;
}
export interface Availability extends Counts {
	coverage: number | null;
	observed: number | null;
	lower: number | null;
	upper: number | null;
	reason: string | null;
}
export function availability(counts?: Counts): Availability;
export function sumAvailability(rows: Counts[]): Availability;
export function emptyState(): State;
export function transition(
	previous: Partial<State>,
	check: Check & { slot: string | Date },
	policy?: {
		failureThreshold?: number;
		recoveryThreshold?: number;
		slowMs?: number;
		clearMs?: number;
	},
): { state: State; event: string | null };
export function current(
	state: Partial<State>,
	now?: number,
	enabled?: boolean,
	maintenance?: boolean,
	failure?: string | null,
): { condition: Condition; quality: Quality; reason: string | null };
export function serviceState(
	endpoints: { required: boolean; condition: Condition; quality: Quality }[],
): { condition: Condition; quality: Quality };
