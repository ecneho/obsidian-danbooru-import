export function parseTokens(input: string, tokens: Record<string, string>): string {
	let result = input;
	for (const [key, value] of Object.entries(tokens))
		result = result.split(key).join(value);

	return result;
}
