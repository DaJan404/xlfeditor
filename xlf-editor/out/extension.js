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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const XlfEditorProvider_1 = require("./providers/XlfEditorProvider");
const TranslationStorage_1 = require("./Database/TranslationStorage");
const XlfParser_1 = require("./utils/XlfParser");
function activate(context) {
    console.log('XLF Editor extension is now active!');
    // Register custom editor provider
    context.subscriptions.push(XlfEditorProvider_1.XlfEditorProvider.register(context));
    const storage = TranslationStorage_1.TranslationStorage.getInstance(context);
    const parser = new XlfParser_1.XliffParser();
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
                const parsed = await parser.parseContent(content.toString());
                const translations = parsed.transUnits.map((unit) => ({
                    id: unit.id,
                    source: unit.source,
                    target: unit.target || '',
                    sourceLanguage: parsed.sourceLanguage,
                    targetLanguage: parsed.targetLanguage
                }));
                await storage.storeTranslations(translations);
                vscode.window.showInformationMessage(`Successfully imported ${translations.length} translations as reference`);
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to import reference: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    });
    let clearCommand = vscode.commands.registerCommand('xlf-editor.clearReferences', async () => {
        const result = await vscode.window.showWarningMessage('Are you sure you want to clear all reference translations?', 'Yes', 'No');
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
    context.subscriptions.push(openXlfCommand, importCommand, clearCommand, showStoredCommand);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map