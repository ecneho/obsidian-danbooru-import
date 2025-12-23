import {IMAGE_EXTENSIONS, ImageExtension, PostResponse, RatingDict} from "./types";
import {normalizeString} from "./utils/normalizeString";
import {parseTokens} from "./utils/parseTokens";
import DanbooruImport from "./main";
import {App, Modal, normalizePath, Notice, requestUrl} from "obsidian";

export class FetchPostModal extends Modal {
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
		input.placeholder = "Post link or ID";

		const buttons = row.createEl("div", { cls: "di-buttons" });
		const cancelBtn = buttons.createEl("button", { text: "Cancel" });
		cancelBtn.onclick = () => this.close();

		const importBtn = buttons.createEl("button", { text: "Import" });
		importBtn.className = "mod-cta";

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
				const settings = this.plugin.settings;
				const {
					binaryPath, imagePath, tagPath,
					imageExtension, preserveImageExtension,
					useUnderscores,
					imageNameTemplate, binaryNameTemplate,
					customAttributes,
					includeCharacterTags, includeArtistTags,
					includeCopyrightTags, includeGeneralTags
				} = settings;

				this.app.vault.createFolder(binaryPath).catch(() => {});
				this.app.vault.createFolder(imagePath).catch(() => {});
				this.app.vault.createFolder(tagPath).catch(() => {});

				const imageUrl = post.file_url;
				if (!imageUrl) {
					new Notice("No image URL found.");
					return;
				}

				const imageResponse = await requestUrl({
					url: imageUrl
				});

				const ext = post.file_ext;
				const extension: ImageExtension = preserveImageExtension && IMAGE_EXTENSIONS.includes(ext)
					? ext
					: imageExtension;

				const tokens: Record<string, string> = {
					'[[ID]]': post.id.toString(),
					'[[RATING]]': RatingDict[post.rating]
				};

				const imageFileName = parseTokens(imageNameTemplate, tokens);
				const imageFinalPath = normalizePath(`${imagePath}/${imageFileName}.${extension}`);

				this.app.vault.createBinary(
					imageFinalPath,
					imageResponse.arrayBuffer
				).catch((e) => {
					console.error(e);
					new Notice("Image already exists.");
				});

				const prepareTags = async (tags: string[], category: string) => {
					let list = ""
					if (tags.length > 0) {
						list += `\n#### ${category}`
						const normalizedTags = tags
							.map(tag => normalizeString(tag, useUnderscores))
							.filter((t): t is string => t !== null);

						for (const tag of normalizedTags) {
							const path = tagPath + `/${tag}.md`
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
				if (includeCharacterTags) {
					const characterTags: string[] = post.tag_string_character
						? post.tag_string_character.split(" ")
						: [];
					tags += await prepareTags(characterTags, "Character");
				}

				if (includeCopyrightTags) {
					const copyrightTags: string[] = post.tag_string_copyright
						? post.tag_string_copyright.split(" ")
						: [];
					tags += await prepareTags(copyrightTags, "Copyright");
				}

				if (includeArtistTags) {
					const artistTags: string[] = post.tag_string_artist
						? post.tag_string_artist.split(" ")
						: [];
					tags += await prepareTags(artistTags, "Artist");
				}

				if (includeGeneralTags) {
					const generalTags: string[] = post.tag_string_general
						? post.tag_string_general.split(" ")
						: [];
					tags += await prepareTags(generalTags, "General");
				}

				const matter = customAttributes.length
					? `---\n${customAttributes.map(attr => `${attr.key}: ${attr.value}`).join('\n')}\n---\n`
					: "";

				const binaryFileName = parseTokens(binaryNameTemplate, tokens);
				const binaryFinalPath = normalizePath(`${binaryPath}/${binaryFileName}.md`);
				const content = `${matter}![[${imageFinalPath}]]${tags}`;

				this.app.vault.create(binaryFinalPath, content).catch(() => {
					new Notice("Binary already exists.");
				});

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
