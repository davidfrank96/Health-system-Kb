// This finite Phase 01 entry point has no provider clients, targets or scheduler.
process.stdout.write(
	`${JSON.stringify({ status: "disabled", probesAttempted: 0 })}\n`,
);
