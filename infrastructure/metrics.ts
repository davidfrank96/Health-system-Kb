import { z } from "zod";

export const providers = [
	"digitalocean",
	"azure",
	"gcp",
	"firebase",
	"other",
] as const;
export const provider = z.enum(providers);
export const environmentName = z.enum(["production", "staging", "development"]);
export const dictionary = {
	cpu_utilization: ["percent", "mean"],
	memory_utilization: ["percent", "mean"],
	memory_available: ["bytes", "mean"],
	filesystem_free: ["bytes", "mean"],
	disk_utilization: ["percent", "mean"],
	load_1: ["load", "mean"],
	public_outbound_bandwidth: ["Mbps", "rate"],
	app_cpu: ["percent", "mean"],
	app_memory: ["percent", "mean"],
	app_restarts: ["count", "count"],
	database_utilization: ["percent", "mean"],
	requests: ["count", "sum"],
	failed_requests: ["count", "sum"],
	latency: ["ms", "mean"],
	observed_availability: ["percent", "mean"],
	normalized_ru: ["percent", "max"],
	throttled_requests: ["count", "sum"],
} as const;
export type MetricName = keyof typeof dictionary;
export const metricNames = Object.keys(dictionary) as MetricName[];
export const metricName = z.enum(metricNames);
const safeText = z
	.string()
	.trim()
	.min(1)
	.max(1000)
	.refine((s) => !/^[=+@-]|\p{Cc}/u.test(s));
const source = z
	.string()
	.trim()
	.min(1)
	.max(500)
	.refine(
		(s) =>
			/^[A-Za-z0-9][A-Za-z0-9 ._:/-]*$/.test(s) &&
			(!s.includes(":") ||
				/^https:\/\/(?:docs\.digitalocean\.com|learn\.microsoft\.com|cloud\.google\.com|firebase\.google\.com)\/[A-Za-z0-9_./-]*$/.test(
					s,
				)),
	);
export const manualInput = z
	.object({
		serviceId: z.uuid(),
		environment: environmentName,
		provider,
		metricName,
		unit: z.string(),
		aggregation: z.string(),
		value: z.number().finite().nonnegative(),
		observedAt: z.iso.datetime(),
		sourceReference: source,
		note: safeText,
		supersedesId: z.uuid().optional(),
		correctionReason: safeText.pipe(z.string().max(500)).optional(),
	})
	.strict()
	.superRefine((r, ctx) => {
		const [unit, aggregation] = dictionary[r.metricName],
			time = Date.parse(r.observedAt),
			now = Date.now();
		if (
			r.unit !== unit ||
			r.aggregation !== aggregation ||
			(unit === "percent" && r.value > 100) ||
			(unit === "count" && !Number.isSafeInteger(r.value)) ||
			time > now + 120000 ||
			time < now - 30 * 86400000 ||
			!!r.supersedesId !== !!r.correctionReason ||
			(r.metricName === "normalized_ru" && r.provider !== "azure")
		)
			ctx.addIssue({
				code: "custom",
				message: "Invalid metric, correction or observation window",
			});
	})
	.transform((r) => ({
		...r,
		observedAt: new Date(r.observedAt).toISOString(),
	}));
export type ManualRow = z.infer<typeof manualInput>;
export const csvHeader =
	"service_id,environment,provider,metric_name,unit,aggregation,value,observed_at,source_reference,note";
