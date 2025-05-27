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
                .translation-container {
                    position: relative;
                    width: 100%;
                }
                .match-dropdown-btn {
                    position: absolute;
                    right: 8px;
                    top: 8px;
                    background: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                    border: none;
                    border-radius: 3px;
                    padding: 4px 8px;
                    cursor: pointer;
                    font-size: 12px;
                }
                .match-dropdown {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: var(--vscode-dropdown-background);
                    border: 1px solid var(--vscode-dropdown-border);
                    border-radius: 3px;
                    z-index: 10;
                    max-height: 200px;
                    overflow-y: auto;
                }
                .match-item {
                    padding: 8px;
                    cursor: pointer;
                    border-bottom: 1px solid var(--vscode-dropdown-border);
                }
                .match-item:hover {
                    background: var(--vscode-list-hoverBackground);
                }
                .match-header {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    margin-bottom: 4px;
                }
                .nav-group {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    margin-right: 16px;
                }
                .nav-button {
                    padding: 4px 8px;
                    background-color: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                    border: none;
                    border-radius: 2px;
                    cursor: pointer;
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                }
                .nav-button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .match-counter {
                    color: var(--vscode-descriptionForeground);
                    font-size: 12px;
                    min-width: 40px;
                    text-align: center;
                }
                tr.has-matches {
                    background-color: var(--vscode-editor-findMatchHighlightBackground);
                }
                tr.selected-match {
                    background-color: var(--vscode-editor-findMatchBackground);
                }
            </style>
        </head>
        <body>
            <div class="header-actions">
                <div class="nav-group">
                    <button id="prevMatchButton" class="nav-button" title="Previous Match (Alt+Up)" disabled>▲</button>
                    <span id="matchCounter" class="match-counter">0/0</span>
                    <button id="nextMatchButton" class="nav-button" title="Next Match (Alt+Down)" disabled>▼</button>
                </div>
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
                const state = vscode.getState() || { scrollPosition: 0 };

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

                document.addEventListener('scroll', () => {
                    state.scrollPosition = window.scrollY;
                    vscode.setState(state);
                });

                let currentMatchIndex = -1;
                const matchedRows = [];

                function updateNavigationButtons() {
                    const prevBtn = document.getElementById('prevMatchButton');
                    const nextBtn = document.getElementById('nextMatchButton');
                    const counter = document.getElementById('matchCounter');
                    
                    prevBtn.disabled = matchedRows.length === 0 || currentMatchIndex <= 0;
                    nextBtn.disabled = matchedRows.length === 0 || currentMatchIndex >= matchedRows.length - 1;
                    
                    counter.textContent = matchedRows.length > 0 
                        ? \`\${currentMatchIndex + 1}/\${matchedRows.length}\`
                        : '0/0';

                    document.querySelectorAll('tr.selected-match').forEach(row => 
                        row.classList.remove('selected-match')
                    );
                    
                    if (currentMatchIndex >= 0 && currentMatchIndex < matchedRows.length) {
                        matchedRows[currentMatchIndex].classList.add('selected-match');
                        matchedRows[currentMatchIndex].scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'center' 
                        });
                    }
                }

                function navigateToMatch(index) {
                    if (index >= 0 && index < matchedRows.length) {
                        currentMatchIndex = index;
                        updateNavigationButtons();
                    }
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
                        const row = document.createElement('tr');
                        const hasMultipleMatches = unit.possibleMatches?.length > 1;
                        
                        row.innerHTML = \`
                            <td>
                                <div class="translation-item">
                                    <div class="source-text">\${escapeHtml(unit.source)}\${unit.matchPercent ? \` (\${unit.matchPercent}%)\` : ''}</div>
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
                                    <div class="translation-container">
                                        <textarea 
                                            data-id="\${escapeHtml(unit.id)}"
                                            placeholder="Enter translation here..."
                                        >\${escapeHtml(unit.target || '')}</textarea>
                                        \${hasMultipleMatches ? \`
                                            <button class="match-dropdown-btn" title="Show translation matches">
                                                \${unit.possibleMatches.length} matches ▼
                                            </button>
                                            <div class="match-dropdown hidden">
                                                \${unit.possibleMatches.map(match => \`
                                                    <div class="match-item" data-target="\${escapeHtml(match.target)}">
                                                        <div class="match-header">
                                                            \${match.matchPercent}% Match from \${match.origin}
                                                        </div>
                                                        <div class="match-content">\${escapeHtml(match.target)}</div>
                                                    </div>
                                                \`).join('')}
                                            </div>
                                        \` : ''}
                                    </div>
                                </div>
                            </td>
                        \`.trim();
                        
                        if (unit.possibleMatches?.length > 1) {
                            row.classList.add('has-matches');
                            matchedRows.push(row);
                        }
                        
                        tbody.appendChild(row);
                    });

                    // Initialize navigation after creating rows
                    matchedRows.length > 0 ? navigateToMatch(0) : updateNavigationButtons();

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

                    // Restore scroll position
                    const savedState = vscode.getState();
                    if (savedState && savedState.scrollPosition) {
                        window.scrollTo(0, savedState.scrollPosition);
                    }

                    // Add dropdown event handlers
                    document.querySelectorAll('.match-dropdown-btn').forEach(btn => {
                        btn.addEventListener('click', e => {
                            const container = e.target.closest('.translation-container');
                            const dropdown = container.querySelector('.match-dropdown');
                            dropdown.classList.toggle('hidden');
                        });
                    });

                    document.querySelectorAll('.match-item').forEach(item => {
                        item.addEventListener('click', e => {
                            const container = e.target.closest('.translation-container');
                            const textarea = container.querySelector('textarea');
                            const dropdown = container.querySelector('.match-dropdown');
                            textarea.value = e.currentTarget.dataset.target;
                            autoResizeTextarea(textarea);
                            updateSaveState(true);
                            dropdown.classList.add('hidden');
                        });
                    });
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

                document.getElementById('prevMatchButton').addEventListener('click', () => {
                    navigateToMatch(currentMatchIndex - 1);
                });

                document.getElementById('nextMatchButton').addEventListener('click', () => {
                    navigateToMatch(currentMatchIndex + 1);
                });

                document.addEventListener('keydown', e => {
                    if (e.altKey) {
                        if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            navigateToMatch(currentMatchIndex - 1);
                        } else if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            navigateToMatch(currentMatchIndex + 1);
                        }
                    }
                });

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

                    // Reset navigation for filtered rows
                    matchedRows.length = 0;
                    rows.forEach(row => {
                        if (!row.classList.contains('hidden') && row.classList.contains('has-matches')) {
                            matchedRows.push(row);
                        }
                    });
                    
                    currentMatchIndex = matchedRows.length > 0 ? 0 : -1;
                    updateNavigationButtons();

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