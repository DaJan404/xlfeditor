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
class XliffController {
    static instance;
    updating = false;
    parser;
    updater;
    // Singleton pattern
    constructor() {
        this.parser = new XlfParser_1.XliffParser();
        this.updater = new XlfUpdater_1.XliffUpdater();
    }
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
}
exports.XliffController = XliffController;
//# sourceMappingURL=XlfController.js.map