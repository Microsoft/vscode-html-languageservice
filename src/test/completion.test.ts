/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as assert from 'assert';
import * as htmlLanguageService from '../htmlLanguageService';

import { CompletionList, TextDocument, CompletionItemKind, TextEdit } from 'vscode-languageserver-types';
import { applyEdits } from './textEditSupport';

export interface ItemDescription {
	label: string;
	documentation?: string;
	kind?: CompletionItemKind;
	resultText?: string;
	notAvailable?: boolean;
}


suite('HTML Completion', () => {

	function asPromise<T>(result: T): Promise<T> {
		return Promise.resolve(result);
	}

	let assertCompletion = function (completions: CompletionList, expected: ItemDescription, document: TextDocument, offset: number) {
		let matches = completions.items.filter(completion => {
			return completion.label === expected.label;
		});
		if (expected.notAvailable) {
			assert.equal(matches.length, 0, expected.label + " should not existing is results");
			return;
		}

		assert.equal(matches.length, 1, expected.label + " should only existing once: Actual: " + completions.items.map(c => c.label).join(', '));
		let match = matches[0];
		if (expected.documentation) {
			assert.equal(match.documentation, expected.documentation);
		}
		if (expected.kind) {
			assert.equal(match.kind, expected.kind);
		}
		if (expected.resultText && match.textEdit) {
			assert.equal(applyEdits(document, [match.textEdit]), expected.resultText);
		}
	};

	let testCompletionFor = function (value: string, expected: { count?: number, items?: ItemDescription[] }, settings?: htmlLanguageService.CompletionConfiguration): PromiseLike<void> {
		let offset = value.indexOf('|');
		value = value.substr(0, offset) + value.substr(offset + 1);

		let ls = htmlLanguageService.getLanguageService();

		let document = TextDocument.create('test://test/test.html', 'html', 0, value);
		let position = document.positionAt(offset);
		let htmlDoc = ls.parseHTMLDocument(document);
		let list = ls.doComplete(document, position, htmlDoc, settings);
		if (expected.count) {
			assert.equal(list.items, expected.count);
		}
		if (expected.items) {
			for (let item of expected.items) {
				assertCompletion(list, item, document, offset);
			}
		}
		return Promise.resolve();
	};

	let testTagCompletion = function (value: string, expected: string | null): void {
		let offset = value.indexOf('|');
		value = value.substr(0, offset) + value.substr(offset + 1);

		let ls = htmlLanguageService.getLanguageService();

		let document = TextDocument.create('test://test/test.html', 'html', 0, value);
		let position = document.positionAt(offset);
		let htmlDoc = ls.parseHTMLDocument(document);
		let actual = ls.doTagComplete(document, position, htmlDoc);
		assert.equal(actual, expected);
	};

	function run(tests: PromiseLike<void>[], testDone: (err?: any) => void) {
		Promise.all(tests).then(() => {
			testDone();
		}, (error) => {
			testDone(error);
		});
	}


	test('Complete', function (testDone): any {
		run([
			testCompletionFor('<|', {
				items: [
					{ label: 'iframe', resultText: '<iframe' },
					{ label: 'h1', resultText: '<h1' },
					{ label: 'div', resultText: '<div' },
				]
			}),

			testCompletionFor('< |', {
				items: [
					{ label: 'iframe', resultText: '<iframe' },
					{ label: 'h1', resultText: '<h1' },
					{ label: 'div', resultText: '<div' },
				]
			}),

			testCompletionFor('<h|', {
				items: [
					{ label: 'html', resultText: '<html' },
					{ label: 'h1', resultText: '<h1' },
					{ label: 'header', resultText: '<header' },
				]
			}),

			testCompletionFor('<input|', {
				items: [
					{ label: 'input', resultText: '<input' },
				]
			}),
			testCompletionFor('<inp|ut', {
				items: [
					{ label: 'input', resultText: '<input' },
				]
			}),
			testCompletionFor('<|inp', {
				items: [
					{ label: 'input', resultText: '<input' },
				]
			}),
			testCompletionFor('<input |', {
				items: [
					{ label: 'type', resultText: '<input type="$1"' },
					{ label: 'style', resultText: '<input style="$1"' },
					{ label: 'onmousemove', resultText: '<input onmousemove="$1"' },
				]
			}),

			testCompletionFor('<input t|', {
				items: [
					{ label: 'type', resultText: '<input type="$1"' },
					{ label: 'tabindex', resultText: '<input tabindex="$1"' },
				]
			}),

			testCompletionFor('<input t|ype', {
				items: [
					{ label: 'type', resultText: '<input type="$1"' },
					{ label: 'tabindex', resultText: '<input tabindex="$1"' },
				]
			}),

			testCompletionFor('<input t|ype="text"', {
				items: [
					{ label: 'type', resultText: '<input type="text"' },
					{ label: 'tabindex', resultText: '<input tabindex="text"' },
				]
			}),

			testCompletionFor('<input type="text" |', {
				items: [
					{ label: 'style', resultText: '<input type="text" style="$1"' },
					{ label: 'type', resultText: '<input type="text" type="$1"' },
					{ label: 'size', resultText: '<input type="text" size="$1"' },
				]
			}),

			testCompletionFor('<input type="text" s|', {
				items: [
					{ label: 'style', resultText: '<input type="text" style="$1"' },
					{ label: 'src', resultText: '<input type="text" src="$1"' },
					{ label: 'size', resultText: '<input type="text" size="$1"' },
				]
			}),

			testCompletionFor('<input di| type="text"', {
				items: [

					{ label: 'disabled', resultText: '<input disabled type="text"' },
					{ label: 'dir', resultText: '<input dir="$1" type="text"' },
				]
			}),

			testCompletionFor('<input disabled | type="text"', {
				items: [
					{ label: 'dir', resultText: '<input disabled dir="$1" type="text"' },
					{ label: 'style', resultText: '<input disabled style="$1" type="text"' },
				]
			}),

			testCompletionFor('<input type=|', {
				items: [
					{ label: 'text', resultText: '<input type="text"' },
					{ label: 'checkbox', resultText: '<input type="checkbox"' },
				]
			}),
			testCompletionFor('<input type="c|', {
				items: [
					{ label: 'color', resultText: '<input type="color' },
					{ label: 'checkbox', resultText: '<input type="checkbox' },
				]
			}),
			testCompletionFor('<input type="|', {
				items: [
					{ label: 'color', resultText: '<input type="color' },
					{ label: 'checkbox', resultText: '<input type="checkbox' },
				]
			}),
			testCompletionFor('<input type= |', {
				items: [
					{ label: 'color', resultText: '<input type= "color"' },
					{ label: 'checkbox', resultText: '<input type= "checkbox"' },
				]
			}),
			testCompletionFor('<input src="c" type="color|" ', {
				items: [
					{ label: 'color', resultText: '<input src="c" type="color" ' },
				]
			}),
			testCompletionFor('<iframe sandbox="allow-forms |', {
				items: [
					{ label: 'allow-modals', resultText: '<iframe sandbox="allow-forms allow-modals' },
				]
			}),
			testCompletionFor('<iframe sandbox="allow-forms allow-modals|', {
				items: [
					{ label: 'allow-modals', resultText: '<iframe sandbox="allow-forms allow-modals' },
				]
			}),
			testCompletionFor('<iframe sandbox="allow-forms all|"', {
				items: [
					{ label: 'allow-modals', resultText: '<iframe sandbox="allow-forms allow-modals"' },
				]
			}),
			testCompletionFor('<iframe sandbox="allow-forms a|llow-modals "', {
				items: [
					{ label: 'allow-modals', resultText: '<iframe sandbox="allow-forms allow-modals "' },
				]
			}),
			testCompletionFor('<input src="c" type=color| ', {
				items: [
					{ label: 'color', resultText: '<input src="c" type="color" ' },
				]
			}),
			testCompletionFor('<div dir=|></div>', {
				items: [
					{ label: 'ltr', resultText: '<div dir="ltr"></div>' },
					{ label: 'rtl', resultText: '<div dir="rtl"></div>' },
				]
			}),
			testCompletionFor('<ul><|>', {
				items: [
					{ label: '/ul', resultText: '<ul></ul>' },
					{ label: 'li', resultText: '<ul><li>' },
				]
			}),
			testCompletionFor('<ul><li><|', {
				items: [
					{ label: '/li', resultText: '<ul><li></li>' },
					{ label: 'a', resultText: '<ul><li><a' },
				]
			}),
			testCompletionFor('<goo></|>', {
				items: [
					{ label: '/goo', resultText: '<goo></goo>' },
				]
			}),
			testCompletionFor('<foo></f|', {
				items: [
					{ label: '/foo', resultText: '<foo></foo>' },
				]
			}),
			testCompletionFor('<foo></f|o', {
				items: [
					{ label: '/foo', resultText: '<foo></foo>' },
				]
			}),
			testCompletionFor('<foo></|fo', {
				items: [
					{ label: '/foo', resultText: '<foo></foo>' },
				]
			}),
			testCompletionFor('<foo></ |>', {
				items: [
					{ label: '/foo', resultText: '<foo></foo>' },
				]
			}),
			testCompletionFor('<span></ s|', {
				items: [
					{ label: '/span', resultText: '<span></span>' },
				]
			}),
			testCompletionFor('<li><br></ |>', {
				items: [
					{ label: '/li', resultText: '<li><br></li>' },
				]
			}),
			testCompletionFor('<li/|>', {
				count: 0
			}),
			testCompletionFor('  <div/|   ', {
				count: 0
			}),
			testCompletionFor('<foo><br/></ f|>', {
				items: [
					{ label: '/foo', resultText: '<foo><br/></foo>' },
				]
			}),
			testCompletionFor('<li><div/></|', {
				items: [
					{ label: '/li', resultText: '<li><div/></li>' },
				]
			}),
			testCompletionFor('<li><br/|>', { count: 0 }),
			testCompletionFor('<li><br>a/|', { count: 0 }),

			testCompletionFor('<foo><bar></bar></|   ', {
				items: [
					{ label: '/foo', resultText: '<foo><bar></bar></foo>   ' },
				]
			}),
			testCompletionFor('<div>\n  <form>\n    <div>\n      <label></label>\n      <|\n    </div>\n  </form></div>', {
				items: [
					{ label: 'span', resultText: '<div>\n  <form>\n    <div>\n      <label></label>\n      <span\n    </div>\n  </form></div>' },

					{ label: '/div', resultText: '<div>\n  <form>\n    <div>\n      <label></label>\n    </div>\n    </div>\n  </form></div>' },
				]
			}),
			testCompletionFor('<body><div><div></div></div></|  >', {
				items: [
					{ label: '/body', resultText: '<body><div><div></div></div></body  >' },
				]
			}),
			testCompletionFor(['<body>', '  <div>', '    </|'].join('\n'), {
				items: [
					{ label: '/div', resultText: ['<body>', '  <div>', '  </div>'].join('\n') },
				]
			}),
			testCompletionFor('<div><a hre|</div>', {
				items: [
					{ label: 'href', resultText: '<div><a href="$1"</div>' }
				]
			}),
			testCompletionFor('<a><b>foo</b><|f>', {
				items: [
					{ label: '/a', resultText: '<a><b>foo</b></a>' },
					{ notAvailable: true, label: '/f' }
				]
			}),
			testCompletionFor('<a><b>foo</b><| bar.', {
				items: [
					{ label: '/a', resultText: '<a><b>foo</b></a> bar.' },
					{ notAvailable: true, label: '/bar' }
				]
			}),
			testCompletionFor('<div><h1><br><span></span><img></| </h1></div>', {
				items: [
					{ label: '/h1', resultText: '<div><h1><br><span></span><img></h1> </h1></div>' },
				]
			}),
			testCompletionFor('<div>|', {
				items: [
					{ label: '</div>', resultText: '<div>$0</div>' }
				]
			}),
			testCompletionFor('<div>|', {
				items: [
					{ notAvailable: true, label: '</div>' }
				]
			}, { hideAutoCompleteProposals: true }),
			testCompletionFor('<div d|', {
				items: [
					{ label: 'data-', resultText: '<div data-$1="$2"' }
				]
			}),
			testCompletionFor('<div no-data-test="no-data" d|', {
				items: [
					{ notAvailable:true, label: 'no-data-test' }
				]
			}),
			testCompletionFor('<div data-custom="test"><div d|', {
				items: [
					{ label: 'data-', resultText: '<div data-custom="test"><div data-$1="$2"' },
					{ label: 'data-custom', resultText: '<div data-custom="test"><div data-custom="$1"' }
				]
			}),
			testCompletionFor('<div data-custom="test"><div data-custom-two="2"></div></div>\n <div d|', {
				items: [
					{ label: 'data-', resultText: '<div data-custom="test"><div data-custom-two="2"></div></div>\n <div data-$1="$2"' },
					{ label: 'data-custom', resultText: '<div data-custom="test"><div data-custom-two="2"></div></div>\n <div data-custom="$1"' },
					{ label: 'data-custom-two', resultText: '<div data-custom="test"><div data-custom-two="2"></div></div>\n <div data-custom-two="$1"' }	
				]
			})
		], testDone);
	});

	test('Case sensitivity', function (testDone) {
		run([
			testCompletionFor('<LI></|', {
				items: [
					{ label: '/LI', resultText: '<LI></LI>' },
					{ label: '/li', notAvailable: true }
				]
			}),
			testCompletionFor('<lI></|', {
				items: [
					{ label: '/lI', resultText: '<lI></lI>' }
				]
			}),
			testCompletionFor('<iNpUt |', {
				items: [
					{ label: 'type', resultText: '<iNpUt type="$1"' }
				]
			}),
			testCompletionFor('<INPUT TYPE=|', {
				items: [
					{ label: 'color', resultText: '<INPUT TYPE="color"' }
				]
			}),
			testCompletionFor('<dIv>|', {
				items: [
					{ label: '</dIv>', resultText: '<dIv>$0</dIv>' }
				]
			}),
		], testDone);
	});

	test('Handlebar Completion', function (testDone) {
		run([
			testCompletionFor('<script id="entry-template" type="text/x-handlebars-template"> <| </script>', {
				items: [
					{ label: 'div', resultText: '<script id="entry-template" type="text/x-handlebars-template"> <div </script>' },
				]
			})
		], testDone);
	});

	test('Complete aria', function (testDone): any {
		let expectedAriaAttributes = [
			{ label: 'aria-activedescendant' },
			{ label: 'aria-atomic' },
			{ label: 'aria-autocomplete' },
			{ label: 'aria-busy' },
			{ label: 'aria-checked' },
			{ label: 'aria-colcount' },
			{ label: 'aria-colindex' },
			{ label: 'aria-colspan' },
			{ label: 'aria-controls' },
			{ label: 'aria-current' },
			{ label: 'aria-describedat' },
			{ label: 'aria-describedby' },
			{ label: 'aria-disabled' },
			{ label: 'aria-dropeffect' },
			{ label: 'aria-errormessage' },
			{ label: 'aria-expanded' },
			{ label: 'aria-flowto' },
			{ label: 'aria-grabbed' },
			{ label: 'aria-haspopup' },
			{ label: 'aria-hidden' },
			{ label: 'aria-invalid' },
			{ label: 'aria-kbdshortcuts' },
			{ label: 'aria-label' },
			{ label: 'aria-labelledby' },
			{ label: 'aria-level' },
			{ label: 'aria-live' },
			{ label: 'aria-modal' },
			{ label: 'aria-multiline' },
			{ label: 'aria-multiselectable' },
			{ label: 'aria-orientation' },
			{ label: 'aria-owns' },
			{ label: 'aria-placeholder' },
			{ label: 'aria-posinset' },
			{ label: 'aria-pressed' },
			{ label: 'aria-readonly' },
			{ label: 'aria-relevant' },
			{ label: 'aria-required' },
			{ label: 'aria-roledescription' },
			{ label: 'aria-rowcount' },
			{ label: 'aria-rowindex' },
			{ label: 'aria-rowspan' },
			{ label: 'aria-selected' },
			{ label: 'aria-setsize' },
			{ label: 'aria-sort' },
			{ label: 'aria-valuemax' },
			{ label: 'aria-valuemin' },
			{ label: 'aria-valuenow' },
			{ label: 'aria-valuetext' }
		];
		run([
			testCompletionFor('<div  |> </div >', { items: expectedAriaAttributes }),
			testCompletionFor('<span  |> </span >', { items: expectedAriaAttributes }),
			testCompletionFor('<input  |> </input >', { items: expectedAriaAttributes })
		], testDone);
	});

	test('Complete Angular', function (testDone): any {
		run([
			testCompletionFor('<body  |> </body >', {
				items: [
					{ label: 'ng-controller', resultText: '<body  ng-controller="$1"> </body >' },
					{ label: 'data-ng-controller', resultText: '<body  data-ng-controller="$1"> </body >' },
				]
			}),
			testCompletionFor('<li  |> </li >', {
				items: [
					{ label: 'ng-repeat', resultText: '<li  ng-repeat="$1"> </li >' },
					{ label: 'data-ng-repeat', resultText: '<li  data-ng-repeat="$1"> </li >' },
				]
			}),
			testCompletionFor('<input  |> </input >', {
				items: [
					{ label: 'ng-model', resultText: '<input  ng-model="$1"> </input >' },
					{ label: 'data-ng-model', resultText: '<input  data-ng-model="$1"> </input >' },
				]
			})
		], testDone);
	});

	test('Complete Ionic', function (testDone): any {
		run([
			// Try some Ionic tags
			testCompletionFor('<|', {
				items: [
					{ label: 'ion-checkbox', resultText: '<ion-checkbox' },
					{ label: 'ion-content', resultText: '<ion-content' },
				]
			})
		], testDone);
	});

	test('Settings', function (testDone): any {
		run([
			testCompletionFor('<|', {
				items: [
					{ label: 'ion-checkbox' },
					{ label: 'div', notAvailable: true },
				]
			}, { html5: false, ionic: true, angular1: false }),
			testCompletionFor('<|', {
				items: [
					{ label: 'ion-checkbox', notAvailable: true },
					{ label: 'div' },
				]
			}, { html5: true, ionic: false, angular1: false }),
			testCompletionFor('<input  |> </input >', {
				items: [
					{ label: 'ng-model', notAvailable: true },
					{ label: 'type' },
				]
			}, { html5: true, ionic: false, angular1: false }),
		], testDone);
	});

	test('doTagComplete', function (): any {
		testTagCompletion('<div>|', '$0</div>');
		testTagCompletion('<div>|</div>', null);
		testTagCompletion('<div class="">|', "$0</div>");
		testTagCompletion('<img>|', null);
		testTagCompletion('<div><br></|', "div>");
		testTagCompletion('<div><br><span></span></|', "div>");
		testTagCompletion('<div><h1><br><span></span><img></| </h1></div>', "h1>");
	});

	test('Character entities', function (testDone): any {
		run([
			testCompletionFor('<div>&|', {
				items: [
					{ label: '&hookrightarrow;', resultText: '<div>&hookrightarrow;' },
					{ label: '&plus;', resultText: '<div>&plus;' },
				]
			}),
			testCompletionFor('<div>Hello&|', {
				items: [
					{ label: '&ZeroWidthSpace;', resultText: '<div>Hello&ZeroWidthSpace;' }
				]
			}),
			testCompletionFor('<div>Hello&gt|', {
				items: [
					{ label: '&gtrdot;', resultText: '<div>Hello&gtrdot;' }
				]
			}),
			testCompletionFor('<div class="&g|"', {
				items: [
					{ label: '&grave;', resultText: '<div class="&grave;"' }
				]
			}),
			testCompletionFor('<div class=&d|', {
				items: [
					{ label: '&duarr;', resultText: '<div class=&duarr;' }
				]
			}),
			testCompletionFor('<div &d|', {
				items: [
					{ label: '&duarr;', notAvailable: true }
				]
			}),
			testCompletionFor('<div&d|', {
				items: [
					{ label: '&duarr;', notAvailable: true }
				]
			}),
		], testDone);
	});
});
