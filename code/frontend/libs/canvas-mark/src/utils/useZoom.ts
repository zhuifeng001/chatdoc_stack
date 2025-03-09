import { Func } from '@/types';
import { useShortcut } from './useShortcut';
import { getWheelDeltaY } from './compat';
import { getDefaultScale } from './util';
import { getDevicePixelRatio } from './device';

export type ZoomOptions = {
	shortcut?: string;
	step?: number;
	getMin?: () => number;
	getMax?: () => number;
	onZoom: Func<[Event | undefined]>;
};

export type ZoomInstance = ReturnType<typeof useZoom>;

export const useZoom = (canvas: HTMLCanvasElement, options: ZoomOptions) => {
	const { shortcut, step = 0.1, onZoom, getMin, getMax } = options;
	const scale: [number, number] = getDefaultScale();
	const setScale = ([newScaleX, newScaleY]: [number, number]) => {
		scale[0] = newScaleX;
		scale[1] = newScaleY;
	};
	const offset = { x: 0, y: 0 };
	const lastTranslate = [0, 0] as [number, number];
	const { registerEvent, destroy } = useShortcut();

	const zoom = (e: Event | undefined, offsetX: number, offsetY: number, radio: number) => {
		const devicePixelRatio = getDevicePixelRatio();
		const [oldScaleX, oldScaleY] = scale;
		let [newScaleX, newScaleY] = scale;
		newScaleX += radio;
		newScaleY += radio;
		if (getMin) {
			newScaleX = Math.max(getMin(), newScaleX);
			newScaleY = Math.max(getMin(), newScaleY);
		}
		if (getMax) {
			newScaleX = Math.min(getMax(), newScaleX);
			newScaleY = Math.min(getMax(), newScaleY);
		}
		offset.x = offsetX * devicePixelRatio;
		offset.y = offsetY * devicePixelRatio;
		lastTranslate[0] = offset.x - ((offset.x - lastTranslate[0]) * newScaleX) / oldScaleX;
		lastTranslate[1] = offset.y - ((offset.y - lastTranslate[1]) * newScaleY) / oldScaleY;
		setScale([newScaleX, newScaleY]);
		onZoom(e);
	};

	const onMousewheelFn = (e: Event) => {
		e.preventDefault();
		const event = e as WheelEvent as any;
		const delta = getWheelDeltaY(event);
		zoom(event, event.offsetX, event.offsetY, delta < 0 ? step : -step);
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
		updateTranslate: ([x, y]: [number, number]) => {
			lastTranslate[0] = x;
			lastTranslate[1] = y;
		},
		getScale: () => scale,
		setScale,
		setScaleAndZoom(scale: [number, number], [offsetX, offsetY] = [0, 0]) {
			setScale(scale);
			zoom(undefined, offsetX, offsetY, 0);
		},
		setScaleByRadio(radio: number, [offsetX, offsetY] = [0, 0]) {
			zoom(undefined, offsetX, offsetY, radio);
		},
	};
};
