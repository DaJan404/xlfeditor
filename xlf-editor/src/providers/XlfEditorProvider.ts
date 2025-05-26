import * as vscode from 'vscode';
import { WebView } from '../view/WebviewContent';
import { XliffController } from '../controllers/XlfController';

export class XlfEditorProvider implements vscode.CustomTextEditorProvider {
    private static instance: XlfEditorProvider;
    private static readonly viewType = 'xlf-editor.translator';
    private webviewPanel?: vscode.WebviewPanel;
    private readonly xliffController: XliffController;
    private readonly webView: WebView;
    private readonly context: vscode.ExtensionContext;

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
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
            console.log('Extension received message:', e);
            switch (e.type) {
                case 'update':
                    if (Array.isArray(e.changes)) {
                        await this.xliffController.handleTranslationUpdate(document, e.changes);
                        webviewPanel.dispose();
                    }
                    break;
                    
                case 'pretranslate':
                    const result = await this.xliffController.pretranslate(document, this.context);
                    webviewPanel.webview.postMessage({ type: 'update', content: result });
                    break;

                case 'saved':
                    webviewPanel.webview.postMessage({ type: 'close' }); 
                    break;

                case 'close':
                    webviewPanel.dispose();
                    break;

                case 'confirm-clear':
                    const answer = await vscode.window.showWarningMessage(
                        'Are you sure you want to clear all translations?',
                        'Yes',
                        'No'
                    );
                    if (answer === 'Yes') {
                        const result = await this.xliffController.clearTranslations(document);
                        webviewPanel.webview.postMessage({ type: 'update', content: result });
                    }
                    break;
            }
        });

        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                if (webviewPanel.visible) {
                    this.xliffController.updateWebview(webviewPanel.webview, document);
                }
            }
        });

        webviewPanel.onDidDispose(() => changeDocumentSubscription.dispose());
    }
}