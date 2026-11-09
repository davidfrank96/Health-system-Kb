import { createHash } from "node:crypto";
import { csvHeader, manualInput, type ManualRow } from "./metrics";
export function contentDigest(input: unknown) {
	return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}
export class CsvError extends Error {}
function records(input: string) {
	if (Buffer.byteLength(input) > 262144)
		throw new CsvError("File exceeds 256 KiB");
	const rows: string[][] = [];
	let row: string[] = [],
		field = "",
		quoted = false,
		closed = false;
	function endField() {
		if (Buffer.byteLength(field) > 4096 || row.length >= 10)
			throw new CsvError("Invalid field size or column count");
		row.push(field);
		field = "";
		closed = false;
	}
	function endRow() {
		endField();
		rows.push(row);
		row = [];
		if (rows.length > 501) throw new CsvError("File exceeds 500 readings");
	}
	for (let i = 0; i < input.length; i++) {
		const ch = input[i];
		if (quoted) {
			if (ch !== '"') field += ch;
			else if (input[i + 1] === '"') {
				field += '"';
				i++;
			} else {
				quoted = false;
				closed = true;
			}
			continue;
		}
		if (ch === ",") endField();
		else if (ch === "\n" || ch === "\r") {
			if (ch === "\r" && input[++i] !== "\n")
				throw new CsvError("Invalid line ending");
			endRow();
		} else if (closed) throw new CsvError("Unexpected character after quote");
		else if (ch === '"') {
			if (field) throw new CsvError("Unexpected quote");
			quoted = true;
		} else field += ch;
	}
	if (quoted) throw new CsvError("Unclosed quote");
	if (row.length || field || closed) endRow();
	if (
		rows.shift()?.join(",") !== csvHeader ||
		!input.startsWith(csvHeader) ||
		!rows.length
	)
		throw new CsvError("Expected the CSV header and readings");
	return rows;
}
export function previewCsv(input: string, environment: string) {
	const rowNumbers: number[] = [],
		readings: ManualRow[] = [],
		errors: { row: number; code: string; message: string }[] = [],
		seen = new Set<string>();
	let invalidRows = 0;
	records(input).forEach((fields, i) => {
		const [
			serviceId,
			env,
			provider,
			metricName,
			unit,
			aggregation,
			num,
			observedAt,
			sourceReference,
			note,
		] = fields;
		const r = manualInput.safeParse({
			serviceId,
			environment: env,
			provider,
			metricName,
			unit,
			aggregation,
			value: /^\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(num) ? Number(num) : NaN,
			observedAt,
			sourceReference,
			note,
		});
		const key = r.success
			? JSON.stringify([serviceId, provider, metricName, r.data.observedAt])
			: "";
		if (
			!r.success ||
			fields.length !== 10 ||
			env !== environment ||
			seen.has(key)
		) {
			invalidRows++;
			if (errors.length < 50)
				errors.push({
					row: i + 2,
					code: "invalid_reading",
					message:
						"Check service, environment, metric, timestamp and duplicate readings.",
				});
		} else {
			rowNumbers.push(i + 2);
			readings.push(r.data);
			seen.add(key);
		}
	});
	return {
		rowNumbers,
		readings,
		errors,
		invalidRows,
		validRows: readings.length,
		digest: contentDigest(readings),
	};
}
