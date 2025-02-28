import * as vscode from 'vscode';
import { getWebviewContent } from '../view/WebviewContent';
import { XliffParser } from '../utils/XlfParser';
import { XliffUpdater } from '../utils/XlfUpdater';

export class XlfEditorProvider implements vscode.CustomTextEditorProvider {
    private static readonly viewType = 'xlf-editor.translator';
    private updating = false;
    private hasUnsavedChanges = false;
    private webviewPanel?: vscode.WebviewPanel;
    private xliffParser: XliffParser;
    private xliffUpdater: XliffUpdater;

    constructor(private readonly context: vscode.ExtensionContext) {
        this.xliffParser = new XliffParser();
        this.xliffUpdater = new XliffUpdater();
    }

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        return vscode.window.registerCustomEditorProvider(
            XlfEditorProvider.viewType,
            new XlfEditorProvider(context)
        );
    }

    async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        this.webviewPanel = webviewPanel;
        webviewPanel.webview.options = { enableScripts: true };
        webviewPanel.webview.html = getWebviewContent();

        await this.updateWebview(webviewPanel.webview, document);
        this.setupMessageHandlers(webviewPanel, document);
    }

    private setupMessageHandlers(webviewPanel: vscode.WebviewPanel, document: vscode.TextDocument): void {
        webviewPanel.webview.onDidReceiveMessage(async e => {
            switch (e.type) {
                case 'update':
                    if (!this.updating) {
                        this.updating = true;
                        try {
                            if (Array.isArray(e.changes)) {
                                await this.xliffUpdater.updateTranslations(document, e.changes);
                                webviewPanel.dispose();
                            }
                        } finally {
                            this.updating = false;
                        }
                    }
                    break;
                case 'saveState':
                    this.hasUnsavedChanges = e.hasUnsavedChanges;
                    break;
            }
        });

        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString() && !this.updating) {
                this.updateWebview(webviewPanel.webview, document);
            }
        });

        webviewPanel.onDidDispose(() => changeDocumentSubscription.dispose());
    }

    private async updateWebview(webview: vscode.Webview, document: vscode.TextDocument) {
        try {
            const content = await this.xliffParser.parseContent(document.getText());
            webview.postMessage({ type: 'update', content });
        } catch (error) {
            console.error('Error updating webview:', error);
            vscode.window.showErrorMessage(`Failed to parse XLF document: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}