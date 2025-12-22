import {App, PluginSettingTab, Setting} from "obsidian";
import DanbooruImport from "./main";
import {AttributeEntry, IMAGE_EXTENSIONS, ImageExtension} from "./types";

export interface DanbooruImportSettings {
	imageExtension: ImageExtension;
	preserveImageExtension: boolean;
	imageNameTemplate: string;
	binaryNameTemplate: string;
	useUnderscores: boolean;
	customAttributes: AttributeEntry[];
	includeCharacterTags: boolean;
	includeCopyrightTags: boolean;
	includeArtistTags: boolean;
	includeGeneralTags: boolean;
	imagePath: string;
	binaryPath: string;
	tagPath: string;
}

export const DEFAULT_SETTINGS: DanbooruImportSettings = {
	imageExtension: "png",
	preserveImageExtension: false,
	imageNameTemplate: "danbooru-[[ID]]",
	binaryNameTemplate: "danbooru-[[ID]]",
	useUnderscores: false,
	customAttributes: [],
	includeCharacterTags: true,
	includeCopyrightTags: true,
	includeArtistTags: true,
	includeGeneralTags: false,
	imagePath: "Images",
	binaryPath: "Binaries",
	tagPath: "Tags",
}

export class MainSettingsTab extends PluginSettingTab {
	plugin: DanbooruImport;

	constructor(app: App, plugin: DanbooruImport) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Image folder path")
			.setDesc("The folder where all images will be saved.")
			.addText(text => text
				.setPlaceholder('')
				.setValue(this.plugin.settings.imagePath)
				.onChange(async (value) => {
					this.plugin.settings.imagePath = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Image metadata folder path")
			.setDesc("The folder where all image metadata files will be saved.")
			.addText(text => text
				.setPlaceholder('')
				.setValue(this.plugin.settings.binaryPath)
				.onChange(async (value) => {
					this.plugin.settings.binaryPath = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Tag metadata folder path")
			.setDesc("The folder where all tag metadata files will be saved.")
			.addText(text => text
				.setPlaceholder('')
				.setValue(this.plugin.settings.tagPath)
				.onChange(async (value) => {
					this.plugin.settings.tagPath = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Image name template")
			.setDesc("Custom template for image filenames. Supports ID and rating.")
			.addText(text => text
				// eslint-disable-next-line obsidianmd/ui/sentence-case
				.setPlaceholder('Image_[[ID]]-[[RATING]]')
				.setValue(this.plugin.settings.imageNameTemplate)
				.onChange(async (value) => {
					this.plugin.settings.imageNameTemplate = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Image metadata filename template")
			.setDesc("Custom template for image metadata filenames. Supports ID and rating.")
			.addText(text => text
				// eslint-disable-next-line obsidianmd/ui/sentence-case
				.setPlaceholder('Binary_[[ID]]-[[RATING]]')
				.setValue(this.plugin.settings.binaryNameTemplate)
				.onChange(async (value) => {
					this.plugin.settings.binaryNameTemplate = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Image format")
			.setDesc(`Format to save the images in. Supported extensions are: [${IMAGE_EXTENSIONS.join(", ")}].`)
			.addDropdown(dropdown => {
				IMAGE_EXTENSIONS.forEach(ext => {
					dropdown.addOption(ext, `.${ext}`);
				});

				dropdown
					.setValue(this.plugin.settings.imageExtension)
					.onChange(async (value: ImageExtension) => {
						this.plugin.settings.imageExtension = value;
						await this.plugin.saveSettings();
						this.display();
					});
			});

		new Setting(containerEl)
			.setName("Use underscores")
			.setDesc("Replace spaces with underscores in tag names.")
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.useUnderscores)
					.onChange(async value => {
						this.plugin.settings.useUnderscores = value;
						await this.plugin.saveSettings();
					})
			);

		const ext = this.plugin.settings.imageExtension;
		new Setting(containerEl)
			.setName("Preserve image extension")
			.setDesc(`Keep the original image file extension. If the extension is not supported, 'Image Extension' (${ext}) is used instead.`)
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.preserveImageExtension)
					.onChange(async value => {
						this.plugin.settings.preserveImageExtension = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Include character tags in the metadata file.")
			.setDesc("Save character tags in separate files and link them in the metadata files.")
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.includeCharacterTags)
					.onChange(async value => {
						this.plugin.settings.includeCharacterTags = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Include copyright tags in the metadata file.")
			.setDesc("Save copyright tags in separate files and link them in the metadata files.")
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.includeCopyrightTags)
					.onChange(async value => {
						this.plugin.settings.includeCopyrightTags = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Include artist tags in the metadata file.")
			.setDesc("Save artist tags in separate files and link them in the metadata files.")
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.includeArtistTags)
					.onChange(async value => {
						this.plugin.settings.includeArtistTags = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Include general tags in the metadata file.")
			.setDesc("Save general tags in separate files and link them in the metadata files. Resource intensive!")
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.includeGeneralTags)
					.onChange(async value => {
						this.plugin.settings.includeGeneralTags = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl).setName("Binary attributes").setHeading();
		this.plugin.settings.customAttributes.forEach((attr, index) => {
			const setting = new Setting(containerEl)
				.setName(`Attribute ${index + 1}`);

			setting.addText(text =>
				text
					.setPlaceholder("Attribute")
					.setValue(attr.key)
					.onChange(async value => {
						attr.key = value;
						await this.plugin.saveSettings();
					})
			);

			setting.addText(text =>
				text
					.setPlaceholder("Value")
					.setValue(attr.value)
					.onChange(async value => {
						attr.value = value;
						await this.plugin.saveSettings();
					})
			);

			setting.addExtraButton(btn =>
				btn
					.setIcon("trash")
					.setTooltip("Remove")
					.onClick(async () => {
						this.plugin.settings.customAttributes.splice(index, 1);
						await this.plugin.saveSettings();
						this.display();
					})
			);
		});

		new Setting(containerEl)
			.setName("Add attribute")
			.addButton(btn =>
				btn
					.setButtonText("+")
					.setCta()
					.onClick(async () => {
						this.plugin.settings.customAttributes.push({
							key: "",
							value: "",
						});
						await this.plugin.saveSettings();
						this.display();
					})
			);
	}
}
