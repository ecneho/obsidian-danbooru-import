export function normalizeString(text: string, useUnderscores: boolean): string | null {
	if (!text || !text.trim())
		return null;

	// general sanitization
	text = text.toLowerCase().trim();
	text = text.replace(/[^a-z0-9-_()]/g, "");
	if (!useUnderscores)
		text = text.replace(/_/g, " ");

	if (!/[a-z]/.test(text))
		return null;

	return text.length > 0 ? text : null;
}
