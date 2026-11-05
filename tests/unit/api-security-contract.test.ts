import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { parse } from "yaml";

type Requirement = Record<string, string[]>;
interface Operation {
	security?: Requirement[];
}

const spec: {
	security: Requirement[];
	paths: Record<string, Record<string, Operation>>;
} = parse(
	readFileSync(new URL("../../docs/api/openapi.yaml", import.meta.url), "utf8"),
);

test("new private operations inherit session authentication", () => {
	expect(spec.security).toEqual([{ SessionCookie: [] }]);
});

const specialCases: Record<string, Requirement[]> = {
	"get /health/live": [],
	"get /health/ready": [],
	"post /api/v1/webhooks/qa/runs": [{ QASignature: [] }],
};

test("the two process probes and signed QA operation are explicitly declared", () => {
	for (const [key, security] of Object.entries(specialCases)) {
		const [method, path] = key.split(" ");
		expect(spec.paths[path]?.[method]?.security).toEqual(security);
	}
});

for (const [path, item] of Object.entries(spec.paths)) {
	for (const [method, op] of Object.entries(item)) {
		if (!/^(get|put|post|delete|options|head|patch|trace)$/.test(method))
			continue;
		const key = `${method} ${path}`;
		test(`${key} declares the expected security boundary`, () => {
			expect(op.security ?? spec.security).toEqual(
				specialCases[key] ?? [{ SessionCookie: [] }],
			);
		});
	}
}
