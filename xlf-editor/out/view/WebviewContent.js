"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebView = void 0;
class WebView {
    static instance;
    constructor() { }
    static getInstance() {
        if (!WebView.instance) {
            WebView.instance = new WebView();
        }
        return WebView.instance;
    }
    getWebviewContent() {
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
                    line-height: 1.6;
                    margin-bottom: 12px;
                    font-size: 14px;
                }
                .notes {
                    margin-top: 8px;
                    font-size: 13px;
                    color: var(--vscode-textPreformat-foreground);
                }
                .note-item {
                    margin: 4px 0;
                    padding: 4px 0;
                }
                .note-from {
                    font-weight: 500;
                    color: var(--vscode-textLink-foreground);
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
                                            \${unit.notes.map(n => {
                                                if (n.from === 'Developer' || n.from === 'Xliff Generator') {
                                                    return \`<div class="note-item">
                                                        <span class="note-from">\${escapeHtml(n.from)}:</span> 
                                                        \${escapeHtml(n.content || '')}
                                                    </div>\`;
                                                }
                                                return '';
                                            }).filter(Boolean).join('')}
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
    initialize(webviewPanel) {
        webviewPanel.webview.options = { enableScripts: true };
        webviewPanel.webview.html = this.getWebviewContent();
    }
}
exports.WebView = WebView;
// export function getWebviewContent(): string {
//     return `<!DOCTYPE html>
//         <html>
//         <head>
//             <meta charset="UTF-8">
//             <style>
//                 body {
//                     padding: 0;
//                     margin: 0;
//                     color: var(--vscode-foreground);
//                     font-family: var(--vscode-font-family);
//                     background-color: var(--vscode-editor-background);
//                 }
//                 .table {
//                     width: 100%;
//                     border-collapse: collapse;
//                 }
//                 .table-header {
//                     position: sticky;
//                     top: 0;
//                     background-color: var(--vscode-editor-background);
//                     z-index: 2;
//                 }
//                 .table-body {
//                     width: 100%;
//                 }
//                 tr {
//                     display: flex;
//                     width: 100%;
//                 }
//                 td, th {
//                     flex: 1;
//                     padding: 8px;
//                     border: 1px solid var(--vscode-panel-border);
//                 }
//                 th {
//                     font-weight: 500;
//                     text-align: left;
//                     border-bottom: 2px solid var(--vscode-panel-border);
//                 }
//                 .translation-pair {
//                     display: flex;
//                     margin: 4px 0;
//                     background: var(--vscode-editor-inactiveSelectionBackground);
//                     border-radius: 4px;
//                 }
//                 .translation-item {
//                     flex: 1;
//                     padding: 12px;
//                 }
//                 .index-number {
//                     color: var(--vscode-textPreformat-foreground);
//                     font-size: 12px;
//                     margin-bottom: 8px;
//                 }
//                 .source-text {
//                     line-height: 1.6;
//                     margin-bottom: 12px;
//                     font-size: 14px;
//                 }
//                 .notes {
//                     margin-top: 8px;
//                     font-size: 13px;
//                     color: var(--vscode-textPreformat-foreground);
//                 }
//                 .note-item {
//                     margin: 4px 0;
//                     padding: 4px 0;
//                 }
//                 .note-from {
//                     font-weight: 500;
//                     color: var(--vscode-textLink-foreground);
//                 }
//                 textarea {
//                     width: 100%;
//                     overflow: hidden;
//                     background-color: transparent;
//                     color: var(--vscode-input-foreground);
//                     border: none;
//                     border-radius: 2px;
//                     padding: 8px;
//                     resize: none;
//                     font-family: var(--vscode-font-family);
//                     font-size: var(--vscode-font-size);
//                     line-height: 1.4;
//                 }
//                 textarea:focus {
//                     outline: 1px solid var(--vscode-focusBorder);
//                     background-color: var(--vscode-input-background);
//                 }
//                 .translation-item {
//                     flex: 1;
//                     padding: 12px;
//                     background: var(--vscode-editor-background);
//                     border: 1px solid var(--vscode-panel-border);
//                     border-radius: 4px;
//                 }
//                 .header-actions {
//                     position: fixed;
//                     top: 10px;
//                     right: 20px;
//                     z-index: 3;
//                 }
//                 .save-button {
//                     padding: 4px 12px;
//                     background-color: var(--vscode-button-background);
//                     color: var(--vscode-button-foreground);
//                     border: none;
//                     border-radius: 2px;
//                     cursor: pointer;
//                     font-family: var(--vscode-font-family);
//                     font-size: var(--vscode-font-size);
//                 }
//                 .save-button:hover {
//                     background-color: var(--vscode-button-hoverBackground);
//                 }
//                 .save-button:disabled {
//                     opacity: 0.5;
//                     cursor: not-allowed;
//                 }
//             </style>
//         </head>
//         <body>
//             <div class="header-actions">
//                 <button id="saveButton" class="save-button" disabled>Save Changes</button>
//             </div>
//             <table class="table">
//                 <thead class="table-header">
//                     <tr>
//                         <th id="sourceHeader">Source Text</th>
//                         <th id="translationHeader">Translation</th>
//                     </tr>
//                 </thead>
//                 <tbody id="translationRows">
//                 </tbody>
//             </table>
//             <script>
//                 const vscode = acquireVsCodeApi();
//                 let hasUnsavedChanges = false;
//                 function updateSaveState(state) {
//                     hasUnsavedChanges = state;
//                     document.getElementById('saveButton').disabled = !state;
//                     vscode.postMessage({ 
//                         type: 'saveState', 
//                         hasUnsavedChanges: state 
//                     });
//                 }
//                 window.addEventListener('message', event => {
//                     const message = event.data;
//                     switch (message.type) {
//                         case 'update':
//                             updateContent(message.content);
//                             break;
//                         case 'saved':
//                             updateSaveState(false);
//                             break;
//                     }
//                 });
//                 function updateContent(data) {
//                     const tbody = document.getElementById('translationRows');
//                     const sourceHeader = document.getElementById('sourceHeader');
//                     const translationHeader = document.getElementById('translationHeader');
//                     tbody.innerHTML = '';
//                     if (!data || !data.transUnits) {
//                         console.error('No translation units found in data');
//                         return;
//                     }
//                     sourceHeader.textContent = \`Source Text (\${data.transUnits.length})\`;
//                     translationHeader.textContent = \`Translation (\${data.transUnits.length})\`;
//                     data.transUnits.forEach((unit, index) => {
//                         const row = document.createElement('tr');
//                         row.innerHTML = \`
//                             <td>
//                                 <div class="translation-item">
//                                     <div class="index-number">#\${index + 1}</div>
//                                     <div class="source-text">\${escapeHtml(unit.source)}</div>
//                                     \${unit.notes?.length > 0 ? \`
//                                         <div class="notes">
//                                             \${unit.notes.map(n => {
//                                                 if (n.from === 'Developer' || n.from === 'Xliff Generator') {
//                                                     return \`<div class="note-item">
//                                                         <span class="note-from">\${escapeHtml(n.from)}:</span> 
//                                                         \${escapeHtml(n.content || '')}
//                                                     </div>\`;
//                                                 }
//                                                 return '';
//                                             }).filter(Boolean).join('')}
//                                         </div>
//                                     \` : ''}
//                                 </div>
//                             </td>
//                             <td>
//                                 <div class="translation-item">
//                                     <div class="index-number">#\${index + 1}</div>
//                                     <textarea 
//                                         data-id="\${escapeHtml(unit.id)}"
//                                         placeholder="Enter translation here..."
//                                     >\${escapeHtml(unit.target || '')}</textarea>
//                                 </div>
//                             </td>
//                         \`.trim();
//                         tbody.appendChild(row);
//                     });
//                     // Add event listeners for textareas
//                     document.querySelectorAll('textarea').forEach(textarea => {
//                         // Initial resize
//                         autoResizeTextarea(textarea);
//                         // Resize on input
//                         textarea.addEventListener('input', e => {
//                             const target = e.target;
//                             autoResizeTextarea(target);
//                             updateSaveState(true);
//                         });
//                         // Resize on keydown (for Enter key)
//                         textarea.addEventListener('keydown', e => {
//                             setTimeout(() => autoResizeTextarea(e.target), 0);
//                         });
//                     });
//                     document.getElementById('saveButton').addEventListener('click', () => {
//                         const changes = [];
//                         document.querySelectorAll('textarea').forEach(textarea => {
//                             // Include all translations, even empty ones
//                             changes.push({
//                                 type: 'update',
//                                 id: textarea.dataset.id,
//                                 value: textarea.value.trim()
//                             });
//                         });
//                         // Send all changes at once
//                         vscode.postMessage({
//                             type: 'update',
//                             changes: changes
//                         });
//                         updateSaveState(false);
//                     });
//                 }
//                 function escapeHtml(unsafe) {
//                     if (!unsafe) return '';
//                     return unsafe
//                         .replace(/&/g, "&amp;")
//                         .replace(/</g, "&lt;")
//                         .replace(/>/g, "&gt;")
//                         .replace(/"/g, "&quot;")
//                         .replace(/'/g, "&#039;");
//                 }
//                 function autoResizeTextarea(textarea) {
//                     textarea.style.height = 'auto';
//                     textarea.style.height = (textarea.scrollHeight) + 'px';
//                 }
//             </script>
//         </body>
//         </html>`;
// }
//# sourceMappingURL=WebviewContent.js.map