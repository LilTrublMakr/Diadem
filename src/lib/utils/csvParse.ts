// Minimal RFC-4180-ish CSV tokenizer — the reverse of csvField/csvRow in collectionExportUtils.ts.
// Handles quoted fields, embedded commas/newlines inside quotes, and doubled "" escapes.
export function parseCsv(text: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = "";
	let inQuotes = false;

	// Normalize line endings so \r\n / \r / \n all behave the same inside the loop below.
	const input = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

	for (let i = 0; i < input.length; i++) {
		const char = input[i];

		if (inQuotes) {
			if (char === '"') {
				if (input[i + 1] === '"') {
					field += '"';
					i++;
				} else {
					inQuotes = false;
				}
			} else {
				field += char;
			}
			continue;
		}

		if (char === '"') {
			inQuotes = true;
		} else if (char === ",") {
			row.push(field);
			field = "";
		} else if (char === "\n") {
			row.push(field);
			field = "";
			rows.push(row);
			row = [];
		} else {
			field += char;
		}
	}

	// Final field/row (files not ending in a trailing newline).
	if (field.length > 0 || row.length > 0) {
		row.push(field);
		rows.push(row);
	}

	return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}
