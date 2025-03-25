import * as vscode from 'vscode';

export interface StoredTranslation {
    id: string;
    source: string;
    target: string;
    sourceLanguage: string;
    targetLanguage: string;
}

export class TranslationStorage {
    private static instance: TranslationStorage;
    private readonly storage: vscode.Memento;
    private readonly STORAGE_KEY = 'xlf-editor.storedTranslations';

    private constructor(context: vscode.ExtensionContext) {
        this.storage = context.globalState;
    }

    public static getInstance(context: vscode.ExtensionContext): TranslationStorage {
        if (!TranslationStorage.instance) {
            TranslationStorage.instance = new TranslationStorage(context);
        }
        return TranslationStorage.instance;
    }

    async storeTranslations(translations: StoredTranslation[]): Promise<void> {
        const existing = await this.getStoredTranslations();
        const merged = [...existing, ...translations];
        
        // Remove duplicates by ID, keeping the latest version
        const unique = merged.reduce((acc, current) => {
            acc.set(current.id, current);
            return acc;
        }, new Map<string, StoredTranslation>());

        await this.storage.update(this.STORAGE_KEY, Array.from(unique.values()));
    }

    async getStoredTranslations(): Promise<StoredTranslation[]> {
        return this.storage.get<StoredTranslation[]>(this.STORAGE_KEY, []);
    }

    async clearStoredTranslations(): Promise<void> {
        await this.storage.update(this.STORAGE_KEY, []);
    }
}