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
exports.XlfEditorProvider = void 0;
const vscode = __importStar(require("vscode"));
const WebviewContent_1 = require("../view/WebviewContent");
const XlfController_1 = require("../controllers/XlfController");
class XlfEditorProvider {
    static instance;
    static viewType = 'xlf-editor.translator';
    webviewPanel;
    xliffController;
    webView;
    context;
    lastDocumentText = '';
    constructor(context) {
        this.context = context;
        this.xliffController = XlfController_1.XliffController.getInstance();
        this.webView = WebviewContent_1.WebView.getInstance();
    }
    static getInstance(context) {
        if (!XlfEditorProvider.instance) {
            XlfEditorProvider.instance = new XlfEditorProvider(context);
        }
        return XlfEditorProvider.instance;
    }
    static register(context) {
        return vscode.window.registerCustomEditorProvider(XlfEditorProvider.viewType, XlfEditorProvider.getInstance(context));
    }
    async resolveCustomTextEditor(document, webviewPanel, _token) {
        try {
            this.webviewPanel = webviewPanel;
            this.webView.initialize(webviewPanel);
            await this.xliffController.updateWebview(webviewPanel.webview, document);
            this.setupMessageHandlers(webviewPanel, document);
            // Handle tab visibility changes
            webviewPanel.onDidChangeViewState(e => {
                if (e.webviewPanel.visible) {
                    this.xliffController.updateWebview(webviewPanel.webview, document);
                }
            });
        }
        catch (error) {
            console.error('Error in resolveCustomTextEditor:', error);
            vscode.window.showErrorMessage('Failed to load XLF file: ' + (error instanceof Error ? error.message : String(error)));
        }
    }
    setupMessageHandlers(webviewPanel, document) {
        webviewPanel.webview.onDidReceiveMessage(async (e) => {
            console.log('Extension received message:', e);
            switch (e.type) {
                case 'update':
                    if (Array.isArray(e.changes)) {
                        await this.xliffController.handleTranslationUpdate(document, e.changes);
                        // webviewPanel.dispose();
                    }
                    break;
                case 'pretranslate':
                    try {
                        const result = await this.xliffController.pretranslate(document, this.context);
                        if (result) {
                            // Update the webview with new content and enable save button
                            webviewPanel.webview.postMessage({
                                type: 'update',
                                content: result,
                                enableSave: true // Add this flag
                            });
                        }
                    }
                    catch (error) {
                        vscode.window.showErrorMessage('Failed to pre-translate: ' + (error instanceof Error ? error.message : String(error)));
                    }
                    break;
                case 'saved':
                    webviewPanel.webview.postMessage({ type: 'close' });
                    break;
                case 'close':
                    webviewPanel.dispose();
                    break;
                case 'confirm-clear':
                    const answer = await vscode.window.showWarningMessage('Are you sure you want to clear all translations?', 'Yes', 'No');
                    if (answer === 'Yes') {
                        const result = await this.xliffController.clearTranslations(document);
                        webviewPanel.webview.postMessage({ type: 'update', content: result });
                    }
                    break;
            }
        });
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                // Only update if content actually changed
                const currentText = document.getText();
                if (currentText !== this.lastDocumentText) {
                    this.lastDocumentText = currentText;
                    if (webviewPanel.visible) {
                        this.xliffController.updateWebview(webviewPanel.webview, document);
                    }
                }
            }
        });
        // Save initial state
        this.lastDocumentText = document.getText();
        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
            this.lastDocumentText = ''; // Clear the cache when panel is disposed
        });
    }
}
exports.XlfEditorProvider = XlfEditorProvider;
//# sourceMappingURL=XlfEditorProvider.js.map