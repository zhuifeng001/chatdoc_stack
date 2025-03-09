import { isPointInPath } from '../../lib/intersect/useShapeIntersect';
import { RectStandardPosition } from '../../types';
import { inverseTransformPoint } from '../../utils/util';

/**
 *
 * @param canvas
 * @param rect
 * @param point 相对于canvas左上角的点位，通常是鼠标点击的点
 * @returns
 */
export const inRectScope = (canvas: HTMLCanvasElement, rect: RectStandardPosition, point: [number, number]) => {
	const { left, top, width, height } = rect;
	const [x, y] = inverseTransformPoint(canvas, point);
	const right = left + width;
	const bottom = top + height;
	if (x < left || x > right || y < top || y > bottom) {
		return false;
	}
	return true;
};

/**
 *
 * @param canvas
 * @param positions
 * @param point 相对于canvas左上角的点位，通常是鼠标点击的点
 * @returns
 */
export const inPolygonScope = (canvas: HTMLCanvasElement, positions: number[], point: [number, number]) => {
	const actualPoint = inverseTransformPoint(canvas, point);
	return isPointInPath(positions, actualPoint);
};
