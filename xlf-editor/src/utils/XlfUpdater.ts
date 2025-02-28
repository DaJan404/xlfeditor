import * as vscode from 'vscode';
import * as xml2js from 'xml2js';

export class XliffUpdater {
    async updateTranslations(document: vscode.TextDocument, changes: Array<{id: string, value: string}>) {
        try {
            const result = await this.parseDocument(document);
            this.applyChanges(result, changes);
            await this.saveChanges(document, result);
        } catch (error) {
            console.error('Error updating translations:', error);
            throw error;
        }
    }

    private async parseDocument(document: vscode.TextDocument) {
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

    private applyChanges(result: any, changes: Array<{id: string, value: string}>) {
        let transUnits = result.xliff.file.body.group['trans-unit'];
        transUnits = Array.isArray(transUnits) ? transUnits : [transUnits];

        for (const change of changes) {
            const unit = transUnits.find((u: any) => u.$.id === change.id);
            if (unit) {
                unit.target = { $: {}, _: change.value };
            }
        }
    }

    private async saveChanges(document: vscode.TextDocument, result: any) {
        const builder = new xml2js.Builder({
            xmldec: { version: '1.0', encoding: 'utf-8' },
            renderOpts: { pretty: true, indent: '  ' },
            cdata: false
        });

        const updatedXml = builder.buildObject(result);
        const edit = new vscode.WorkspaceEdit();
        edit.replace(
            document.uri,
            new vscode.Range(0, 0, document.lineCount, 0),
            updatedXml
        );

        await vscode.workspace.applyEdit(edit);
        await document.save();
    }
}