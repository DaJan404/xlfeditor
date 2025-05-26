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
exports.XliffController = void 0;
const vscode = __importStar(require("vscode"));
const XlfParser_1 = require("../utils/XlfParser");
const XlfUpdater_1 = require("../utils/XlfUpdater");
const similarity_1 = require("../utils/similarity");
const TranslationStorage_1 = require("../Database/TranslationStorage");
const xml2js = __importStar(require("xml2js"));
class XliffController {
    static instance;
    updating = false;
    parser;
    updater;
    constructor() {
        this.parser = new XlfParser_1.XliffParser();
        this.updater = new XlfUpdater_1.XliffUpdater();
    }
    // Singleton pattern
    static getInstance() {
        if (!XliffController.instance) {
            XliffController.instance = new XliffController();
        }
        return XliffController.instance;
    }
    async updateWebview(webview, document) {
        try {
            const content = await this.parser.parseContent(document.getText());
            webview.postMessage({ type: 'update', content });
        }
        catch (error) {
            console.error('Error updating webview:', error);
            vscode.window.showErrorMessage(`Failed to parse XLF document: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async handleTranslationUpdate(document, changes) {
        if (this.updating)
            return;
        this.updating = true;
        try {
            await this.updater.updateTranslations(document, changes);
        }
        finally {
            this.updating = false;
        }
    }
    async pretranslate(document, context) {
        const storage = TranslationStorage_1.TranslationStorage.getInstance(context);
        const dbTranslations = await storage.getStoredTranslations();
        // If no translations stored, exit early
        if (!dbTranslations.length) {
            return this.parser.parseContent(document.getText());
        }
        const config = vscode.workspace.getConfiguration('xlfEditor');
        const minPercent = config.get('pretranslateMinPercent', 80);
        const parsed = await this.parser.parseContent(document.getText());
        // Get translations only for matching source language
        const relevantTranslations = dbTranslations.filter(t => t.sourceLanguage === parsed.sourceLanguage &&
            t.targetLanguage === parsed.targetLanguage);
        if (!relevantTranslations.length) {
            vscode.window.showInformationMessage(`No translations found for ${parsed.sourceLanguage} → ${parsed.targetLanguage}`);
            return parsed;
        }
        // Process in batches for better responsiveness
        const BATCH_SIZE = 50;
        for (let i = 0; i < parsed.transUnits.length; i += BATCH_SIZE) {
            const batch = parsed.transUnits.slice(i, i + BATCH_SIZE);
            await new Promise(resolve => setTimeout(resolve, 0)); // Allow UI updates
            for (const unit of batch) {
                if (unit.target)
                    continue; // Skip already translated units
                let bestMatch;
                let bestPercent = 0;
                // Only compare with translations that match our language pair
                for (const db of relevantTranslations) {
                    const percent = (0, similarity_1.similarity)(unit.source, db.source);
                    if (percent > bestPercent) {
                        bestPercent = percent;
                        bestMatch = db;
                    }
                    if (percent === 100)
                        break; // Perfect match found, stop searching
                }
                unit.matchPercent = Math.round(bestPercent);
                if (bestMatch && bestPercent >= minPercent) {
                    unit.target = bestMatch.target;
                }
            }
        }
        return parsed;
    }
    async clearTranslations(document) {
        const parsed = await this.parser.parseContent(document.getText());
        // Clear only target translations, preserve notes and other data
        parsed.transUnits.forEach((unit) => {
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
                            'trans-unit': parsed.transUnits.map((unit) => ({
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
        edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), updatedXml);
        await vscode.workspace.applyEdit(edit);
        return parsed;
    }
    async importTranslations(fileUri, context) {
        const storage = TranslationStorage_1.TranslationStorage.getInstance(context);
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
                    const translations = batch.map((unit) => ({
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
                vscode.window.showInformationMessage(`Successfully imported ${totalUnits} translations as reference`);
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to import reference: ${error instanceof Error ? error.message : String(error)}`);
                throw error;
            }
        });
    }
}
exports.XliffController = XliffController;
//# sourceMappingURL=XlfController.js.map