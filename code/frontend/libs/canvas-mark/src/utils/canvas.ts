import { Func } from '@/types';
import { getDevicePixelRatio } from './device';

export type CreateNodeOptions = {
	nodeName?: string;
	className?: string | string[];
	attrs?: Record<string, any>;
	children?: HTMLElement[] | string;
};

export const createNode = ({ nodeName = 'div', className, attrs, children }: CreateNodeOptions) => {
	const node = document.createElement(nodeName);
	if (typeof className === 'string') {
		node.classList.add(className);
	} else if (Array.isArray(className)) {
		className.map(c => node.classList.add(c));
	}

	if (attrs) {
		for (const key in attrs) {
			node.setAttribute(key, attrs[key]);
		}
	}

	if (children) {
		if (typeof children === 'string') {
			node.innerHTML = children;
		} else {
			children.map(child => node.appendChild(child));
		}
	}
	return node;
};

export const getNode = (selector: string | HTMLElement): HTMLElement | null => {
	return typeof selector === 'string' ? document.querySelector(selector) : selector;
};

export const clearCanvas = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
	// eslint-disable-next-line no-self-assign
	canvas.width = canvas.width;
	// ctx.clearRect(0, 0, canvas.width, canvas.height)
};

export const createCanvas = ({ width, height }: { width: number; height: number }) => {
	const canvas = document.createElement('canvas');
	setCanvasRectByRatio(canvas, width, height);
	return canvas;
};

export const setCanvasRectByRatio = (canvas: HTMLCanvasElement, width: number, height: number) => {
	const devicePixelRatio = getDevicePixelRatio();
	canvas.width = width * devicePixelRatio;
	canvas.height = height * devicePixelRatio;
	canvas.style.width = width + 'px';
	canvas.style.height = height + 'px';
};

export const useIdlePromise = (fn, ...args) => {
	let timer: NodeJS.Timeout | null = null;

	const execute = resolve => {
		requestIdleCallback(async deadline => {
			if (timer) {
				clearTimeout(timer);
				timer = null;
			}
			if (deadline.timeRemaining() > 0 || deadline.didTimeout) {
				const res = await fn(...args);
				resolve(res);
				return;
			}
			timer = setTimeout(() => {
				execute(resolve);
			}, 30);
		});
	};
	return new Promise(resolve => execute(resolve));
};

export const useFramePromise = (fn: Func) => {
	return new Promise(resolve => {
		requestAnimationFrame(async () => {
			await fn();
			resolve(void 0);
		});
	});
};

export const measureTextSize = (ctx: CanvasRenderingContext2D, text: string, font?: string) => {
	if (font) {
		ctx.save();
		ctx.font = font;
	}
	const res = ctx.measureText(text);
	if (font) {
		ctx.restore();
	}
	return { width: res.width, height: Math.abs(res.actualBoundingBoxAscent - res.actualBoundingBoxDescent) };
};

type SetCanvasCursor = {
	(canvas: HTMLCanvasElement, cursor: string, force?: boolean): void;
};

export const setCanvasCursor: SetCanvasCursor = (canvas: HTMLCanvasElement, cursor: string, force = false) => {
	if (!canvas.style.cursor || canvas.style.cursor === 'default' || force) {
		canvas.style.cursor = cursor;
	}
};

export const getCanvasCursor = (canvas: HTMLCanvasElement) => {
	return canvas.style?.cursor;
};
