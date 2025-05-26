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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class TranslationStorage {
    static instances = new WeakMap();
    storagePath;
    cachedTranslations = []; // Initialize as empty array instead of null
    constructor(context) {
        this.storagePath = context.globalStorageUri.fsPath;
        // Ensure storage directory exists
        if (!fs.existsSync(this.storagePath)) {
            fs.mkdirSync(this.storagePath, { recursive: true });
        }
    }
    static getInstance(context) {
        if (!TranslationStorage.instances.has(context)) {
            TranslationStorage.instances.set(context, new TranslationStorage(context));
        }
        return TranslationStorage.instances.get(context);
    }
    get dbPath() {
        return path.join(this.storagePath, 'translations.json');
    }
    async getStoredTranslations() {
        if (this.cachedTranslations.length === 0) { // Check length instead of null
            try {
                if (fs.existsSync(this.dbPath)) {
                    const data = await fs.promises.readFile(this.dbPath, 'utf8');
                    this.cachedTranslations = JSON.parse(data);
                }
            }
            catch (error) {
                console.error('Error reading translations:', error);
                this.cachedTranslations = [];
            }
        }
        return this.cachedTranslations;
    }
    async storeTranslations(translations) {
        try {
            // Load existing translations
            const existing = await this.getStoredTranslations();
            // Create Map for efficient updates
            const uniqueTranslations = new Map(existing.map(t => [t.id, t]));
            // Update or add new translations
            for (const translation of translations) {
                uniqueTranslations.set(translation.id, translation);
            }
            // Convert back to array
            this.cachedTranslations = Array.from(uniqueTranslations.values());
            // Write to file
            await fs.promises.writeFile(this.dbPath, JSON.stringify(this.cachedTranslations, null, 2), 'utf8');
        }
        catch (error) { // Add type annotation here
            console.error('Error storing translations:', error);
            throw new Error('Failed to store translations: ' +
                (error instanceof Error ? error.message : String(error)));
        }
    }
    async clearStoredTranslations() {
        this.cachedTranslations = [];
        try {
            if (fs.existsSync(this.dbPath)) {
                await fs.promises.unlink(this.dbPath);
            }
        }
        catch (error) { // Add type annotation here
            console.error('Error clearing translations:', error);
            throw error instanceof Error ? error : new Error(String(error));
        }
    }
}
exports.TranslationStorage = TranslationStorage;
//# sourceMappingURL=TranslationStorage.js.map