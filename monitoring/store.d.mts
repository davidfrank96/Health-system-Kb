import type { Client, PoolClient } from "pg";
import type { Availability, Check, Counts } from "./model.mjs";
export function storeCheck(
	c: Client | PoolClient,
	endpoint: { id: string; version: number },
	runId: string,
	slot: Date | string,
	check: Check,
): Promise<boolean>;
export function retain(c: Client | PoolClient, now?: Date): Promise<void>;
export function countSamples(samples: string): Availability;
export function endpointHistory(
	c: Client | PoolClient,
	endpointId: string,
	start: Date | string,
	end: Date | string,
	now?: Date,
): Promise<(Availability & { day: string; samples: string })[]>;
export function sumAvailability(rows: Counts[]): Availability;

export function combineSamples(samples: string[]): string;
