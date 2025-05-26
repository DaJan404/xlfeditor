import * as vscode from 'vscode';

export interface StoredTranslation {
    id: string;
    source: string;
    target: string;
    sourceLanguage: string;
    targetLanguage: string;
}

export class TranslationStorage {
    private static instances = new WeakMap<vscode.ExtensionContext, TranslationStorage>();
    private readonly storage: vscode.Memento;
    private readonly STORAGE_KEY = 'xlf-editor.storedTranslations';
    private cachedTranslations: StoredTranslation[] | null = null;

    private constructor(context: vscode.ExtensionContext) {
        this.storage = context.globalState;
    }

    public static getInstance(context: vscode.ExtensionContext): TranslationStorage {
        if (!TranslationStorage.instances.has(context)) {
            TranslationStorage.instances.set(context, new TranslationStorage(context));
        }
        return TranslationStorage.instances.get(context)!;
    }

    async getStoredTranslations(): Promise<StoredTranslation[]> {
        if (this.cachedTranslations === null) {
            this.cachedTranslations = await this.storage.get<StoredTranslation[]>(this.STORAGE_KEY, []);
        }
        return this.cachedTranslations;
    }

    async storeTranslations(translations: StoredTranslation[]): Promise<void> {
        // Load existing translations if not cached
        if (this.cachedTranslations === null) {
            this.cachedTranslations = await this.storage.get<StoredTranslation[]>(this.STORAGE_KEY, []);
        }

        // Create Map from existing translations for faster lookups
        const uniqueTranslations = new Map<string, StoredTranslation>();
        
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
        } catch (error) {
            console.error('Error storing translations:', error);
            vscode.window.showErrorMessage('Failed to store translations: The data might be too large');
            throw error;
        }
    }

    async clearStoredTranslations(): Promise<void> {
        this.cachedTranslations = [];
        await this.storage.update(this.STORAGE_KEY, []);
    }
}