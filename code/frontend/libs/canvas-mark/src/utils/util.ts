import { isIntersectInPath } from '../lib/intersect/useShapeIntersect';
import { RectStandardPosition, RectSidePosition } from '../types';
import { getDevicePixelRatio } from './device';
import { convertPositionBy8To4 } from './points';

export const getTransformBy2d = (canvas: HTMLCanvasElement): [number, number] => {
	const ctx = canvas.getContext('2d');
	if (!ctx) return [0, 0] as [number, number];
	const transform = (ctx as any).currentTransform || ctx.getTransform();
	// 缩放后的translate
	return [transform.e, transform.f];
};

export const getScaleBy2d = (canvas: HTMLCanvasElement): [number, number] => {
	const ctx = canvas.getContext('2d');
	if (!ctx) return getDefaultScale();
	const transform = (ctx as any).currentTransform || ctx.getTransform();
	return [transform.a, transform.d];
};

export const getDefaultScale = (): [number, number] => {
	const devicePixelRatio = getDevicePixelRatio();
	return [1 * devicePixelRatio, 1 * devicePixelRatio];
};

export const transformRectSidePosition = (rect: RectStandardPosition): RectSidePosition => {
	return {
		left: rect.left,
		right: rect.left + rect.width,
		top: rect.top,
		bottom: rect.top + rect.height,
	};
};

export const transformRectStandardPosition = (rect: RectSidePosition): RectStandardPosition => {
	return {
		left: rect.left,
		top: rect.top,
		width: rect.right - rect.left,
		height: rect.bottom - rect.top,
	};
};

export const convertRectByPosition = (position: number[]): RectStandardPosition => {
	if (!position?.length)
		return {
			left: 0,
			top: 0,
			width: 0,
			height: 0,
		};
	if (position.length === 8) {
		position = convertPositionBy8To4(position);
	}
	return {
		left: position[0],
		top: position[3],
		width: position[2] - position[0],
		height: position[1] - position[3],
	};
};

export const convertPositionByRect = (rect: RectStandardPosition): number[] => {
	const left = rect.left;
	const top = rect.top;
	const right = rect.left + rect.width;
	const bottom = rect.top + rect.height;
	return [left, top, right, top, right, bottom, left, bottom];
};

export const isRectVisible = <Rect extends RectSidePosition>(canvas: HTMLCanvasElement, rect: Rect) => {
	const { left: scaledRectLeft, right: scaledRectRight, top: scaledRectTop, bottom: scaledRectBottom } = getRectPositionBy2d(canvas, rect);
	const { left: canvasLeft, width: canvasRight, top: canvasTop, height: canvasBottom } = getCanvasPositionBy2d(canvas);
	return scaledRectRight >= canvasLeft && scaledRectLeft <= canvasRight && scaledRectBottom >= canvasTop && scaledRectTop <= canvasBottom;
};

/**
 * 图形是否在可视区域中间区域，用来判断第几页
 * @returns
 */
export const isRectVisibleMiddle = <Rect extends RectSidePosition>(canvas: HTMLCanvasElement, rect: Rect) => {
	const { top: scaledRectTop, bottom: scaledRectBottom } = getRectPositionBy2d(canvas, rect);
	const { top: canvasTop, height: canvasBottom } = getCanvasPositionBy2d(canvas);
	const middle = (canvasBottom - canvasTop) / 2;
	return scaledRectBottom >= middle && scaledRectTop <= middle;
};

export const getCanvasPositionBy2d = (canvas: HTMLCanvasElement): RectStandardPosition => {
	const canvasWidth = canvas.width;
	const canvasHeight = canvas.height;
	return {
		left: 0,
		top: 0,
		width: canvasWidth,
		height: canvasHeight,
	};
};

export const isPolygonVisible = (canvas: HTMLCanvasElement, position: number[]) => {
	const polygonPosition = getPolygonPositionBy2d(canvas, position);
	const canvasPosition = convertPositionByRect(getCanvasPositionBy2d(canvas));
	return isIntersectInPath(polygonPosition, canvasPosition);
};

export const getPolygonPositionBy2d = (canvas: HTMLCanvasElement, position: number[]) => {
	if (!position?.length) return position;

	const [translateX, translateY] = getTransformBy2d(canvas);
	const [scaleX, scaleY] = getScaleBy2d(canvas);
	const res: number[] = [];
	for (let i = 0; i < position.length; i++) {
		// 偶数
		if (i & 1) {
			res[i] = position[i] * scaleY + translateY;
		}
		// 奇数
		else {
			res[i] = position[i] * scaleX + translateX;
		}
	}
	return res;
};

export const getRectPositionBy2d = (canvas: HTMLCanvasElement, rect: RectSidePosition) => {
	const [translateX, translateY] = getTransformBy2d(canvas);
	const [scaleX, scaleY] = getScaleBy2d(canvas);
	const { left: rectLeft, top: rectTop, right: rectRight, bottom: rectBottom } = rect;
	// 计算经过缩放和平移后的矩形边界
	const res = {
		left: rectLeft * scaleX + translateX,
		top: rectTop * scaleY + translateY,
		right: rectRight * scaleX + translateX,
		bottom: rectBottom * scaleY + translateY,
	};
	return res;
};

export const inverseTransformPoint = (canvas: HTMLCanvasElement, point: [number, number]): [number, number] => {
	const devicePixelRatio = getDevicePixelRatio();
	const [scaleX, scaleY] = getScaleBy2d(canvas);
	const [translateX, translateY] = getTransformBy2d(canvas);
	return [(point[0] * devicePixelRatio - translateX) / scaleX, (point[1] * devicePixelRatio - translateY) / scaleY];
};

/**
 *
 * @param point 图形的点
 * @returns 相对于 canvas左上角 的点位
 */
export const transformActualPoint = (canvas: HTMLCanvasElement, points: number[]) => {
	const devicePixelRatio = getDevicePixelRatio();
	const [scaleX, scaleY] = getScaleBy2d(canvas);
	const [translateX, translateY] = getTransformBy2d(canvas);

	return points.map((num, i) => {
		if (i & 1) {
			// 偶数位
			return (num * scaleY + translateY) / devicePixelRatio;
		} else {
			// 奇数位
			return (num * scaleX + translateX) / devicePixelRatio;
		}
	});
};
