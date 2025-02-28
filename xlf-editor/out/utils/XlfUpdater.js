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
exports.XliffUpdater = void 0;
const vscode = __importStar(require("vscode"));
const xml2js = __importStar(require("xml2js"));
class XliffUpdater {
    async updateTranslations(document, changes) {
        try {
            const result = await this.parseDocument(document);
            this.applyChanges(result, changes);
            await this.saveChanges(document, result);
        }
        catch (error) {
            console.error('Error updating translations:', error);
            throw error;
        }
    }
    async parseDocument(document) {
        const parser = new xml2js.Parser({
            explicitArray: false,
            mergeAttrs: false,
            explicitCharkey: true,
            charkey: '_',
            attrkey: '$'
        });
        const result = await parser.parseStringPromise(document.getText());
        if (!result.xliff?.file?.body?.group) {
            throw new Error('Invalid XLIFF structure');
        }
        return result;
    }
    applyChanges(result, changes) {
        let transUnits = result.xliff.file.body.group['trans-unit'];
        transUnits = Array.isArray(transUnits) ? transUnits : [transUnits];
        for (const change of changes) {
            const unit = transUnits.find((u) => u.$.id === change.id);
            if (unit) {
                unit.target = { $: {}, _: change.value };
            }
        }
    }
    async saveChanges(document, result) {
        const builder = new xml2js.Builder({
            xmldec: { version: '1.0', encoding: 'utf-8' },
            renderOpts: { pretty: true, indent: '  ' },
            cdata: false
        });
        const updatedXml = builder.buildObject(result);
        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), updatedXml);
        await vscode.workspace.applyEdit(edit);
        await document.save();
    }
}
exports.XliffUpdater = XliffUpdater;
//# sourceMappingURL=XlfUpdater.js.map