import * as vscode from 'vscode';
import { XliffParser } from '../utils/XlfParser';
import { TransUnit } from '../extension';
import { StoredTranslation } from '../Database/TranslationStorage';
import { XliffUpdater } from '../utils/XlfUpdater';
import { similarity } from '../utils/similarity';
import { TranslationStorage } from '../Database/TranslationStorage';
import * as xml2js from 'xml2js';

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

    async pretranslate(document: vscode.TextDocument, context: vscode.ExtensionContext): Promise<void> {
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Pre-translating XLF file...",
            cancellable: false
        }, async (progress) => {
            try {
                const storage = TranslationStorage.getInstance(context);
                const dbTranslations = await storage.getStoredTranslations();
                
                if (!dbTranslations.length) {
                    vscode.window.showInformationMessage('No translations in storage.');
                    return;
                }

                const parsed = await this.parser.parseContent(document.getText());
                
                // Create lookup map for faster source text matching
                const translationMap = new Map<string, StoredTranslation[]>();
                for (const t of dbTranslations) {
                    if (t.sourceLanguage === parsed.sourceLanguage && 
                        t.targetLanguage === parsed.targetLanguage) {
                        const key = t.source.toLowerCase();
                        if (!translationMap.has(key)) {
                            translationMap.set(key, []);
                        }
                        translationMap.get(key)!.push(t);
                    }
                }

                if (translationMap.size === 0) {
                    vscode.window.showInformationMessage(
                        `No translations found for ${parsed.sourceLanguage} → ${parsed.targetLanguage}`
                    );
                    return;
                }

                const config = vscode.workspace.getConfiguration('xlfEditor');
                const minPercent = config.get<number>('pretranslateMinPercent', 80);
                let changed = false;

                // Process in larger batches
                const BATCH_SIZE = 100;
                const untranslatedUnits = parsed.transUnits.filter((unit: TransUnit) => !unit.target);
                
                for (let i = 0; i < untranslatedUnits.length; i += BATCH_SIZE) {
                    const batch = untranslatedUnits.slice(i, Math.min(i + BATCH_SIZE, untranslatedUnits.length));
                    
                    await Promise.all(batch.map(async (unit: TransUnit) => {
                        // Quick exact match check first
                        const exactMatches = translationMap.get(unit.source.toLowerCase());
                        if (exactMatches?.length) {
                            unit.target = exactMatches[0].target;
                            unit.matchPercent = 100;
                            changed = true;
                            return;
                        }

                        // If no exact match, try similarity matching
                        let bestMatch: StoredTranslation | undefined;
                        let bestPercent = 0;

                        for (const [source, translations] of translationMap) {
                            const percent = similarity(unit.source.toLowerCase(), source);
                            if (percent > bestPercent) {
                                bestPercent = percent;
                                bestMatch = translations[0];
                            }
                            if (percent === 100) break;
                        }

                        if (bestMatch && bestPercent >= minPercent) {
                            unit.target = bestMatch.target;
                            changed = true;
                        }
                        unit.matchPercent = Math.round(bestPercent);
                    }));

                    progress.report({ 
                        message: `Processed ${Math.min((i + BATCH_SIZE), untranslatedUnits.length)} of ${untranslatedUnits.length} units`,
                        increment: (BATCH_SIZE / untranslatedUnits.length) * 100
                    });
                }

                if (changed) {
                    const changes = parsed.transUnits
                        .filter((unit: TransUnit) => unit.target)
                        .map((unit: TransUnit) => ({
                            id: unit.id,
                            value: unit.target
                        }));

                    await this.updater.updateTranslations(document, changes);
                    vscode.window.showInformationMessage('Pre-translation complete.');
                } else {
                    vscode.window.showInformationMessage('No matches found for pre-translation.');
                }
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