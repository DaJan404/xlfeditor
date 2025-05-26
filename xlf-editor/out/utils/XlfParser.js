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
exports.XliffParser = void 0;
const xml2js = __importStar(require("xml2js"));
class XliffParser {
    parseCache = new Map();
    async parseContent(content) {
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
        }
        catch (error) {
            console.error('XML parsing error:', error);
            throw error;
        }
    }
    transformXliffData(result) {
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
    getTransUnits(units) {
        const transUnits = Array.isArray(units) ? units : [units];
        return transUnits.map(this.transformTransUnit);
    }
    transformTransUnit(unit) {
        return {
            id: unit.$.id || '',
            source: unit.source?._ || '',
            target: unit.target?._ || '',
            notes: XliffParser.transformNotes(unit.note)
        };
    }
    static transformNotes(notes) {
        if (!notes)
            return [];
        const noteArray = Array.isArray(notes) ? notes : [notes];
        return noteArray.map((note) => ({
            from: note.$.from || '',
            priority: note.$.priority || '',
            content: note._ || ''
        }));
    }
}
exports.XliffParser = XliffParser;
//# sourceMappingURL=XlfParser.js.map