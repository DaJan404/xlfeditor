import * as vscode from 'vscode';
import * as path from 'path';
import { XlfEditorProvider } from './providers/XlfEditorProvider';
import { StoredTranslation, TranslationStorage } from './Database/TranslationStorage';
import { similarity } from './utils/similarity';
import { XliffParser } from './utils/XlfParser';
import { XliffController } from './controllers/XlfController';

export interface TransUnit {
    id: string;
    source: string;
    target: string;
    matchPercent?: number;
    notes?: Array<{
        from: string;
        priority: string;
        content: string;
    }>;
}

interface ParsedXlf {
    sourceLanguage: string;
    targetLanguage: string;
    transUnits: TransUnit[];
}

const SUPPORTED_LANGUAGES = [
    { id: 'de-DE', label: 'German (Germany)' },
    { id: 'en-US', label: 'English (United States)' },
    { id: 'fr-FR', label: 'French (France)' },
    { id: 'es-ES', label: 'Spanish (Spain)' },
    { id: 'it-IT', label: 'Italian (Italy)' }
];

export function activate(context: vscode.ExtensionContext) {
    console.log('XLF Editor extension is now active!');

    // Register custom editor provider
    context.subscriptions.push(XlfEditorProvider.register(context));



    //check for existing language files
    async function getExistingLanguages(originalPath: string): Promise<string[]> {
        const dir = path.dirname(originalPath);
        const baseName = path.basename(originalPath, '.xlf');
        const files = await vscode.workspace.fs.readDirectory(vscode.Uri.file(dir));

        return files
            .filter(([name]) => name.startsWith(baseName) && name.match(/\.[a-z]{2}-[A-Z]{2}\.xlf$/))
            .map(([name]) => name.match(/\.([a-z]{2}-[A-Z]{2})\.xlf$/)?.[1] || '');
    }

    //openXlf command
    let openXlfCommand = vscode.commands.registerCommand('xlf-editor.openXlf', async () => {

        const storage = TranslationStorage.getInstance(context);
        const parser = new XliffParser();

        const fileUri = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: {
                'XLF files': ['xlf']
            }
        });

        if (fileUri && fileUri[0]) {
            const filename = fileUri[0].fsPath;

            // Check if this is an original file (no language code in filename)
            if (!filename.match(/\.[a-z]{2}-[A-Z]{2}\.xlf$/)) {
                // Get existing language files
                const existingLanguages = await getExistingLanguages(filename);

                // Filter out languages that already exist
                const availableLanguages = SUPPORTED_LANGUAGES.filter(
                    lang => !existingLanguages.includes(lang.id)
                );

                if (availableLanguages.length === 0) {
                    vscode.window.showInformationMessage(
                        'Translation files for all supported languages already exist.'
                    );
                    return;
                }

                const language = await vscode.window.showQuickPick(
                    availableLanguages.map(lang => ({
                        label: lang.label,
                        description: lang.id,
                        id: lang.id
                    })),
                    {
                        placeHolder: 'Create translation file for language:',
                        title: 'Select Target Language',
                        ignoreFocusOut: true,
                        canPickMany: false
                    }
                );

                if (language) {
                    await vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: `Creating ${language.label} translation file...`,
                        cancellable: false
                    }, async (progress) => {
                        try {
                            // Read original file
                            const content = await vscode.workspace.fs.readFile(fileUri[0]);
                            let xmlContent = content.toString();

                            // Create new filename with language code
                            const newPath = filename.replace(
                                /\.xlf$/,
                                `.${language.id}.xlf`
                            );
                            const newUri = vscode.Uri.file(newPath);

                            // Update target-language attribute
                            xmlContent = xmlContent.replace(
                                /(target-language=")[^"]*(")/,
                                `$1${language.id}$2`
                            );

                            // If no target-language attribute exists, add it
                            if (!xmlContent.includes('target-language=')) {
                                xmlContent = xmlContent.replace(
                                    /<file([^>]*)>/,
                                    `<file$1 target-language="${language.id}">`
                                );
                            }

                            // Write new file
                            await vscode.workspace.fs.writeFile(
                                newUri,
                                Buffer.from(xmlContent)
                            );

                            // Open the new file
                            await vscode.commands.executeCommand(
                                'vscode.openWith',
                                newUri,
                                'xlf-editor.translator'
                            );

                            vscode.window.showInformationMessage(
                                `Created ${language.label} translation file`
                            );
                            return;
                        } catch (error) {
                            vscode.window.showErrorMessage(
                                `Failed to create language copy: ${error instanceof Error ? error.message : String(error)}`
                            );
                        }
                    });
                }
            }

            // Open  original file if no copy was created
            await vscode.commands.executeCommand('vscode.openWith', fileUri[0], 'xlf-editor.translator');
        }
    });

    let importCommand = vscode.commands.registerCommand('xlf-editor.importReference', async () => {
        const fileUri = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: {
                'XLF files': ['xlf']
            }
        });

        if (fileUri && fileUri[0]) {
            try {
                const controller = XliffController.getInstance();
                await controller.importTranslations(fileUri[0], context);
            } catch (error) {
                // Error is already handled in importTranslations
            }
        }
    });

    let clearCommand = vscode.commands.registerCommand('xlf-editor.clearReferences', async () => {

        const storage = TranslationStorage.getInstance(context);
        const parser = new XliffParser();

        const result = await vscode.window.showWarningMessage(
            'Are you sure you want to clear all reference translations?',
            'Yes', 'No'
        );

        if (result === 'Yes') {
            await storage.clearStoredTranslations();
            vscode.window.showInformationMessage('Reference translations cleared');
        }
    });

    let showStoredCommand = vscode.commands.registerCommand('xlf-editor.showStoredTranslations', async () => {

        const storage = TranslationStorage.getInstance(context);
        const parser = new XliffParser();

        const translations = await storage.getStoredTranslations();

        if (translations.length === 0) {
            vscode.window.showInformationMessage('No stored translations found');
            return;
        }

        // Create and show output channel
        const output = vscode.window.createOutputChannel('XLF Stored Translations');
        output.clear();
        output.appendLine(`Found ${translations.length} stored translations:`);
        output.appendLine('-----------------------------------');

        translations.forEach((t, index) => {
            output.appendLine(`[${index + 1}] ID: ${t.id}`);
            output.appendLine(`Source (${t.sourceLanguage}): ${t.source}`);
            output.appendLine(`Target (${t.targetLanguage}): ${t.target}`);
            output.appendLine('-----------------------------------');
        });

        output.show();
    });

    let pretranslateCommand = vscode.commands.registerCommand('xlf-editor.pretranslate', async () => {
        const storage = TranslationStorage.getInstance(context);
        const parser = new XliffParser();

        const fileUri = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: { 'XLF files': ['xlf'] }
        });

        if (!fileUri || !fileUri[0]) return;

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Pre-translating XLF file...",
            cancellable: false
        }, async (progress) => {
            const config = vscode.workspace.getConfiguration('xlfEditor');
            const minPercent = config.get<number>('pretranslateMinPercent', 80);

            const content = await vscode.workspace.fs.readFile(fileUri[0]);
            const parsed = await parser.parseContent(content.toString()) as ParsedXlf;
            const dbTranslations = await storage.getStoredTranslations();

            let changed = false;
            const results: { id: string, source: string, target: string, percent: number }[] = [];

            for (const unit of parsed.transUnits) {
                let bestMatch: StoredTranslation | undefined;
                let bestPercent = 0;

                for (const db of dbTranslations) {
                    const percent = similarity(unit.source, db.source);
                    if (percent > bestPercent) {
                        bestPercent = percent;
                        bestMatch = db;
                    }
                }

                if (bestMatch && bestPercent >= minPercent && !unit.target) {
                    unit.target = bestMatch.target;
                    changed = true;
                }

                // For test: collect percent for each line
                results.push({
                    id: unit.id,
                    source: unit.source,
                    target: bestMatch ? bestMatch.target : '',
                    percent: Math.round(bestPercent)
                });
            }

            if (changed) {
                // Save the updated file (overwrite)
                const builder = require('xml2js').Builder;
                const xmlBuilder = new builder({
                    xmldec: { version: '1.0', encoding: 'utf-8' },
                    renderOpts: { pretty: true, indent: '  ' },
                    cdata: false
                });

                // Reconstruct the XLF structure as in your parser
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
                                    'trans-unit': parsed.transUnits.map(unit => ({
                                        $: { id: unit.id },
                                        source: { _: unit.source },
                                        target: { _: unit.target || '' }
                                    }))
                                }
                            }
                        }
                    }
                };

                const updatedXml = xmlBuilder.buildObject(file);
                await vscode.workspace.fs.writeFile(fileUri[0], Buffer.from(updatedXml));
                vscode.window.showInformationMessage('Pre-translation complete.');
            } else {
                vscode.window.showInformationMessage('No matches found for pre-translation.');
            }

            // Show results in output for test purposes
            const output = vscode.window.createOutputChannel('XLF Pre-Translation');
            output.clear();
            output.appendLine('Pre-translation results (percent match per line):');
            results.forEach(r => {
                output.appendLine(`[${r.id}] ${r.percent}% | Source: ${r.source} | Target: ${r.target}`);
            });
            output.show();
        });
    });

    context.subscriptions.push(
        openXlfCommand,
        importCommand,
        clearCommand,
        showStoredCommand,
        pretranslateCommand
    );
}

export function deactivate() { }