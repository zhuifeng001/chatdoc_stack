import { useKeycode } from './useKeycode';

interface RegisterOptions {
	name?: string;
	el?: Element | string;
	event: string | string[];
	shortcut?: string;
	callback: <E extends Event>(e: E) => void;
	/**
	 * 如果存在非组合键的按键，会自动添加 keydown 事件，当这些按键被按下，会触发该事件
	 * @returns
	 */
	keydown?: <E extends Event>(e: E) => void;
	/**
	 * 如果存在非组合键的按键，会自动添加 keyup 事件，当这些按键被按下，会触发该事件
	 */
	keyup?: <E extends Event>(e: E) => void;
}

type RegisterShortcutsOptions = RegisterOptions | RegisterOptions[];

type Func<T = any> = (...args: any[]) => T;

export const enum ComposeKeycodeEnums {
	ALT = 'alt',
	SHIFT = 'shift',
	CTRL = 'ctrl',
	Meta = 'command',
}

export const ComposeKeycodeMap = new Map([
	[91, 'Meta, windows, cmd, ⌘'],
	[16, 'shift, ⇧'],
	[17, 'ctrl, control, ctl, ⌃'],
	[18, 'alt, option, ⌥'],
]);

export const isComposeKey = (keycode: number) => !!ComposeKeycodeMap.get(keycode);

export const hasCtrl = (e: KeyboardEvent) => e.ctrlKey;
export const hasAlt = (e: KeyboardEvent) => e.altKey;
export const hasShift = (e: KeyboardEvent) => e.shiftKey;
export const hasMeta = (e: KeyboardEvent) => e.metaKey;
export const hasKey = (e: KeyboardEvent) => !!(e.key || e.keyCode);

const getDom = (el: Element | string): Element | null => (typeof el === 'string' ? document.querySelector(el) : el);

/**
 使用案例

const { registerEvent, registerKeycode } = useShortcut()

registerKeycode({
  '↑↓←→': [37, 38, 39, 40],
  上: 38,
  '↓': 40,
})

registerEvent({
  event: 'click',
  shortcut: 'Shift + 单击',
  callback: e => {
    console.log('Shift + 单击', e)
  },
})

registerEvent({
  el: 'body',
  event: ['wheel', 'mousewheel', 'DOMMouseScroll'],
  shortcut: 'Shift + 鼠标滚轮',
  callback: e => {
    console.log('Shift + 鼠标滚轮', e)
  },
})

*/
export const useShortcut = () => {
	const shortcutEventMap = new Map<Element, Array<{ event: string; callback: Func }>>();
	const shortcutCallbackMap = new Map<Func, Func>();
	const disabled = { value: false };

	const { keycodeMap, registerKeycode } = useKeycode();

	const withKey = (eventName: string) => {
		const keyEventArray = ['keydown', 'keyup', 'keypress'];
		return keyEventArray.includes(eventName);
	};

	const getAllKeys = (e: KeyboardEvent): number[] => {
		return [...getComposeKeys(e), ...getOnlyKeys(e)];
	};

	const getComposeKeys = (e: KeyboardEvent): number[] => {
		const res = [
			hasCtrl(e) ? [keycodeMap.value.ctrl] : null,
			hasAlt(e) ? [keycodeMap.value.alt] : null,
			hasShift(e) ? [keycodeMap.value.shift] : null,
			hasMeta(e) ? [keycodeMap.value.meta] : null,
		];
		return [...new Set(res.flat(2).filter(Boolean) as number[])];
	};

	const getOnlyKeys = (e: KeyboardEvent): number[] => {
		const res = [
			//
			hasKey(e) ? [keycodeMap.value[e.key.toLocaleLowerCase()]] : null,
		];
		return [...new Set(res.flat(2).filter(Boolean) as number[])];
	};

	/**
	 * 'Ctrl + Alt + V' ==>   ['Ctrl', 'Alt', 'V']  ==> [17, 18, 86]  ==> [{ ctrl: 17 }, { alt: 18}, { v: 86}]
	 * 'Ctrl + +'       ==>   ['Ctrl', '+']         ==> [17, 187]     ==> [{ ctrl: 17 }, { '+': 187}]
	 * @param options
	 * @returns
	 */
	const parseShortcutStr = (options: RegisterOptions): Map<string, number | number[]> => {
		const shortcutStr = options.shortcut;
		// 兼容低版本浏览器 (shortcutStr || '').match(/((?<=(\s)*\+(\s)*)\+)|([^+\s]*)/g)
		const keys = (shortcutStr || '').split(' + ')?.filter(Boolean) || [];
		const keyFlag = withKey(options.event as string);

		const res: Array<[string, number | number[]]> = keys.map((key, i) => {
			key = key.toLocaleLowerCase();
			const keycode = keycodeMap.value[key];
			// 如果不是keydown，keypress, keyup事件，最后一个就忽略
			if (!keycode && (keyFlag || i !== keys.length - 1)) {
				console.error(
					`友情提示：'${shortcutStr}' 中 '${key}' 不存在keyCode编号，需要先调用注册方法 registerKeyMap，例如：{ '${key}': [对应键的keyCode] }。
          keyCode 参考链接 =>>> https://developer.mozilla.org/zh-CN/docs/Web/API/KeyboardEvent/keyCode#%E9%94%AE%E7%A0%81%E5%80%BC`
				);
			}
			return [key, keycode];
		});
		return new Map(res);
	};

	const matchedShortcut = (declareKeyMap: Map<string, number | number[]>, allKeys: number[], options: RegisterOptions): boolean => {
		const keys = [...declareKeyMap.keys()];
		const keyFlag = withKey(options.event as string);
		return keys.every((key, i) => {
			if (!keyFlag && i === keys.length - 1) return true; // 如果不是keydown，keypress, keyup事件，最后一个就忽略
			const keycode = declareKeyMap.get(key);
			if (!keycode) return false;
			if (Array.isArray(keycode)) {
				return allKeys.some(o => keycode.includes(o));
			} else {
				return allKeys.includes(keycode);
			}
		});
	};

	const genTriggerHandler = (options: RegisterOptions, declareKeyMap: Map<string, number | number[]>, keycodeMap?: Map<number, boolean>) => {
		return function (e: KeyboardEvent) {
			// 没有快捷键
			if (!options.shortcut) {
				options.callback(e);
				return;
			}
			// 快捷键没有组合键以外的建
			const allKeys = getAllKeys(e);
			if (!keycodeMap?.size && matchedShortcut(declareKeyMap, allKeys, options)) {
				options.callback(e);
				return;
			}

			// 存在快捷键有组合键以外的键
			if (!keycodeMap?.size) return;
			if (e instanceof KeyboardEvent) {
				const onlyKeys = getOnlyKeys(e);
				if (e.type === 'keydown') {
					let allKeydown = false;
					for (const [keycode, flag] of keycodeMap) {
						allKeydown = flag;
						if (onlyKeys.some(o => o === keycode)) {
							keycodeMap.set(keycode, true);
							allKeydown = true;
						}
					}
					allKeydown && options.keydown?.(e);
				} else if (e.type === 'keyup') {
					let allKeyup = false;
					for (const [keycode, flag] of keycodeMap) {
						allKeyup = flag;
						if (onlyKeys.some(o => o === keycode)) {
							keycodeMap.set(keycode, false);
							allKeyup = false;
						}
					}
					!allKeyup && options.keyup?.(e);
				}
			} else {
				const onlyKeys = [...keycodeMap.keys()];
				// 没有按键盘建，或者快捷键不匹配
				if ([...keycodeMap.values()].filter(Boolean)?.length && matchedShortcut(declareKeyMap, onlyKeys, options)) {
					options.callback(e);
					return;
				}
			}
		};
	};

	/**
	 * 注册快捷键
	 *
	 * 缺点：暂不区分 1 和 numpad1
	 *
	 * @param event 事件名
	 * @param options 快捷键配置，配置对象/配置对象数组
	 * @param el 挂载的 dom 元素或者 dom selector，默认是 document.body
	 */
	const registerEvent = (el: Element | string | RegisterShortcutsOptions = 'body', event?: string | string[], callback1?: Func) => {
		let options: RegisterShortcutsOptions;
		if (event && callback1 && typeof callback1 === 'function') {
			options = {
				el: (el as Element | string) || 'body',
				event,
				callback: callback1,
			};
		} else {
			options = el as RegisterShortcutsOptions;
		}

		const addListener = (el: Element | string, eventName: string, handler: Func) => {
			const dom = getDom(el);
			if (!dom) return;

			dom.addEventListener(eventName as any, handler);
			let arr = shortcutEventMap.get(dom);
			if (!arr) arr = [];
			arr.push({ event: eventName, callback: handler });
			shortcutEventMap.set(dom, arr);
		};

		const genKeyState = (eventName: string, declareKeyMap: Map<string, number | number[]>) => {
			const keycodeMap = new Map<number, boolean>();
			const keyMap = new Map<number, string>();
			for (const [key, keycode] of declareKeyMap) {
				if (Array.isArray(keycode)) {
					for (const code of keycode) {
						if (code != null && !isComposeKey(code) && !withKey(eventName)) {
							keycodeMap.set(code, false);
							keyMap.set(code, key);
						}
					}
				} else if (keycode != null && !isComposeKey(keycode) && !withKey(eventName)) {
					keycodeMap.set(keycode, false);
					keyMap.set(keycode, key);
				}
			}
			return { keycodeMap, keyMap };
		};

		const addListenerByEvent = (item: RegisterOptions) => {
			const declareKeyMap = parseShortcutStr(item);
			if (Array.isArray(item.event)) {
				for (const eventName of item.event) {
					addListenerByEventItem(item, eventName, declareKeyMap);
				}
			} else {
				addListenerByEventItem(item, item.event, declareKeyMap);
			}
		};

		const addListenerByEventItem = (item: RegisterOptions, eventName: string, declareKeyMap: Map<string, number | number[]>) => {
			const { keycodeMap, keyMap } = genKeyState(eventName, declareKeyMap);
			/**
			 * 存在快捷键包含非组合键，会自动添加该按键的 keyup, keydown 事件监听
			 */
			if (keycodeMap.size) {
				for (const [keycode, flag] of keycodeMap) {
					let ops = { ...item };
					ops.shortcut = keyMap.get(keycode) as string;
					ops.event = 'keydown';
					const keydownHandler = genTriggerHandler(ops, declareKeyMap, keycodeMap);
					item.el && addListener(document.body, 'keydown', keydownHandler);

					ops = { ...item };
					ops.shortcut = keyMap.get(keycode) as string;
					ops.event = 'keyup';
					const keyupHandler = genTriggerHandler(ops, declareKeyMap, keycodeMap);
					item.el && addListener(document.body, 'keyup', keyupHandler);
				}
			}
			const handler = genTriggerHandler(item, declareKeyMap, keycodeMap);
			item.el && addListener(item.el, eventName, handler);
			shortcutCallbackMap.set(item.callback, handler);
		};

		const addAllListener = () => {
			if (Array.isArray(options)) {
				options.forEach(item => {
					addListenerByEvent(item);
				});
			} else {
				addListenerByEvent(options);
			}
		};

		const init = () => {
			addAllListener();
		};

		init();
	};

	const destroy = (node?: Element, eventName?: string, handler?: Func) => {
		for (const [el, events] of shortcutEventMap.entries()) {
			if (node && node !== el) continue;

			for (const { event, callback } of events) {
				if (eventName && eventName !== event) continue;

				const callbackFn = handler ? (shortcutCallbackMap.get(handler) as any) : callback;
				callbackFn && el.removeEventListener(event, callbackFn);
			}
		}
		shortcutEventMap.clear();
	};

	return { keycodeMap, registerKeycode, registerEvent, disabled, destroy };
};
