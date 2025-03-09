import { getDevicePixelRatio } from './device';
import { useFramePromise } from './canvas';
import { RectStandardPosition } from '../types';
import { MarkScrollIntoViewOptions } from '../types/draw';
import { getScaleBy2d, getTransformBy2d } from './util';

type IntoViewOptions = {
	updateTranslate: (translate: [number, number]) => void;
	getMin: () => number;
	getMax: () => number;
	render: () => void;
};

export const useScrollIntoView = (canvas: HTMLCanvasElement, { updateTranslate, getMin, getMax, render }: IntoViewOptions) => {
	const scrollIntoView = (rect: RectStandardPosition, options?: MarkScrollIntoViewOptions) => {
		const [translateX, translateY] = getTransformBy2d(canvas);
		const [scaleX, scaleY] = getScaleBy2d(canvas);
		// 初始化参数
		options ||= {};
		let block = (options.block ||= 'nearest');
		// 计算定位
		let v = 0;
		const threshold = (options?.threshold ?? 10) || 0;
		let { top: rectTop, height: rectHeight } = rect;
		if (block === 'nearest') {
			if (Math.floor((rectTop - threshold) * scaleY) <= -translateY) block = 'start';
			else if (Math.floor((rectTop + rectHeight + threshold) * scaleY - canvas.height) >= -translateY) block = 'end';
			else block = 'center';
		}
		if (block === 'start') {
			v = (rectTop - threshold) * scaleY;
		} else if (block === 'center') {
			v = (rectTop + rectHeight / 2) * scaleY - canvas.height / 2;
		} else if (block === 'end') {
			v = (rectTop + rectHeight + threshold) * scaleY - canvas.height;
		}
		const devicePixelRatio = getDevicePixelRatio();
		if (v < getMin() * devicePixelRatio) v = getMin() * devicePixelRatio;
		if (v > getMax() * devicePixelRatio) v = getMax() * devicePixelRatio;
		// 动画有性能问题，元素少的时候可用
		if (options.behavior === 'smooth') {
			scrollBehaviorY([translateX, -v]);
			return;
		}
		updateTranslate([translateX, -v]);
	};

	const scrollBehaviorY = async (endTranslate: [number, number], startTranslate?: [number, number]) => {
		startTranslate ??= getTransformBy2d(canvas);

		const start = startTranslate[1];
		const end = endTranslate[1];
		const delta = Math.abs(start - end) / 10;
		// 正数为往下，负数为往上
		const direction = start - end > 0 ? 1 : -1;
		let current = start;
		const step = async () => {
			if (direction > 0) {
				if (current <= end) return;
			} else {
				if (current >= end) return;
			}
			current += delta * -direction;
			current = direction > 0 ? Math.max(current, end) : Math.min(current, end);
			updateTranslate([endTranslate[0], current]);
			render();

			await useFramePromise(step);
		};

		await useFramePromise(step);
	};

	return { scrollIntoView, scrollBehaviorY };
};
