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
                    position: sticky;
                    top: 0;
                    right: 20px;
                    padding: 10px;
                    text-align: right;
                    background-color: var(--vscode-editor-background);
                    z-index: 4;
                }
                .save-button {
                    padding: 6px 16px;
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    border-radius: 2px;
                    cursor: pointer;
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    font-weight: 500;
                }
                .save-button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                .save-button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .filter-bar {
                    position: sticky;
                    top: 40px;  // Move down to accommodate the save button
                    background-color: var(--vscode-editor-background);
                    padding: 10px;
                    z-index: 3;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }
                .filter-group {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }
                .filter-input {
                    flex: 1;
                    padding: 4px 8px;
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 2px;
                }
                .filter-select {
                    padding: 4px 8px;
                    background-color: var(--vscode-dropdown-background);
                    color: var(--vscode-dropdown-foreground);
                    border: 1px solid var(--vscode-dropdown-border);
                    border-radius: 2px;
                }
                .filter-count {
                    color: var(--vscode-descriptionForeground);
                    font-size: 12px;
                }
                .hidden {
                    display: none !important;
                }
            </style>
        </head>
        <body>
            <div class="header-actions">
                <button id="clearButton" class="save-button">Clear All</button>
                <button id="pretranslateButton" class="save-button">Pre-translate</button>
                <button id="saveButton" class="save-button" disabled>Save Changes</button>
            </div>
            <div class="filter-bar">
                <div class="filter-group">
                    <input type="text" id="searchInput" class="filter-input" placeholder="Search in source or translation...">
                    <select id="filterType" class="filter-select">
                        <option value="all">All</option>
                        <option value="untranslated">Untranslated Only</option>
                        <option value="translated">Translated Only</option>
                    </select>
                    <span id="filterCount" class="filter-count"></span>
                </div>
            </div>
            <div class="content">
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
            </div>
            <script>
                console.log('Webview script loaded');

                const vscode = acquireVsCodeApi();
                let hasUnsavedChanges = false;
                let currentData = null;

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
                    console.log('Webview received message:', message);
                    switch (message.type) {
                        case 'update':
                            updateContent(message.content);
                            break;
                        case 'saved':
                            updateSaveState(false);
                            break;
                    }
                });

                const pretranslateBtn = document.getElementById('pretranslateButton');
                if (!pretranslateBtn.hasListener) {
                    pretranslateBtn.hasListener = true;
                    pretranslateBtn.addEventListener('click', () => {
                        vscode.postMessage({ type: 'pretranslate' });
                    });
                }

                function updateContent(data) {
                    currentData = data;  // Store the current data
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
                        const percent = unit.matchPercent !== undefined ? \` (\${unit.matchPercent}%)\` : '';
                        const row = document.createElement('tr');
                        row.innerHTML = \`
                            <td>
                                <div class="translation-item">
                                    <div class="source-text">\${escapeHtml(unit.source)}\${percent}</div>
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

                    document.getElementById('searchInput').addEventListener('input', filterTranslations);
                    document.getElementById('filterType').addEventListener('change', filterTranslations);

                    filterTranslations();  // Apply initial filtering
                }

                if (!document.getElementById('saveButton').hasListener) {
                    document.getElementById('saveButton').hasListener = true;
                    document.getElementById('saveButton').addEventListener('click', () => {
                        const changes = [];
                        document.querySelectorAll('#translationRows tr:not(.hidden) textarea').forEach(textarea => {
                            changes.push({
                                id: textarea.dataset.id,
                                value: textarea.value.trim()
                            });
                        });

                        vscode.postMessage({
                            type: 'update',
                            changes: changes
                        });

                        updateSaveState(false);
                    });
                }

                const clearBtn = document.getElementById('clearButton');
                if (!clearBtn.hasListener) {
                    clearBtn.hasListener = true;
                    clearBtn.addEventListener('click', async () => {
                        const confirmed = await vscode.postMessage({ 
                            type: 'confirm-clear',
                            message: 'Are you sure you want to clear all translations?' 
                        });
                        // The actual clearing will happen after confirmation
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

                function filterTranslations() {
                    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
                    const filterType = document.getElementById('filterType').value;
                    const rows = document.querySelectorAll('#translationRows tr');
                    let visibleCount = 0;

                    rows.forEach(row => {
                        const sourceText = row.querySelector('.source-text').textContent.toLowerCase();
                        const translationText = row.querySelector('textarea').value.toLowerCase();
                        const isTranslated = translationText.trim().length > 0;

                        let show = true;

                        // Filter by search term
                        if (searchTerm) {
                            show = sourceText.includes(searchTerm) || 
                                translationText.includes(searchTerm);
                        }

                        // Filter by translation status
                        if (show && filterType !== 'all') {
                            if (filterType === 'untranslated' && isTranslated) {
                                show = false;
                            } else if (filterType === 'translated' && !isTranslated) {
                                show = false;
                            }
                        }

                        row.classList.toggle('hidden', !show);
                        if (show) {
                            visibleCount++;
                        }
                    });

                    // Update counter
                    const total = rows.length;
                    document.getElementById('filterCount').textContent = 
                        \`Showing \${visibleCount} of \${total} items\`;
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
//# sourceMappingURL=WebviewContent.js.map