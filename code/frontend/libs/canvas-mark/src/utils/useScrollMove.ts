import { Func } from '@/types';
import { useShortcut } from './useShortcut';
import { getScaleBy2d } from './util';
import { getWheelDeltaY } from './compat';
import { useFramePromise } from './canvas';
import { isIE } from './browser';
import { getDevicePixelRatio } from './device';

export type ScrollMoveOptions = {
	shortcut?: string;
	duration?: number;
	top?: number;
	bottom?: number;
	getMin?: Func<[], number | undefined>;
	getMax?: Func<[], number | undefined>;
	onBeforeMove?: Func<[WheelEvent, number]>;
	onMove?: Func<[WheelEvent, [number, number], [number, number]]>;
};

export type ScrollMoveInstance = ReturnType<typeof useScrollMove>;

export const useScrollMove = (canvas: HTMLCanvasElement, options: ScrollMoveOptions) => {
	const { onBeforeMove, onMove, duration = 50, shortcut = '' } = options;
	const lastTranslate = [0, 0] as [number, number];
	const prevTranslate = [0, 0] as [number, number];
	const { registerEvent, destroy } = useShortcut();

	const isIEVar = isIE();

	const onMousewheelFn = async (e: Event) => {
		e.preventDefault();
		const { top, bottom, getMin, getMax } = options;
		const event = e as WheelEvent as any;
		const devicePixelRatio = getDevicePixelRatio();
		// delta 往下是正，往上是负
		const deltaY = getWheelDeltaY(event) * devicePixelRatio;
		if ((await onBeforeMove?.(event, deltaY)) === false) return;

		const symbol = deltaY > 0 ? 1 : -1;
		const unit = 15;
		const unitDistance = unit * symbol;
		let current = 0;

		const getNewestTranslate = (translateX: number, translateY: number): [number, number] => {
			const existMinOption = top != null || getMin != null;
			const existMaxOption = bottom != null || getMax != null;
			const [scaleX, scaleY] = getScaleBy2d(canvas);
			// 判断边界
			if (existMinOption && deltaY <= 0) {
				const minValue = (top ?? getMin?.() ?? 0) * scaleY;
				if (translateY >= minValue) {
					translateY = minValue;
				}
			} else if (existMaxOption && deltaY > 0) {
				const maxValue = (bottom ?? getMax?.() ?? 0) * scaleY;
				if (-translateY >= maxValue - canvas.height) {
					translateY = -(maxValue - canvas.height);
				}
			}
			return [translateX, translateY];
		};

		const step = () => {
			if (current === deltaY) return;
			current += unitDistance;
			if (deltaY > 0) {
				if (current > deltaY) return;
				current = Math.min(current, deltaY);
			} else {
				if (current < deltaY) return;
				current = Math.max(current, deltaY);
			}

			onMove?.(event, getNewestTranslate(lastTranslate[0], lastTranslate[1] - unitDistance), prevTranslate);

			useFramePromise(step);
		};

		if (isIEVar) {
			onMove?.(event, getNewestTranslate(lastTranslate[0], lastTranslate[1] - deltaY), prevTranslate);
		} else {
			useFramePromise(step);
		}
	};

	const updateTranslate = ([x, y]: [number, number]) => {
		prevTranslate[0] = lastTranslate[0];
		prevTranslate[1] = lastTranslate[1];

		lastTranslate[0] = x;
		lastTranslate[1] = y;
	};

	registerEvent({
		el: canvas,
		event: ['wheel'],
		shortcut: shortcut,
		callback: onMousewheelFn,
	});

	return {
		destroy,
		getTranslate: () => lastTranslate,
		updateTranslate,
	};
};
