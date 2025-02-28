import * as vscode from 'vscode';
import { XlfEditorProvider } from './providers/XlfEditorProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('XLF Editor extension is now active!');

    // Register custom editor provider
    context.subscriptions.push(XlfEditorProvider.register(context));

    let openXlfCommand = vscode.commands.registerCommand('xlf-editor.openXlf', async () => {
        const fileUri = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: {
                'XLF files': ['xlf']
            }
        });

        if (fileUri && fileUri[0]) {
            // Open the file in our custom editor
            await vscode.commands.executeCommand('vscode.openWith', fileUri[0], 'xlf-editor.translator');
        }
    });

    context.subscriptions.push(openXlfCommand);
}

export function deactivate() {}