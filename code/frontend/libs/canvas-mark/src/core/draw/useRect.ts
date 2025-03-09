import { CanvasRectInstance, CanvasRectOptions } from '../../types';
import { inverseShapeRealPosition } from '../../utils/page';
import { drawRect } from '../../utils/useMarkUtil';
import { convertPositionByRect, isRectVisible, transformRectSidePosition } from '../../utils/util';
import { useShape } from './useShape';
import { inRectScope } from './util';

export const useRect = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, options: CanvasRectOptions): CanvasRectInstance => {
	const instance = useShape<CanvasRectOptions>(canvas, ctx, options);

	instance.isInShapeRange = (e: PointerEvent | [number, number]) => {
		const point = Array.isArray(e) ? e : ([e.offsetX, e.offsetY] as [number, number]);
		return inRectScope(canvas, instance.options, point);
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
		drawRect(ctx, instance.options);
	};

	return instance;
};
