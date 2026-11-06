export const SLOT = 900_000;
export const FRESH = 35 * 60_000;
export const slotOf = (now) => Math.floor(Number(new Date(now)) / SLOT) * SLOT;
export function availability({
	expected = 0,
	success = 0,
	failure = 0,
	unknown = 0,
	excluded = 0,
} = {}) {
	if (
		![expected, success, failure, unknown, excluded].every(
			(x) => Number.isInteger(x) && x >= 0,
		) ||
		expected !== success + failure + unknown
	)
		throw new Error("invalid_counts");
	const known = success + failure;
	return {
		expected,
		success,
		failure,
		unknown,
		excluded,
		coverage: expected ? known / expected : null,
		observed: known ? success / known : null,
		lower: expected ? success / expected : null,
		upper: expected ? (success + unknown) / expected : null,
		reason: !expected
			? "not_monitored"
			: !known
				? "no_known_observations"
				: known / expected < 0.95
					? "insufficient_coverage"
					: null,
	};
}
export function sumAvailability(rows) {
	return availability(
		rows.reduce(
			(a, r) => {
				for (const k of Object.keys(a)) a[k] += Number(r[k]);
				return a;
			},
			{ expected: 0, success: 0, failure: 0, unknown: 0, excluded: 0 },
		),
	);
}
export function emptyState() {
	return {
		condition: "unknown",
		lastSlot: null,
		lastObserved: null,
		lastSuccess: null,
		failures: 0,
		successes: 0,
		slow: 0,
		fast: 0,
		firstFailure: null,
		firstRecovery: null,
		open: false,
		gap: false,
		slowWarning: false,
	};
}
export function transition(previous, check, policy = {}) {
	const state = { ...emptyState(), ...previous };
	const s = Number(new Date(check.slot));
	if (state.lastSlot !== null && s <= state.lastSlot)
		throw new Error("nonmonotonic_slot");
	const consecutive = state.lastSlot !== null && s - state.lastSlot === SLOT;
	if (!consecutive || check.maintenance || check.outcome === "unknown") {
		state.failures = state.successes = state.slow = state.fast = 0;
		state.firstFailure = state.firstRecovery = null;
		if (state.open) state.gap = true;
	}
	let event = null;
	if (check.maintenance || check.outcome === "unknown") {
		state.condition = check.maintenance ? "maintenance" : "unknown";
	} else if (check.outcome === "failure") {
		state.failures++;
		state.successes = state.slow = state.fast = 0;
		state.firstRecovery = null;
		state.firstFailure ??= check.observedAt;
		if (!state.open && state.failures >= (policy.failureThreshold ?? 2)) {
			state.open = true;
			state.gap = false;
			event = "opened";
		}
		state.condition = state.open ? "down" : "degraded";
	} else {
		state.failures = 0;
		state.firstFailure = null;
		state.successes++;
		state.lastSuccess = check.observedAt;
		state.firstRecovery ??= check.observedAt;
		state.slow = check.latencyMs > (policy.slowMs ?? 2000) ? state.slow + 1 : 0;
		state.fast =
			check.latencyMs < (policy.clearMs ?? 1000) ? state.fast + 1 : 0;
		if (state.open && state.successes >= (policy.recoveryThreshold ?? 2)) {
			state.open = false;
			event = "resolved";
		}
		if (state.slow >= 2) state.slowWarning = true;
		if (state.fast >= 2) state.slowWarning = false;
		state.condition = state.open
			? "down"
			: state.slowWarning
				? "degraded"
				: "healthy";
	}
	state.lastSlot = s;
	state.lastObserved = check.observedAt;
	return { state, event };
}
export function current(
	state,
	now = Date.now(),
	enabled = true,
	maintenance = false,
	failure = null,
) {
	if (!enabled)
		return { condition: "unknown", quality: "missing", reason: "disabled" };
	if (!state?.lastObserved)
		return {
			condition: maintenance ? "maintenance" : "unknown",
			quality: "missing",
			reason: "never_checked",
		};
	const stale = now - Number(new Date(state.lastObserved)) > FRESH;
	const quality = stale
		? "stale"
		: state.condition === "unknown"
			? "error"
			: "fresh";
	return {
		condition: stale
			? "unknown"
			: state.open && (maintenance || state.condition === "maintenance")
				? "down"
				: maintenance
					? "maintenance"
					: state.condition,
		quality,
		reason: stale ? "observation_expired" : failure,
	};
}
export function serviceState(endpoints) {
	const required = endpoints.filter((e) => e.required);
	if (!required.length) return { condition: "unknown", quality: "missing" };
	const quality = required.some((e) => e.quality === "stale")
		? "stale"
		: required.some((e) => e.quality === "error")
			? "error"
			: required.some((e) => e.quality === "missing")
				? "missing"
				: "fresh";
	const condition = required.some((e) => e.condition === "down")
		? "down"
		: required.some((e) => e.condition === "degraded")
			? "degraded"
			: quality !== "fresh"
				? "unknown"
				: required.some((e) => e.condition === "unknown")
					? "unknown"
					: required.some((e) => e.condition === "maintenance")
						? "maintenance"
						: "healthy";
	return { condition, quality };
}
