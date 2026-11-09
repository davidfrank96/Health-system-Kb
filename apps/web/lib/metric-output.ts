import { z } from "zod";
import {
	environmentName,
	metricName,
	provider,
} from "../../../infrastructure/metrics";
import { HttpError } from "./security";
const series = z.object({
	resourceId: z.uuid().nullable(),
	provider,
	sourceMethod: z.enum(["manual", "csv", "provider_api"]),
});
const identified = series.extend({
	serviceId: z.uuid(),
	metricName,
	unit: z.string(),
});
const time = z.date();
export const reading = identified
	.extend({
		id: z.uuid(),
		environment: environmentName,
		aggregation: z.string(),
		value: z.number().finite().nonnegative(),
		observedAt: time,
		collectedAt: time,
		ingestedAt: time,
		sourceReference: z.string(),
		note: z.string(),
		enteredBy: z.uuid().nullable(),
		quality: z.enum(["fresh", "stale"]),
	})
	.strict();
const daily = series
	.extend({
		observedAt: time,
		samples: z.number().int().positive(),
		minimum: z.number().finite(),
		maximum: z.number().finite(),
		mean: z.number().finite(),
	})
	.strict();
const resource = z.strictObject({
	id: z.uuid(),
	serviceId: z.uuid(),
	serviceName: z.string(),
	name: z.string(),
	region: z.string().nullable(),
	resourceType: z.string(),
	identifier: z.string(),
	environment: environmentName,
	provider,
	enabled: z.boolean(),
	version: z.number().int().positive(),
	permissionReviewed: z.boolean(),
	costStatus: z.enum(["unverified", "verified_no_incremental_cost", "blocked"]),
	approvalExpiresAt: time.nullable(),
	lastSuccessAt: time.nullable(),
	collectionState: z.string(),
	capabilities: z.array(metricName),
	mode: z.enum(["api", "disabled"]),
	disabledReason: z.string().nullable(),
	remainingUsageUnits: z.number().nullable(),
});
const archived = identified.extend({ quality: z.literal("archived") }).strict();
export function checkedMetricPage(
	rows: unknown[],
	group: string,
	op: string,
	resolution: string | null,
) {
	const schema =
		group === "integrations"
			? resource
			: op === "series"
				? archived
				: op === "history" && resolution === "daily"
					? daily
					: reading;
	const page = z.array(schema).max(100).safeParse(rows);
	if (!page.success) throw new HttpError(503, "inconsistent_metric_data");
	return page.data;
}
