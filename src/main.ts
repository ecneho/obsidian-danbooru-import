import {App, Modal, Notice, Plugin, requestUrl} from 'obsidian';
import {DanbooruImportSettings, DEFAULT_SETTINGS, MainSettingsTab} from "./settings";
import {IMAGE_EXTENSIONS, ImageExtension, PostResponse, RatingDict} from "./types";
import {ensurePathExists} from "./utils/ensurePathExists";
import {normalizeString} from "./utils/normalizeString";
import {parseTokens} from "./utils/parseTokens";

export default class DanbooruImport extends Plugin {
	settings: DanbooruImportSettings;

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon('box', 'Danbooru import', () => {
			new FetchPostModal(this.app, this).open();
		});

		this.addCommand({
			id: "modal-open",
			name: "Import danbooru post",
			callback: () => {
				new FetchPostModal(this.app, this).open();
			}
		});

		this.addSettingTab(new MainSettingsTab(this.app, this));
	}

	onunload() { }
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<DanbooruImportSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class FetchPostModal extends Modal {
	plugin: DanbooruImport;

	constructor(app: App, plugin: DanbooruImport) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl("h3", { text: "Import danbooru post", cls: "di-heading" });
		contentEl.createEl("p", { text: "Enter the ID or link of the post to import:" });

		const row = contentEl.createEl("div", { cls: "di-row" });
		const input = row.createEl("input", { type: "text", cls: "di-input" });
		input.placeholder = "Post ID";

		const buttons = row.createEl("div", { cls: "di-buttons" });
		const cancelBtn = buttons.createEl("button", { text: "Cancel" });
		cancelBtn.onclick = () => this.close();

		const previewBtn = buttons.createEl("button", { text: "Preview" });
		const importBtn = buttons.createEl("button", { text: "Import" });
		importBtn.className = "mod-cta";

		input.addEventListener("keypress", (evt) => {
			if (evt.key === "Enter") {
				importBtn.click();
			}
		});

		const img = contentEl.createEl("img", { cls: "di-img" })

		previewBtn.onclick = async () => {
			const inputValue = input.value.trim();
			if (!inputValue) {
				new Notice("Input is empty.");
				return;
			}

			const match = inputValue.match(/posts\/(\d+)/);
			const id = match ? match[1] : inputValue;

			if (!/^\d+$/.test(id ?? "")) {
				new Notice("Invalid post.");
				return;
			}

			const url = `https://danbooru.donmai.us/posts/${id}.json`;
			const response = await requestUrl({
				url: url
			});

			if (!response || !response.json) {
				new Notice("Fetch error.");
				return;
			}

			const post = response.json as PostResponse;
			img.src = post.file_url;
			img.className = "di-img-shown";
		}

		importBtn.onclick = async () => {
			const inputValue = input.value.trim();
			if (!inputValue) {
				new Notice("Input is empty.");
				return;
			}

			try {
				const match = inputValue.match(/posts\/(\d+)/);
				const id = match ? match[1] : inputValue;

				if (!/^\d+$/.test(id ?? "")) {
					new Notice("Invalid post.");
					return;
				}

				const url = `https://danbooru.donmai.us/posts/${id}.json`;
				const response = await requestUrl({
					url: url
				});

				if (!response || !response.json) {
					new Notice("Fetch error.");
					return;
				}

				const post = response.json as PostResponse;

				const binariesPath = this.plugin.settings.binaryPath ?? "Binaries";
				const imagesPath = this.plugin.settings.imagePath ?? "Images";
				const tagsPath = this.plugin.settings.tagPath ?? "Tags";
				const imageExtension = this.plugin.settings.imageExtension ?? ".png";
				const preserveExtension = this.plugin.settings.preserveImageExtension ?? false;
				const useUnderscores = this.plugin.settings.useUnderscores ?? false;
				const imageNameTemplate = this.plugin.settings.imageNameTemplate ?? "image_[[ID]]";
				const binaryNameTemplate = this.plugin.settings.binaryNameTemplate ?? "binary_[[ID]]";
				const customAttributes = this.plugin.settings.customAttributes ?? [];

				await ensurePathExists(this.app.vault, binariesPath);
				await ensurePathExists(this.app.vault, imagesPath);
				await ensurePathExists(this.app.vault, tagsPath);

				const imageUrl = post.file_url;
				if (!imageUrl) {
					new Notice("No image URL found.");
					return;
				}

				const imageResponse = await requestUrl({
					url: imageUrl
				});


				const ext = post.file_ext;
				const extension: ImageExtension = preserveExtension && IMAGE_EXTENSIONS.includes(ext)
					? ext
					: imageExtension;

				const tokens: Record<string, string> = {
					'[[ID]]': post.id.toString(),
					'[[RATING]]': RatingDict[post.rating]
				};

				const imageFileName = parseTokens(imageNameTemplate, tokens);
				const imagePath = `${imagesPath}/${imageFileName}.${extension}`;

				try {
					await this.app.vault.createBinary(
						imagePath,
						imageResponse.arrayBuffer
					);
				} catch {
					new Notice("Image already exists.");
				}

				const prepareTags = async (tags: string[], category: string) => {
					let list = ""
					if (tags.length > 0) {
						list += `\n#### ${category}`
						const normalizedTags = tags
							.map(tag => normalizeString(tag, useUnderscores))
							.filter((t): t is string => t !== null);

						for (const tag of normalizedTags) {
							const path = tagsPath + `/${tag}.md`
							try {
								await this.app.vault.create(path, `---\ncategory: ${category}\n---`);
							}
							catch { /* pass */ }
							finally {
								list += `\n![[${path}]]`;
							}
						}
					}
					return list;
				}

				let tags = ""
				if (this.plugin.settings.includeCharacterTags) {
					const characterTags: string[] = post.tag_string_character
						? post.tag_string_character.split(" ")
						: [];
					tags += await prepareTags(characterTags, "Character");
				}

				if (this.plugin.settings.includeCopyrightTags) {
					const copyrightTags: string[] = post.tag_string_copyright
						? post.tag_string_copyright.split(" ")
						: [];
					tags += await prepareTags(copyrightTags, "Copyright");
				}

				if (this.plugin.settings.includeArtistTags) {
					const artistTags: string[] = post.tag_string_artist
						? post.tag_string_artist.split(" ")
						: [];
					tags += await prepareTags(artistTags, "Artist");
				}

				if (this.plugin.settings.includeGeneralTags) {
					const generalTags: string[] = post.tag_string_general
						? post.tag_string_general.split(" ")
						: [];
					tags += await prepareTags(generalTags, "General");
				}

				const matter = customAttributes.length
					? `---\n${customAttributes.map(attr => `${attr.key}: ${attr.value}`).join('\n')}\n---\n`
					: "";

				const binaryFileName = parseTokens(binaryNameTemplate, tokens);
				const binaryPath = `${binariesPath}/${binaryFileName}.md`;
				const content = `${matter}![[${imagePath}]]${tags}`;

				try {
					await this.app.vault.create(binaryPath, content);
				} catch {
					new Notice("Binary already exists.");
				}
				this.close();

			} catch (error) {
				console.error(error);
			}
		};
	}

	onClose() {
		this.contentEl.empty();
	}
}

