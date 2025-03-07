import * as vscode from 'vscode';
import { WebView } from '../view/WebviewContent';
import { XliffController } from '../controllers/XlfController';

export class XlfEditorProvider implements vscode.CustomTextEditorProvider {
    private static instance: XlfEditorProvider;
    private static readonly viewType = 'xlf-editor.translator';
    private webviewPanel?: vscode.WebviewPanel;
    private readonly xliffController: XliffController;
    private readonly webView: WebView;

    private constructor(private readonly context: vscode.ExtensionContext) {
        this.xliffController = XliffController.getInstance();
        this.webView = WebView.getInstance();
    }

    public static getInstance(context: vscode.ExtensionContext): XlfEditorProvider {
        if (!XlfEditorProvider.instance) {
            XlfEditorProvider.instance = new XlfEditorProvider(context);
        }
        return XlfEditorProvider.instance;
    }

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        return vscode.window.registerCustomEditorProvider(
            XlfEditorProvider.viewType,
            XlfEditorProvider.getInstance(context)
        );
    }

    async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        this.webviewPanel = webviewPanel;
        this.webView.initialize(webviewPanel);
        await this.xliffController.updateWebview(webviewPanel.webview, document);
        this.setupMessageHandlers(webviewPanel, document);
    }

    private setupMessageHandlers(webviewPanel: vscode.WebviewPanel, document: vscode.TextDocument): void {
        webviewPanel.webview.onDidReceiveMessage(async e => {
            switch (e.type) {
                case 'update':
                    if (Array.isArray(e.changes)) {
                        await this.xliffController.handleTranslationUpdate(document, e.changes);
                        webviewPanel.dispose();
                    }
                    break;
            }
        });

        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                this.xliffController.updateWebview(webviewPanel.webview, document);
            }
        });

        webviewPanel.onDidDispose(() => changeDocumentSubscription.dispose());
    }
}