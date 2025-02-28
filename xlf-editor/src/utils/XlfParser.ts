import * as xml2js from 'xml2js';

export class XliffParser {
    async parseContent(content: string): Promise<any> {
        const parser = new xml2js.Parser({
            explicitArray: false,
            mergeAttrs: false,
            explicitCharkey: true,
            charkey: '_',
            attrkey: '$'
        });

        try {
            const result = await parser.parseStringPromise(content);
            return this.transformXliffData(result);
        } catch (error) {
            console.error('XML parsing error:', error);
            throw error;
        }
    }

    private transformXliffData(result: any) {
        if (!result.xliff?.file?.body?.group) {
            throw new Error('Invalid XLIFF structure');
        }

        const file = result.xliff.file;
        const transUnits = this.getTransUnits(file.body.group['trans-unit']);

        return {
            sourceLanguage: file.$['source-language'] || '',
            targetLanguage: file.$['target-language'] || '',
            transUnits: transUnits
        };
    }

    private getTransUnits(units: any) {
        const transUnits = Array.isArray(units) ? units : [units];
        return transUnits.map(this.transformTransUnit);
    }

    private transformTransUnit(unit: any) {
        return {
            id: unit.$.id || '',
            source: unit.source?._ || '',
            target: unit.target?._ || '',
            notes: XliffParser.transformNotes(unit.note)
        };
    }

    private static transformNotes(notes: any) {
        if (!notes) return [];
        const noteArray = Array.isArray(notes) ? notes : [notes];
        return noteArray.map((note: any) => ({
            from: note.$.from || '',
            priority: note.$.priority || '',
            content: note._ || ''
        }));
    }
}