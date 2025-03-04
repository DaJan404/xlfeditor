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
const XlfParser_1 = require("../utils/XlfParser");
const XlfUpdater_1 = require("../utils/XlfUpdater");
class XlfEditorProvider {
    context;
    static instance;
    static viewType = 'xlf-editor.translator';
    updating = false;
    hasUnsavedChanges = false;
    webviewPanel;
    xliffParser;
    xliffUpdater;
    // Singleton pattern
    constructor(context) {
        this.context = context;
        this.xliffParser = new XlfParser_1.XliffParser();
        this.xliffUpdater = new XlfUpdater_1.XliffUpdater();
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
        this.webviewPanel = webviewPanel;
        this.initializeWebview(webviewPanel);
        await this.updateWebview(webviewPanel.webview, document);
        this.setupMessageHandlers(webviewPanel, document);
    }
    initializeWebview(webviewPanel) {
        webviewPanel.webview.options = { enableScripts: true };
        webviewPanel.webview.html = (0, WebviewContent_1.getWebviewContent)();
    }
    setupMessageHandlers(webviewPanel, document) {
        webviewPanel.webview.onDidReceiveMessage(async (e) => {
            switch (e.type) {
                case 'update':
                    if (!this.updating) {
                        this.updating = true;
                        try {
                            if (Array.isArray(e.changes)) {
                                await this.xliffUpdater.updateTranslations(document, e.changes);
                                webviewPanel.dispose();
                            }
                        }
                        finally {
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
    async updateWebview(webview, document) {
        try {
            const content = await this.xliffParser.parseContent(document.getText());
            webview.postMessage({ type: 'update', content });
        }
        catch (error) {
            console.error('Error updating webview:', error);
            vscode.window.showErrorMessage(`Failed to parse XLF document: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
exports.XlfEditorProvider = XlfEditorProvider;
//# sourceMappingURL=XlfEditorProvider.js.map