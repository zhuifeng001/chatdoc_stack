// npm keycode
const aliases: IKeycodeMap = {
	windows: 91,
	'⇧': 16,
	'⌥': 18,
	'⌃': 17,
	'⌘': 91,
	ctl: 17,
	control: 17,
	option: 18,
	pause: 19,
	break: 19,
	caps: 20,
	return: 13,
	escape: 27,
	spc: 32,
	spacebar: 32,
	pgup: 33,
	pgdn: 34,
	ins: 45,
	del: 46,
	cmd: 91,
};

const codes: IKeycodeMap = {
	0: 48,
	1: 49,
	2: 50,
	3: 51,
	4: 52,
	5: 53,
	6: 54,
	7: 55,
	8: 56,
	9: 57,
	backspace: 8,
	tab: 9,
	enter: 13,
	shift: 16,
	ctrl: 17,
	alt: 18,
	'pause/break': 19,
	'caps lock': 20,
	esc: 27,
	space: 32,
	' ': 32,
	'page up': 33,
	'page down': 34,
	end: 35,
	home: 36,
	left: 37,
	up: 38,
	right: 39,
	down: 40,
	insert: 45,
	delete: 46,
	command: 91,
	'left command': 91,
	'right command': 93,
	'numpad *': 106,
	'numpad +': 107,
	'numpad -': 109,
	'numpad .': 110,
	'numpad /': 111,
	'num lock': 144,
	'scroll lock': 145,
	'my computer': 182,
	'my calculator': 183,
	';': 186,
	'=': 187,
	',': 188,
	'-': 189,
	'.': 190,
	'/': 191,
	'`': 192,
	'[': 219,
	'\\': 220,
	']': 221,
	"'": 222,
	a: 65,
	b: 66,
	c: 67,
	d: 68,
	e: 69,
	f: 70,
	g: 71,
	h: 72,
	i: 73,
	j: 74,
	k: 75,
	l: 76,
	m: 77,
	n: 78,
	o: 79,
	p: 80,
	q: 81,
	r: 82,
	s: 83,
	t: 84,
	u: 85,
	v: 86,
	w: 87,
	x: 88,
	y: 89,
	z: 90,
	f1: 112,
	f2: 113,
	f3: 114,
	f4: 115,
	f5: 116,
	f6: 117,
	f7: 118,
	f8: 119,
	f9: 120,
	f10: 121,
	f11: 122,
	f12: 123,
	'numpad 0': 96,
	'numpad 1': 97,
	'numpad 2': 98,
	'numpad 3': 99,
	'numpad 4': 100,
	'numpad 5': 101,
	'numpad 6': 102,
	'numpad 7': 103,
	'numpad 8': 104,
	'numpad 9': 105,
	windows: 91,
	'⇧': 16,
	'⌥': 18,
	'⌃': 17,
	'⌘': 91,
	ctl: 17,
	control: 17,
	option: 18,
	pause: 19,
	break: 19,
	caps: 20,
	return: 13,
	escape: 27,
	spc: 32,
	spacebar: 32,
	pgup: 33,
	pgdn: 34,
	ins: 45,
	del: 46,
	cmd: 91,
};

/* !
 * Programatically add the following
 */

// lower case chars
for (let i = 97; i < 123; i++) codes[String.fromCharCode(i)] = i - 32;

// numbers
for (let i = 48; i < 58; i++) codes[i - 48] = i;

// function keys
for (let i = 1; i < 13; i++) codes['f' + i] = i + 111;

// numpad keys
for (let i = 0; i < 10; i++) codes['numpad ' + i] = i + 96;

// Add aliases
for (const alias in aliases) {
	codes[alias] = aliases[alias];
}

export interface IKeycodeMap {
	[k: string]: number | number[];
}

/**
 * 额外但又通用的 key，可以在这里注册
 *
 * key: KeyboardEvent 中的 key
 * value: keycode
 */
const extraCodes = Object.freeze({
	'+': 187,
	'≠': 187,
	'–': 189,
	ƒ: 70, // f
	Control: 17,
	Meta: [91, 93],
	ArrowLeft: 37,
	ArrowUp: 38,
	ArrowRight: 39,
	ArrowDown: 40,
});

const toLowerCase = (o: IKeycodeMap) => {
	return Object.keys(o).reduce((res, key) => Object.assign(res, { [key.toLocaleLowerCase()]: o[key] }), {});
};

export const useKeycode = () => {
	const keycodeMap: { value: IKeycodeMap } = {
		value: { ...codes, ...aliases, ...toLowerCase(extraCodes as IKeycodeMap) },
	};

	// 自定义 Key name
	const registerKeycode = (keyMapOptions: IKeycodeMap) => {
		keycodeMap.value = { ...keycodeMap.value, ...toLowerCase(keyMapOptions as Record<string, number>) };
	};

	return { keycodeMap, registerKeycode };
};
