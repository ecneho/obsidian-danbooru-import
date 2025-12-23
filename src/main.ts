import {DanbooruImportSettings, DEFAULT_SETTINGS, MainSettingsTab} from "./settings";
import {FetchPostModal} from "./modal";
import {Plugin} from 'obsidian';

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
