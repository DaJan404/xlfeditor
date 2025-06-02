import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface StoredTranslation {
    id: string;
    source: string;
    target: string;
    sourceLanguage: string;
    targetLanguage: string;
}

export class TranslationStorage {
    private static instances = new WeakMap<vscode.ExtensionContext, TranslationStorage>();
    private readonly storagePath: string;
    private cachedTranslations: StoredTranslation[] = []; // Initialize as empty array instead of null

    private constructor(context: vscode.ExtensionContext) {
        this.storagePath = context.globalStorageUri.fsPath;
        // Ensure storage directory exists
        if (!fs.existsSync(this.storagePath)) {
            fs.mkdirSync(this.storagePath, { recursive: true });
        }
    }

    public static getInstance(context: vscode.ExtensionContext): TranslationStorage {
        if (!TranslationStorage.instances.has(context)) {
            TranslationStorage.instances.set(context, new TranslationStorage(context));
        }
        return TranslationStorage.instances.get(context)!;
    }

    private get dbPath(): string {
        return path.join(this.storagePath, 'translations.json');
    }

    async getStoredTranslations(): Promise<StoredTranslation[]> {
        if (this.cachedTranslations.length === 0) { // Check length instead of null
            try {
                if (fs.existsSync(this.dbPath)) {
                    const data = await fs.promises.readFile(this.dbPath, 'utf8');
                    this.cachedTranslations = JSON.parse(data);
                }
            } catch (error) {
                console.error('Error reading translations:', error);
                this.cachedTranslations = [];
            }
        }
        return this.cachedTranslations;
    }

    async storeTranslations(translations: StoredTranslation[]): Promise<void> {
        try {
            // Load existing translations
            const existing = await this.getStoredTranslations();
            
            // Create Map for efficient updates
            const uniqueTranslations = new Map(
                existing.map(t => [t.id, t])
            );
            
            // Update or add new translations
            for (const translation of translations) {
                uniqueTranslations.set(translation.id, translation);
            }

            // Convert back to array
            this.cachedTranslations = Array.from(uniqueTranslations.values());
            
            // Write to file
            await fs.promises.writeFile(
                this.dbPath,
                JSON.stringify(this.cachedTranslations, null, 2),
                'utf8'
            );
        } catch (error: unknown) {
            console.error('Error storing translations:', error);
            throw new Error(
                'Failed to store translations: ' + 
                (error instanceof Error ? error.message : String(error))
            );
        }
    }

    async clearStoredTranslations(): Promise<void> {
        this.cachedTranslations = [];
        try {
            if (fs.existsSync(this.dbPath)) {
                await fs.promises.unlink(this.dbPath);
            }
        } catch (error: unknown) {
            console.error('Error clearing translations:', error);
            throw error instanceof Error ? error : new Error(String(error));
        }
    }
}