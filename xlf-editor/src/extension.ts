import * as vscode from 'vscode';
import { XlfEditorProvider } from './providers/XlfEditorProvider';
import { TranslationStorage } from './Database/TranslationStorage';
import { XliffParser } from './utils/XlfParser';

interface TransUnit {
    id: string;
    source: string;
    target: string;
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

export function activate(context: vscode.ExtensionContext) {
    console.log('XLF Editor extension is now active!');

    // Register custom editor provider
    context.subscriptions.push(XlfEditorProvider.register(context));

    const storage = TranslationStorage.getInstance(context);
    const parser = new XliffParser();

    let openXlfCommand = vscode.commands.registerCommand('xlf-editor.openXlf', async () => {
        const fileUri = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: {
                'XLF files': ['xlf']
            }
        });

        if (fileUri && fileUri[0]) {
            // Open the file in our custom editor
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
                const content = await vscode.workspace.fs.readFile(fileUri[0]);
                const parsed = await parser.parseContent(content.toString()) as ParsedXlf;
                
                const translations = parsed.transUnits.map((unit: TransUnit) => ({
                    id: unit.id,
                    source: unit.source,
                    target: unit.target || '',
                    sourceLanguage: parsed.sourceLanguage,
                    targetLanguage: parsed.targetLanguage
                }));

                await storage.storeTranslations(translations);
                vscode.window.showInformationMessage(
                    `Successfully imported ${translations.length} translations as reference`
                );
            } catch (error) {
                vscode.window.showErrorMessage(
                    `Failed to import reference: ${error instanceof Error ? error.message : String(error)}`
                );
            }
        }
    });

    let clearCommand = vscode.commands.registerCommand('xlf-editor.clearReferences', async () => {
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

    context.subscriptions.push(
        openXlfCommand, 
        importCommand, 
        clearCommand, 
        showStoredCommand
    );
}

export function deactivate() {}