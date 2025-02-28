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
const xml2js = __importStar(require("xml2js"));
class XlfEditorProvider {
    context;
    static viewType = 'xlf-editor.translator';
    updating = false;
    hasUnsavedChanges = false;
    webviewPanel;
    static register(context) {
        return vscode.window.registerCustomEditorProvider(XlfEditorProvider.viewType, new XlfEditorProvider(context));
    }
    constructor(context) {
        this.context = context;
    }
    async resolveCustomTextEditor(document, webviewPanel, _token) {
        this.webviewPanel = webviewPanel;
        webviewPanel.webview.options = { enableScripts: true };
        webviewPanel.webview.html = this.getHtmlForWebview();
        // Initial load
        await this.updateWebview(webviewPanel.webview, document);
        // Handle messages from webview
        webviewPanel.webview.onDidReceiveMessage(async (e) => {
            switch (e.type) {
                case 'update':
                    if (!this.updating) {
                        this.updating = true;
                        try {
                            if (Array.isArray(e.changes)) {
                                // Process all changes in one operation
                                await this.updateTranslations(document, e.changes);
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
        // Handle changes to the document
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString() && !this.updating) {
                this.updateWebview(webviewPanel.webview, document);
            }
        });
        webviewPanel.onDidDispose(() => changeDocumentSubscription.dispose());
    }
    async parseXlfContent(content) {
        return new Promise((resolve, reject) => {
            // Configure parser to handle arrays better
            const parser = new xml2js.Parser({
                explicitArray: false,
                mergeAttrs: false,
                explicitCharkey: true,
                charkey: '_',
                attrkey: '$'
            });
            parser.parseString(content, (err, result) => {
                if (err) {
                    console.error('XML parsing error:', err);
                    reject(err);
                    return;
                }
                try {
                    console.log('Parsed XML:', JSON.stringify(result, null, 2));
                    const xliff = result.xliff;
                    if (!xliff) {
                        throw new Error('No xliff element found');
                    }
                    const file = xliff.file;
                    if (!file) {
                        throw new Error('No file element found');
                    }
                    const group = file.body?.group;
                    if (!group) {
                        throw new Error('No group element found');
                    }
                    // Handle both single and multiple trans-units
                    const transUnits = group['trans-unit'];
                    if (!transUnits) {
                        throw new Error('No trans-unit elements found');
                    }
                    // Ensure trans-units is always an array
                    const units = Array.isArray(transUnits) ? transUnits : [transUnits];
                    // Transform to a more usable structure
                    const transformed = units.map((unit) => {
                        console.log('Processing trans-unit:', {
                            id: unit.$.id,
                            source: unit.source?._,
                            hasTarget: !!unit.target,
                            noteCount: Array.isArray(unit.note) ? unit.note.length : (unit.note ? 1 : 0)
                        });
                        return {
                            id: unit.$.id || '',
                            source: unit.source?._ || '',
                            target: unit.target?._ || '',
                            notes: Array.isArray(unit.note)
                                ? unit.note.map((note) => ({
                                    from: note.$.from || '',
                                    priority: note.$.priority || '',
                                    content: note._ || ''
                                }))
                                : unit.note
                                    ? [{
                                            from: unit.note.$.from || '',
                                            priority: unit.note.$.priority || '',
                                            content: unit.note._ || ''
                                        }]
                                    : []
                        };
                    });
                    console.log('Transformed units count:', transformed.length);
                    resolve({
                        sourceLanguage: file.$['source-language'] || '',
                        targetLanguage: file.$['target-language'] || '',
                        transUnits: transformed
                    });
                }
                catch (error) {
                    console.error('Processing error:', error);
                    reject(error);
                }
            });
        });
    }
    async updateWebview(webview, document) {
        try {
            const content = await this.parseXlfContent(document.getText());
            console.log('Parsed content:', content);
            webview.postMessage({
                type: 'update',
                content: content
            });
        }
        catch (error) {
            console.error('Error updating webview:', error);
            const errorMessage = (error instanceof Error) ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to parse XLF document: ${errorMessage}`);
        }
    }
    async updateTranslation(document, id, value) {
        try {
            const xmlContent = document.getText();
            const parser = new xml2js.Parser({
                explicitArray: false,
                mergeAttrs: false,
                explicitCharkey: true,
                charkey: '_',
                attrkey: '$'
            });
            const result = await parser.parseStringPromise(xmlContent);
            // Ensure we have the correct path to trans-units
            if (!result.xliff?.file?.body?.group) {
                throw new Error('Invalid XLIFF structure');
            }
            // Get trans-unit array and ensure it's always an array
            let group = result.xliff.file.body.group;
            let transUnits = group['trans-unit'];
            if (!Array.isArray(transUnits)) {
                transUnits = [transUnits];
                group['trans-unit'] = transUnits;
            }
            // Find the unit to update
            const unit = transUnits.find((u) => u.$.id === id);
            if (!unit) {
                throw new Error(`Translation unit with id ${id} not found`);
            }
            // Always create/update target, even if value is empty
            unit.target = {
                $: {},
                _: value
            };
            // Convert back to XML
            const builder = new xml2js.Builder({
                xmldec: { version: '1.0', encoding: 'utf-8' },
                renderOpts: { pretty: true, indent: '  ' },
                cdata: false
            });
            const updatedXml = builder.buildObject(result);
            // Create and apply the edit
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), updatedXml);
            // Apply changes and save
            await vscode.workspace.applyEdit(edit);
            await document.save();
            // Update webview
            if (this.webviewPanel) {
                this.webviewPanel.webview.postMessage({ type: 'saved' });
                await this.updateWebview(this.webviewPanel.webview, document);
            }
        }
        catch (error) {
            console.error('Error updating translation:', error);
            throw error;
        }
    }
    async updateTranslations(document, changes) {
        try {
            const xmlContent = document.getText();
            const parser = new xml2js.Parser({
                explicitArray: false,
                mergeAttrs: false,
                explicitCharkey: true,
                charkey: '_',
                attrkey: '$'
            });
            const result = await parser.parseStringPromise(xmlContent);
            if (!result.xliff?.file?.body?.group) {
                throw new Error('Invalid XLIFF structure');
            }
            let group = result.xliff.file.body.group;
            let transUnits = group['trans-unit'];
            transUnits = Array.isArray(transUnits) ? transUnits : [transUnits];
            // Update all translations in memory first
            for (const change of changes) {
                const unit = transUnits.find((u) => u.$.id === change.id);
                if (unit) {
                    unit.target = {
                        $: {},
                        _: change.value
                    };
                }
            }
            // Convert to XML once
            const builder = new xml2js.Builder({
                xmldec: { version: '1.0', encoding: 'utf-8' },
                renderOpts: { pretty: true, indent: '  ' },
                cdata: false
            });
            const updatedXml = builder.buildObject(result);
            // Apply all changes in one edit
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), updatedXml);
            await vscode.workspace.applyEdit(edit);
            await document.save();
        }
        catch (error) {
            console.error('Error updating translations:', error);
            throw error;
        }
    }
    getHtmlForWebview() {
        return `<!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {
                        padding: 0;
                        margin: 0;
                        color: var(--vscode-foreground);
                        font-family: var(--vscode-font-family);
                        background-color: var(--vscode-editor-background);
                    }
                    .table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    .table-header {
                        position: sticky;
                        top: 0;
                        background-color: var(--vscode-editor-background);
                        z-index: 2;
                    }
                    .table-body {
                        width: 100%;
                    }
                    tr {
                        display: flex;
                        width: 100%;
                    }
                    td, th {
                        flex: 1;
                        padding: 8px;
                        border: 1px solid var(--vscode-panel-border);
                    }
                    th {
                        font-weight: 500;
                        text-align: left;
                        border-bottom: 2px solid var(--vscode-panel-border);
                    }
                    .translation-pair {
                        display: flex;
                        margin: 4px 0;
                        background: var(--vscode-editor-inactiveSelectionBackground);
                        border-radius: 4px;
                    }
                    .translation-item {
                        flex: 1;
                        padding: 12px;
                    }
                    .index-number {
                        color: var(--vscode-textPreformat-foreground);
                        font-size: 12px;
                        margin-bottom: 8px;
                    }
                    .source-text {
                        line-height: 1.4;
                    }
                    textarea {
                        width: 100%;
                        overflow: hidden;
                        background-color: transparent;
                        color: var(--vscode-input-foreground);
                        border: none;
                        border-radius: 2px;
                        padding: 8px;
                        resize: none;
                        font-family: var(--vscode-font-family);
                        font-size: var(--vscode-font-size);
                        line-height: 1.4;
                    }
                    textarea:focus {
                        outline: 1px solid var(--vscode-focusBorder);
                        background-color: var(--vscode-input-background);
                    }
                    .translation-item {
                        flex: 1;
                        padding: 12px;
                        background: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 4px;
                    }
                    .header-actions {
                        position: fixed;
                        top: 10px;
                        right: 20px;
                        z-index: 3;
                    }
                    .save-button {
                        padding: 4px 12px;
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        border-radius: 2px;
                        cursor: pointer;
                        font-family: var(--vscode-font-family);
                        font-size: var(--vscode-font-size);
                    }
                    .save-button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    .save-button:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }
                </style>
            </head>
            <body>
                <div class="header-actions">
                    <button id="saveButton" class="save-button" disabled>Save Changes</button>
                </div>
                <table class="table">
                    <thead class="table-header">
                        <tr>
                            <th id="sourceHeader">Source Text</th>
                            <th id="translationHeader">Translation</th>
                        </tr>
                    </thead>
                    <tbody id="translationRows">
                    </tbody>
                </table>
                <script>
                    const vscode = acquireVsCodeApi();
                    let hasUnsavedChanges = false;
                    
                    function updateSaveState(state) {
                        hasUnsavedChanges = state;
                        document.getElementById('saveButton').disabled = !state;
                        vscode.postMessage({ 
                            type: 'saveState', 
                            hasUnsavedChanges: state 
                        });
                    }

                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.type) {
                            case 'update':
                                updateContent(message.content);
                                break;
                            case 'saved':
                                updateSaveState(false);
                                break;
                        }
                    });

                    function updateContent(data) {
                        const tbody = document.getElementById('translationRows');
                        const sourceHeader = document.getElementById('sourceHeader');
                        const translationHeader = document.getElementById('translationHeader');
                        
                        tbody.innerHTML = '';

                        if (!data || !data.transUnits) {
                            console.error('No translation units found in data');
                            return;
                        }

                        sourceHeader.textContent = \`Source Text (\${data.transUnits.length})\`;
                        translationHeader.textContent = \`Translation (\${data.transUnits.length})\`;

                        data.transUnits.forEach((unit, index) => {
                            const row = document.createElement('tr');
                            
                            row.innerHTML = \`
                                <td>
                                    <div class="translation-item">
                                        <div class="index-number">#\${index + 1}</div>
                                        <div class="source-text">\${escapeHtml(unit.source)}</div>
                                        \${unit.notes?.length > 0 ? \`
                                            <div class="notes">
                                                \${unit.notes.map(n => \`\${escapeHtml(n.from)}: \${escapeHtml(n.content || '')}\`).join('<br>')}
                                            </div>
                                        \` : ''}
                                    </div>
                                </td>
                                <td>
                                    <div class="translation-item">
                                        <div class="index-number">#\${index + 1}</div>
                                        <textarea 
                                            data-id="\${escapeHtml(unit.id)}"
                                            placeholder="Enter translation here..."
                                        >\${escapeHtml(unit.target || '')}</textarea>
                                    </div>
                                </td>
                            \`.trim();
                            
                            tbody.appendChild(row);
                        });

                        // Add event listeners for textareas
                        document.querySelectorAll('textarea').forEach(textarea => {
                            // Initial resize
                            autoResizeTextarea(textarea);
                            
                            // Resize on input
                            textarea.addEventListener('input', e => {
                                const target = e.target;
                                autoResizeTextarea(target);
                                updateSaveState(true);
                            });

                            // Resize on keydown (for Enter key)
                            textarea.addEventListener('keydown', e => {
                                setTimeout(() => autoResizeTextarea(e.target), 0);
                            });
                        });

                        document.getElementById('saveButton').addEventListener('click', () => {
                            const changes = [];
                            document.querySelectorAll('textarea').forEach(textarea => {
                                // Include all translations, even empty ones
                                changes.push({
                                    type: 'update',
                                    id: textarea.dataset.id,
                                    value: textarea.value.trim()
                                });
                            });

                            // Send all changes at once
                            vscode.postMessage({
                                type: 'update',
                                changes: changes
                            });

                            updateSaveState(false);
                        });
                    }

                    function escapeHtml(unsafe) {
                        if (!unsafe) return '';
                        return unsafe
                            .replace(/&/g, "&amp;")
                            .replace(/</g, "&lt;")
                            .replace(/>/g, "&gt;")
                            .replace(/"/g, "&quot;")
                            .replace(/'/g, "&#039;");
                    }

                    function autoResizeTextarea(textarea) {
                        textarea.style.height = 'auto';
                        textarea.style.height = (textarea.scrollHeight) + 'px';
                    }
                </script>
            </body>
            </html>`;
    }
}
exports.XlfEditorProvider = XlfEditorProvider;
//# sourceMappingURL=XlfEditorProvider.js.map