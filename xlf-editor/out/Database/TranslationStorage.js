"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationStorage = void 0;
class TranslationStorage {
    static instance;
    storage;
    STORAGE_KEY = 'xlf-editor.storedTranslations';
    constructor(context) {
        this.storage = context.globalState;
    }
    static getInstance(context) {
        if (!TranslationStorage.instance) {
            TranslationStorage.instance = new TranslationStorage(context);
        }
        return TranslationStorage.instance;
    }
    async storeTranslations(translations) {
        const existing = await this.getStoredTranslations();
        const merged = [...existing, ...translations];
        // Remove duplicates by ID, keeping the latest version
        const unique = merged.reduce((acc, current) => {
            acc.set(current.id, current);
            return acc;
        }, new Map());
        await this.storage.update(this.STORAGE_KEY, Array.from(unique.values()));
    }
    async getStoredTranslations() {
        return this.storage.get(this.STORAGE_KEY, []);
    }
    async clearStoredTranslations() {
        await this.storage.update(this.STORAGE_KEY, []);
    }
}
exports.TranslationStorage = TranslationStorage;
//# sourceMappingURL=TranslationStorage.js.map