import { CanvasPolygonInstance, CanvasPolygonOptions, CanvasRectInstance, CanvasRectOptions } from '../../types';
import { inverseShapeRealPosition } from '../../utils/page';
import { drawPolygon, drawRect } from '../../utils/useMarkUtil';
import { convertPositionByRect, isPolygonVisible, isRectVisible, transformRectSidePosition } from '../../utils/util';
import { useShape } from './useShape';
import { inPolygonScope, inRectScope } from './util';

export const usePolygon = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, options: CanvasPolygonOptions): CanvasPolygonInstance => {
	const instance = useShape<CanvasPolygonOptions>(canvas, ctx, options);

	instance.isInShapeRange = (e: PointerEvent | [number, number]) => {
		const point = Array.isArray(e) ? e : ([e.offsetX, e.offsetY] as [number, number]);
		return inPolygonScope(canvas, instance.options.position, point);
	};

	instance.isVisible = () => {
		return isRectVisible(canvas, transformRectSidePosition(instance.options));
	};

	instance.render = () => {
		if (instance.options.angle && instance.options.angle !== instance.state.angle) {
			instance.rotate(instance.options.angle, false);
		}

		// 隐藏
		if (!instance.state.visible) return;
		// 画矩形
		drawPolygon(ctx, instance.options);
	};

	return instance;
};
