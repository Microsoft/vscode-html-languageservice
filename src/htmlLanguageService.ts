/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createScanner } from './parser/htmlScanner';
import { parse } from './parser/htmlParser';
import { HTMLCompletion } from './services/htmlCompletion';
import { HTMLHover } from './services/htmlHover';
import { format } from './services/htmlFormatter';
import { findDocumentLinks } from './services/htmlLinks';
import { findDocumentHighlights } from './services/htmlHighlighting';
import { findDocumentSymbols } from './services/htmlSymbolsProvider';
import { doRename } from './services/htmlRename';
import { findMatchingTagPosition } from './services/htmlMatchingTagPosition';
import { findLinkedEditingRanges } from './services/htmlLinkedEditing';
import {
	Scanner, HTMLDocument, CompletionConfiguration, ICompletionParticipant, HTMLFormatConfiguration, DocumentContext,
	IHTMLDataProvider, HTMLDataV1, LanguageServiceOptions, TextDocument, SelectionRange, WorkspaceEdit,
	Position, CompletionList, Hover, Range, SymbolInformation, TextEdit, DocumentHighlight, DocumentLink, FoldingRange, HoverSettings
} from './htmlLanguageTypes';
import { getFoldingRanges } from './services/htmlFolding';
import { getSelectionRanges } from './services/htmlSelectionRange';
import { HTMLDataProvider } from './languageFacts/dataProvider';
import { HTMLDataManager } from './languageFacts/dataManager';
import { htmlData } from './languageFacts/data/webCustomData';

export * from './htmlLanguageTypes';

export interface LanguageService {
	setDataProviders(useDefaultDataProvider: boolean, customDataProviders: IHTMLDataProvider[]): void;
	createScanner(input: string, initialOffset?: number): Scanner;
	parseHTMLDocument(document: TextDocument): HTMLDocument;
	findDocumentHighlights(document: TextDocument, position: Position, htmlDocument: HTMLDocument): DocumentHighlight[];
	doComplete(document: TextDocument, position: Position, htmlDocument: HTMLDocument, options?: CompletionConfiguration): CompletionList;
	doComplete2(document: TextDocument, position: Position, htmlDocument: HTMLDocument, documentContext: DocumentContext, options?: CompletionConfiguration): Promise<CompletionList>;
	setCompletionParticipants(registeredCompletionParticipants: ICompletionParticipant[]): void;
	doHover(document: TextDocument, position: Position, htmlDocument: HTMLDocument, options?: HoverSettings): Hover | null;
	format(document: TextDocument, range: Range | undefined, options: HTMLFormatConfiguration): TextEdit[];
	findDocumentLinks(document: TextDocument, documentContext: DocumentContext): DocumentLink[];
	findDocumentSymbols(document: TextDocument, htmlDocument: HTMLDocument): SymbolInformation[];
	doTagComplete(document: TextDocument, position: Position, htmlDocument: HTMLDocument): string | null;
	getFoldingRanges(document: TextDocument, context?: { rangeLimit?: number, compact?: boolean }): FoldingRange[];
	getSelectionRanges(document: TextDocument, positions: Position[]): SelectionRange[];
	doRename(document: TextDocument, position: Position, newName: string, htmlDocument: HTMLDocument): WorkspaceEdit | null;
	findMatchingTagPosition(document: TextDocument, position: Position, htmlDocument: HTMLDocument): Position | null;
	/** Deprecated, Use findLinkedEditingRanges instead */
	findOnTypeRenameRanges(document: TextDocument, position: Position, htmlDocument: HTMLDocument): Range[] | null;
	findLinkedEditingRanges(document: TextDocument, position: Position, htmlDocument: HTMLDocument): Range[] | null;
}

const defaultLanguageServiceOptions = {};

export function getLanguageService(options: LanguageServiceOptions = defaultLanguageServiceOptions): LanguageService {
	const dataManager = new HTMLDataManager(options);

	const htmlHover = new HTMLHover(options, dataManager);
	const htmlCompletion = new HTMLCompletion(options, dataManager);

	return {
		setDataProviders: dataManager.setDataProviders.bind(dataManager),
		createScanner,
		parseHTMLDocument: document => parse(document.getText()),
		doComplete: htmlCompletion.doComplete.bind(htmlCompletion),
		doComplete2: htmlCompletion.doComplete2.bind(htmlCompletion),
		setCompletionParticipants: htmlCompletion.setCompletionParticipants.bind(htmlCompletion),
		doHover: htmlHover.doHover.bind(htmlHover),
		format,
		findDocumentHighlights,
		findDocumentLinks,
		findDocumentSymbols,
		getFoldingRanges,
		getSelectionRanges,
		doTagComplete: htmlCompletion.doTagComplete.bind(htmlCompletion),
		doRename,
		findMatchingTagPosition,
		findOnTypeRenameRanges: findLinkedEditingRanges,
		findLinkedEditingRanges
	};
}

export function newHTMLDataProvider(id: string, customData: HTMLDataV1): IHTMLDataProvider {
	return new HTMLDataProvider(id, customData);
}

export function getDefaultHTMLDataProvider(): IHTMLDataProvider {
	return newHTMLDataProvider('default', htmlData);
}

