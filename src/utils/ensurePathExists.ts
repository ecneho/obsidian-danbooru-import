import {TFolder, Vault} from "obsidian";

export async function ensurePathExists(vault: Vault, path: string) {
	const parts = path.split("/");
	let current = "";

	for (const part of parts) {
		current = current ? `${current}/${part}` : part;

		const folder = vault.getAbstractFileByPath(current);
		if (!(folder instanceof TFolder)) {
			await vault.createFolder(current);
		}
	}
}
