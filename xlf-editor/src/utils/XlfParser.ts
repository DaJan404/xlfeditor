import * as xml2js from 'xml2js';
import { TransUnit } from '../extension';

interface XmlTransUnit {
    $: {
        id: string;
    };
    source?: {
        _: string;
    };
    target?: {
        _: string;
    };
    note?: Array<{
        $: {
            from: string;
            priority: string;
        };
        _: string;
    }>;
}

export class XliffParser {
    private parseCache = new Map<string, any>();

    async parseContent(content: string): Promise<any> {
        const cacheKey = content;
        if (this.parseCache.has(cacheKey)) {
            return this.parseCache.get(cacheKey);
        }

        const parser = new xml2js.Parser({
            explicitArray: false,
            mergeAttrs: false,
            explicitCharkey: true,
            charkey: '_',
            attrkey: '$'
        });

        try {
            const result = await parser.parseStringPromise(content);
            const transformed = this.transformXliffData(result);
            this.parseCache.set(cacheKey, transformed);
            return transformed;
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
        return transUnits.map((unit: XmlTransUnit) => this.transformTransUnit(unit));
    }

    private transformTransUnit(unit: XmlTransUnit): TransUnit {
        return {
            id: unit.$.id || '',
            source: unit.source?._|| '',
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