export function describeCapabilities(type: string): string[];
export interface Resource {
	environment: string;
	type: string;
	identifier: string;
	component?: string;
	instance?: string;
}
export interface Authority {
	enabled: boolean;
	provider: string;
	owner: string;
	reviewedSource: string;
	allowanceEvidence: string;
	permissionEvidence: string;
	liveReadApproved?: boolean;
	permissionReviewed: boolean;
	costStatus: string;
	incrementalCost: number;
	expiresAt: string;
	environment: string;
	resourceId: string;
	resourceType: string;
	component?: string;
	instance?: string;
	metrics: string[];
	maxSeries: number;
	scopes: string[];
}
export function collect(input: {
	authority: Authority;
	resource: Resource;
	metric: string;
	start: number;
	end: number;
	token: string;
	credentialEnvironment: string;
	reserve: (series: number) => Promise<boolean>;
	deadline: number;
	signal?: AbortSignal;
	transport?: typeof fetch;
}): Promise<{ state: string; observations: { time: number; value: number }[] }>;
