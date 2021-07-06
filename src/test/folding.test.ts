/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


import 'mocha';
import * as assert from 'assert';
import { TextDocument } from '../htmlLanguageTypes';
import { getFoldingRanges } from '../services/htmlFolding';

interface ExpectedIndentRange {
	startLine: number;
	endLine: number;
	kind?: string;
}

interface AssertConfig {
	message?: string,
	nRanges?: number,
	compact?: boolean,
}


function assertRanges(lines: string[], expected: ExpectedIndentRange[], config?: AssertConfig): void {
	const { message, nRanges, compact } = config || {};
	const document = TextDocument.create('test://foo/bar.json', 'json', 1, lines.join('\n'));
	const workspace = {
		settings: {},
		folders: [{ name: 'foo', uri: 'test://foo' }]
	};
	const actual = getFoldingRanges(document, { rangeLimit: nRanges, compact: compact });

	let actualRanges = [];
	for (let i = 0; i < actual.length; i++) {
		actualRanges[i] = r(actual[i].startLine, actual[i].endLine, actual[i].kind);
	}
	actualRanges = actualRanges.sort((r1, r2) => r1.startLine - r2.startLine);
	assert.deepEqual(actualRanges, expected, message);
}

function r(startLine: number, endLine: number, kind?: string): ExpectedIndentRange {
	return { startLine, endLine, kind };
}

suite('HTML Folding', () => {
	test('Fold one level', () => {
		const input = [
			/*0*/'<html>',
			/*1*/'Hello',
			/*2*/'</html>'
		];
		assertRanges(input, [r(0, 1)]);
	});

	test('Fold two level', () => {
		const input = [
			/*0*/'<html>',
			/*1*/'<head>',
			/*2*/'Hello',
			/*3*/'</head>',
			/*4*/'</html>'
		];
		assertRanges(input, [r(0, 3), r(1, 2)]);
		assertRanges(input, [r(0, 4), r(1, 3)], { compact: true });
	});

	test('Fold siblings', () => {
		const input = [
			/*0*/'<html>',
			/*1*/'<head>',
			/*2*/'Head',
			/*3*/'</head>',
			/*4*/'<body class="f">',
			/*5*/'Body',
			/*6*/'</body>',
			/*7*/'</html>'
		];
		assertRanges(input, [r(0, 6), r(1, 2), r(4, 5)]);
		assertRanges(input, [r(0, 7), r(1, 3), r(4, 6)], { compact: true });
	});

	test('Fold self-closing tags', () => {
		const input = [
			/*0*/'<div>',
			/*1*/'<a href="top"/>',
			/*2*/'<img src="s">',
			/*3*/'<br/>',
			/*4*/'<br>',
			/*5*/'<img class="c"',
			/*6*/'     src="top"',
			/*7*/'>',
			/*8*/'</div>'
		];
		assertRanges(input, [r(0, 7), r(5, 6)]);
		assertRanges(input, [r(0, 8), r(5, 7)], { compact: true });
	});

	test('Fold comment', () => {
		const input = [
			/*0*/'<!--',
			/*1*/' multi line',
			/*2*/'-->',
			/*3*/'<!-- some stuff',
			/*4*/' some more stuff -->',
		];
		assertRanges(input, [r(0, 2, 'comment'), r(3, 4, 'comment')]);
		assertRanges(input, [r(0, 2, 'comment'), r(3, 4, 'comment')], { compact: true });
	});

	test('Fold regions', () => {
		const input = [
			/*0*/'<!-- #region -->',
			/*1*/'<!-- #region -->',
			/*2*/'<!-- #endregion -->',
			/*3*/'<!-- #endregion -->',
		];
		assertRanges(input, [r(0, 3, 'region'), r(1, 2, 'region')]);
		assertRanges(input, [r(0, 3, 'region'), r(1, 2, 'region')], { compact: true });
	});



	test('Fold incomplete', () => {
		const input = [
			/*0*/'<body>',
			/*1*/'<div></div>',
			/*2*/'Hello',
			/*3*/'</div>',
			/*4*/'</body>',
		];
		assertRanges(input, [r(0, 3)]);
		assertRanges(input, [r(0, 4)], { compact: true });
	});

	test('Fold incomplete 2', () => {
		const input = [
			/*0*/'<be><div>',
			/*1*/'<!-- #endregion -->',
			/*2*/'</div>',
		];
		assertRanges(input, [r(0, 1)]);
		assertRanges(input, [r(0, 2)], { compact: true });
	});

	test('Fold intersecting region', () => {
		const input = [
			/*0*/'<body>',
			/*1*/'<!-- #region -->',
			/*2*/'Hello',
			/*3*/'<div></div>',
			/*4*/'</body>',
			/*5*/'<!-- #endregion -->',
		];
		assertRanges(input, [r(0, 3)]);
		assertRanges(input, [r(0, 4)], { compact: true });
	});

	test('Fold intersecting region 2', () => {
		const input = [
			/*0*/'<!-- #region -->',
			/*1*/'<body>',
			/*2*/'Hello',
			/*3*/'<!-- #endregion -->',
			/*4*/'<div></div>',
			/*5*/'</body>',
		];
		assertRanges(input, [r(0, 3, 'region')]);
		assertRanges(input, [r(0, 3, 'region')], { compact: true });
	});

	test('Test limit', () => {
		const input = [
			/* 0*/'<div>',
			/* 1*/' <span>',
			/* 2*/'  <b>',
			/* 3*/'  ',
			/* 4*/'  </b>,',
			/* 5*/'  <b>',
			/* 6*/'   <pre>',
			/* 7*/'  ',
			/* 8*/'   </pre>,',
			/* 9*/'   <pre>',
			/*10*/'  ',
			/*11*/'   </pre>,',
			/*12*/'  </b>,',
			/*13*/'  <b>',
			/*14*/'  ',
			/*15*/'  </b>,',
			/*16*/'  <b>',
			/*17*/'  ',
			/*18*/'  </b>',
			/*19*/' </span>',
			/*20*/'</div>',
		];
		// function _assertRanges(expected: ExpectedIndentRange[], config: AssertConfig) {
		// 	assertRanges(input, expected, { ...config });
		// 	const expectedCompact = expected.map(e => r(e.startLine, e.endLine));
		// 	assertRanges(input, expectedCompact, { ...config, compact: true });
		// }
		assertRanges(
			input,
			[r(0, 19), r(1, 18), r(2, 3), r(5, 11), r(6, 7), r(9, 10), r(13, 14), r(16, 17)],
			{ message: 'no limit', nRanges: void 0 }
		);
		assertRanges(
			input,
			[r(0, 20), r(1, 19), r(2, 4), r(5, 12), r(6, 8), r(9, 11), r(13, 15), r(16, 18)],
			{ message: 'no limit', nRanges: void 0, compact: true }
		);
		assertRanges(
			input,
			[r(0, 19), r(1, 18), r(2, 3), r(5, 11), r(6, 7), r(9, 10), r(13, 14), r(16, 17)],
			{ message: 'limit 8', nRanges: 8 }
		);
		assertRanges(input,
			[r(0, 19), r(1, 18), r(2, 3), r(5, 11), r(6, 7), r(13, 14), r(16, 17)],
			{ message: 'limit 7', nRanges: 7 }
		);
		assertRanges(
			input,
			[r(0, 19), r(1, 18), r(2, 3), r(5, 11), r(13, 14), r(16, 17)],
			{ message: 'limit 6', nRanges: 6 }
		);
		assertRanges(
			input,
			[r(0, 19), r(1, 18), r(2, 3), r(5, 11), r(13, 14)],
			{ message: 'limit 5', nRanges: 5 }
		);
		assertRanges(
			input,
			[r(0, 19), r(1, 18), r(2, 3), r(5, 11)],
			{ message: 'limit 4', nRanges: 4 }
		);
		assertRanges(
			input,
			[r(0, 19), r(1, 18), r(2, 3)],
			{ message: 'limit 3', nRanges: 3 }
		);
		assertRanges(
			input,
			[r(0, 19), r(1, 18)],
			{ message: 'limit 2', nRanges: 2 }
		);
		assertRanges(
			input,
			[r(0, 19)],
			{ message: 'limit 1', nRanges: 1 }
		);
	});

});
