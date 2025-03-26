import * as vscode from 'vscode';
import { XliffParser } from '../utils/XlfParser';
import { XliffUpdater } from '../utils/XlfUpdater';

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

    async handleTranslationUpdate(document: vscode.TextDocument, changes: Array<{id: string, value: string}>): Promise<void> {
        if (this.updating) return;

        this.updating = true;
        try {
            await this.updater.updateTranslations(document, changes);
        } finally {
            this.updating = false;
        }
    }
}