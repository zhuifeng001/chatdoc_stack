import { getDevicePixelRatio } from './device';
import { Func } from '@/types';
import { useShortcut } from './useShortcut';

export type MouseMoveOptions = {
	shortcut?: string;
	onMove: Func<[newV: [number, number], oldV: [number, number]]>;
	onMoveStart?: Func;
	onMoveEnd?: Func;
};

export type MouseMoveInstance = ReturnType<typeof useMouseMove>;

export const useMouseMove = (canvas: HTMLCanvasElement, options: MouseMoveOptions) => {
	const { onMove, onMoveStart, onMoveEnd, shortcut = '' } = options;
	const offset = { x: 0, y: 0 };
	const lastOffset = [0, 0] as [number, number];
	const lastTranslate = [0, 0];
	let start = false;
	const { registerEvent, destroy } = useShortcut();

	const isLeftMouse = (e: MouseEvent) => {
		return e.button === 0 && e.buttons !== 0;
	};

	const onMousedownFn = (e: Event) => {
		start = true;
		const event = e as MouseEvent;
		const devicePixelRatio = getDevicePixelRatio();
		if (isLeftMouse(event)) {
			offset.x = event.x * devicePixelRatio;
			offset.y = event.y * devicePixelRatio;
			onMoveStart?.();
		}
	};

	const onMousemoveFn = (e: Event) => {
		if (!start) return;
		const devicePixelRatio = getDevicePixelRatio();
		const event = e as MouseEvent;
		/**
		 * 左键按下并且鼠标移动
		 */
		if (isLeftMouse(event) && (offset.x !== event.offsetX || offset.y !== event.offsetY)) {
			const prev: [number, number] = [lastOffset[0], lastOffset[1]];
			lastOffset[0] = lastTranslate[0] + event.x * devicePixelRatio - offset.x;
			lastOffset[1] = lastTranslate[1] + event.y * devicePixelRatio - offset.y;
			onMove([lastOffset[0], lastOffset[1]], prev);
		}
	};

	const onMouseupFn = (e: Event) => {
		if (!start) return;

		lastTranslate[0] = lastOffset[0];
		lastTranslate[1] = lastOffset[1];
		start = false;
		onMoveEnd?.();
	};

	registerEvent({
		el: canvas,
		event: 'mousedown',
		shortcut: shortcut,
		callback: onMousedownFn,
		keydown(e) {
			if (!start) {
				onMoveStart?.();
			}
		},
		keyup(e) {
			onMoveEnd?.();
		},
	});
	registerEvent({
		el: 'body',
		event: 'mousemove',
		shortcut: shortcut,
		callback: onMousemoveFn,
	});
	registerEvent({
		el: 'body',
		event: 'mouseup',
		shortcut: shortcut,
		callback: onMouseupFn,
	});

	return {
		destroy,
		getTranslate: () => lastOffset,
		updateTranslate: ([x, y]: [number, number]) => {
			// 在移动的时候，外部不能更新自己的 translate
			if (start) return;

			// 外部更新，同步内部的起点
			lastOffset[0] = x;
			lastOffset[1] = y;

			lastTranslate[0] = x;
			lastTranslate[1] = y;
		},
	};
};
