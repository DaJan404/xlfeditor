import * as vscode from 'vscode';
import { XliffParser } from '../utils/XlfParser';
import { TransUnit } from '../extension';
import { StoredTranslation } from '../Database/TranslationStorage';
import { XliffUpdater } from '../utils/XlfUpdater';
import { similarity } from '../utils/similarity';
import { TranslationStorage } from '../Database/TranslationStorage';
import * as xml2js from 'xml2js';

interface TranslationMatch {
    source: string;
    target: string;
    matchPercent: number;
    origin: 'storage' | 'file';
}

export interface TransUnitWithMatches extends TransUnit {
    possibleMatches?: TranslationMatch[];
}

export class XliffController {
    private static instance: XliffController;
    private updating = false;
    private readonly parser: XliffParser;
    private readonly updater: XliffUpdater;

    private constructor() {
        this.parser = new XliffParser();
        this.updater = new XliffUpdater();
    }

    // Singleton pattern
    public static getInstance(): XliffController {
        if (!XliffController.instance) {
            XliffController.instance = new XliffController();
        }
        return XliffController.instance;
    }

    async updateWebview(webview: vscode.Webview, document: vscode.TextDocument): Promise<void> {
        try {
            const content = await this.parser.parseContent(document.getText());
            webview.postMessage({ type: 'update', content });
        } catch (error) {
            console.error('Error updating webview:', error);
            vscode.window.showErrorMessage(
                `Failed to parse XLF document: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    async handleTranslationUpdate(document: vscode.TextDocument, changes: Array<{ id: string, value: string }>): Promise<void> {
        if (this.updating) return;

        this.updating = true;
        try {
            await this.updater.updateTranslations(document, changes);
        } finally {
            this.updating = false;
        }
    }

    async pretranslate(document: vscode.TextDocument, context: vscode.ExtensionContext): Promise<any> {
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Pre-translating...",
            cancellable: true
        }, async (progress, token) => {
            try {
                const storage = TranslationStorage.getInstance(context);
                const dbTranslations = await storage.getStoredTranslations();
                const parsed = await this.parser.parseContent(document.getText());
                
                // Lookup maps with lowercase keys
                const translationMap = new Map<string, StoredTranslation>();
                const existingTranslations = new Map<string, string>();

                // Prepare storage translations map (keep only best match per source)
                for (const t of dbTranslations) {
                    if (t.sourceLanguage === parsed.sourceLanguage && 
                        t.targetLanguage === parsed.targetLanguage) {
                        const key = t.source.toLowerCase();
                        if (!translationMap.has(key)) {
                            translationMap.set(key, t);
                        }
                    }
                }

                // Prepare existing translations map
                parsed.transUnits
                    .filter((unit: TransUnit) => unit.target)
                    .forEach((unit: TransUnit) => existingTranslations.set(unit.source.toLowerCase(), unit.target));

                const config = vscode.workspace.getConfiguration('xlfEditor');
                const minPercent = config.get<number>('pretranslateMinPercent', 80);
                const preferredSource = config.get<string>('preferredTranslationSource', 'ask');
                
                // Get only untranslated units
                const untranslatedUnits = parsed.transUnits.filter((unit: TransUnit) => !unit.target);
                const totalUnits = untranslatedUnits.length;
                let processedUnits = 0;

                // Process in larger batches
                const BATCH_SIZE = 200;
                const batches = Math.ceil(totalUnits / BATCH_SIZE);

                // Create arrays for source strings for faster similarity checking
                const storageKeys = Array.from(translationMap.keys());
                const existingKeys = Array.from(existingTranslations.keys());

                for (let batch = 0; batch < batches && !token.isCancellationRequested; batch++) {
                    const start = batch * BATCH_SIZE;
                    const end = Math.min(start + BATCH_SIZE, totalUnits);
                    
                    // Process batch in parallel
                    await Promise.all(untranslatedUnits.slice(start, end).map(async (unit: TransUnitWithMatches) => {
                        const source = unit.source.toLowerCase();
                        const matches: TranslationMatch[] = [];

                        // Check exact matches first (O(1) operations)
                        const storageMatch = translationMap.get(source);
                        const fileMatch = existingTranslations.get(source);

                        if (storageMatch) {
                            matches.push({
                                source: unit.source,
                                target: storageMatch.target,
                                matchPercent: 100,
                                origin: 'storage'
                            });
                        }

                        if (fileMatch) {
                            matches.push({
                                source: unit.source,
                                target: fileMatch,
                                matchPercent: 100,
                                origin: 'file'
                            });
                        }

                        // Only check for similar matches if no exact matches found
                        if (matches.length === 0) {
                            // Use length difference as early filter
                            const sourceLen = source.length;
                            const lenThreshold = sourceLen * 0.3; // 30% length difference max

                            // Find similar matches from storage
                            for (const key of storageKeys) {
                                if (Math.abs(key.length - sourceLen) <= lenThreshold) {
                                    const percent = similarity(source, key);
                                    if (percent >= minPercent) {
                                        const match = translationMap.get(key)!;
                                        matches.push({
                                            source: match.source,
                                            target: match.target,
                                            matchPercent: Math.round(percent),
                                            origin: 'storage'
                                        });
                                    }
                                }
                            }

                            // Find similar matches from existing translations
                            for (const key of existingKeys) {
                                if (Math.abs(key.length - sourceLen) <= lenThreshold) {
                                    const percent = similarity(source, key);
                                    if (percent >= minPercent) {
                                        matches.push({
                                            source: key,
                                            target: existingTranslations.get(key)!,
                                            matchPercent: Math.round(percent),
                                            origin: 'file'
                                        });
                                    }
                                }
                            }
                        }

                        if (matches.length > 0) {
                            matches.sort((a, b) => b.matchPercent - a.matchPercent);
                            
                            if (matches.length === 1 || preferredSource !== 'ask') {
                                const selectedMatch = preferredSource === 'file' 
                                    ? matches.find(m => m.origin === 'file') ?? matches[0]
                                    : matches[0];
                                unit.target = selectedMatch.target;
                                unit.matchPercent = selectedMatch.matchPercent;
                            } else {
                                unit.possibleMatches = matches.slice(0, 5); // Limit to top 5 matches
                            }
                        }
                    }));

                    processedUnits += end - start;
                    progress.report({
                        message: `Processed ${processedUnits} of ${totalUnits} units`,
                        increment: (BATCH_SIZE / totalUnits) * 100
                    });
                }

                if (token.isCancellationRequested) {
                    vscode.window.showInformationMessage('Pre-translation cancelled');
                    return parsed;
                }

                return parsed;
            } catch (error) {
                console.error('Error in pretranslate:', error);
                throw error;
            }
        });
    }

    async clearTranslations(document: vscode.TextDocument): Promise<any> {
        const parsed = await this.parser.parseContent(document.getText());
        
        // Clear only target translations, preserve notes and other data
        parsed.transUnits.forEach((unit: TransUnit) => {
            // Clear only the target and match percent
            unit.target = '';
            unit.matchPercent = undefined;
            // Keep unit.source and unit.notes unchanged
        });

        // Update the document, preserving all other data
        const builder = new xml2js.Builder({
            xmldec: { version: '1.0', encoding: 'utf-8' },
            renderOpts: { pretty: true, indent: '  ' },
            cdata: false
        });

        const file = {
            xliff: {
                $: { version: '1.2' },
                file: {
                    $: {
                        'source-language': parsed.sourceLanguage,
                        'target-language': parsed.targetLanguage
                    },
                    body: {
                        group: {
                            'trans-unit': parsed.transUnits.map((unit: TransUnit) => ({
                                $: { id: unit.id },
                                source: { _: unit.source },
                                target: { _: '' },
                                note: unit.notes?.map(note => ({
                                    $: {
                                        from: note.from,
                                        priority: note.priority
                                    },
                                    _: note.content
                                }))
                            }))
                        }
                    }
                }
            }
        };

        const updatedXml = builder.buildObject(file);
        const edit = new vscode.WorkspaceEdit();
        edit.replace(
            document.uri,
            new vscode.Range(0, 0, document.lineCount, 0),
            updatedXml
        );

        await vscode.workspace.applyEdit(edit);
        return parsed;
    }

    async importTranslations(fileUri: vscode.Uri, context: vscode.ExtensionContext): Promise<void> {
        const storage = TranslationStorage.getInstance(context);
        const BATCH_SIZE = 100; // Process 100 translations at a time
        
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Importing translations...",
            cancellable: false
        }, async (progress) => {
            try {
                const content = await vscode.workspace.fs.readFile(fileUri);
                const parsed = await this.parser.parseContent(content.toString());
                
                const totalUnits = parsed.transUnits.length;
                let processed = 0;
                
                // Process in batches
                for (let i = 0; i < parsed.transUnits.length; i += BATCH_SIZE) {
                    const batch = parsed.transUnits.slice(i, Math.min(i + BATCH_SIZE, totalUnits));
                    
                    const translations = batch.map((unit: TransUnit) => ({
                        id: unit.id,
                        source: unit.source,
                        target: unit.target || '',
                        sourceLanguage: parsed.sourceLanguage,
                        targetLanguage: parsed.targetLanguage
                    }));

                    await storage.storeTranslations(translations);
                    
                    processed += batch.length;
                    progress.report({ 
                        message: `Imported ${processed} of ${totalUnits} translations`,
                        increment: (batch.length / totalUnits) * 100
                    });

                    await new Promise(resolve => setTimeout(resolve, 0));
                }

                vscode.window.showInformationMessage(
                    `Successfully imported ${totalUnits} translations as reference`
                );
            } catch (error) {
                vscode.window.showErrorMessage(
                    `Failed to import reference: ${error instanceof Error ? error.message : String(error)}`
                );
                throw error;
            }
        });
    }
}