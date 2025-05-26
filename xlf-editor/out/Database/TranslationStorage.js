"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationStorage = void 0;
const vscode = __importStar(require("vscode"));
class TranslationStorage {
    static instances = new WeakMap();
    storage;
    STORAGE_KEY = 'xlf-editor.storedTranslations';
    cachedTranslations = null;
    constructor(context) {
        this.storage = context.globalState;
    }
    static getInstance(context) {
        if (!TranslationStorage.instances.has(context)) {
            TranslationStorage.instances.set(context, new TranslationStorage(context));
        }
        return TranslationStorage.instances.get(context);
    }
    async getStoredTranslations() {
        if (this.cachedTranslations === null) {
            this.cachedTranslations = await this.storage.get(this.STORAGE_KEY, []);
        }
        return this.cachedTranslations;
    }
    async storeTranslations(translations) {
        // Load existing translations if not cached
        if (this.cachedTranslations === null) {
            this.cachedTranslations = await this.storage.get(this.STORAGE_KEY, []);
        }
        // Create Map from existing translations for faster lookups
        const uniqueTranslations = new Map();
        // Add existing translations to map
        for (const translation of this.cachedTranslations) {
            uniqueTranslations.set(translation.id, translation);
        }
        // Update or add new translations
        for (const translation of translations) {
            uniqueTranslations.set(translation.id, translation);
        }
        // Convert map back to array
        this.cachedTranslations = Array.from(uniqueTranslations.values());
        // Store in chunks if the data is large
        try {
            await this.storage.update(this.STORAGE_KEY, this.cachedTranslations);
        }
        catch (error) {
            console.error('Error storing translations:', error);
            vscode.window.showErrorMessage('Failed to store translations: The data might be too large');
            throw error;
        }
    }
    async clearStoredTranslations() {
        this.cachedTranslations = [];
        await this.storage.update(this.STORAGE_KEY, []);
    }
}
exports.TranslationStorage = TranslationStorage;
//# sourceMappingURL=TranslationStorage.js.map