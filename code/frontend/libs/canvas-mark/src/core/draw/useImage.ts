import { isRectVisible, transformRectSidePosition } from '../../utils/util';
import { CanvasImageInstance, CanvasImageOptions } from '../../types';
import { drawImage } from '../../utils/useMarkUtil';
import { useShape } from './useShape';
import { inRectScope } from './util';

export const useImage = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, options: CanvasImageOptions): CanvasImageInstance => {
	const instance = useShape<CanvasImageOptions>(canvas, ctx, options);

	instance.isInShapeRange = (e: PointerEvent | [number, number]) => {
		const point = Array.isArray(e) ? e : ([e.offsetX, e.offsetY] as [number, number]);
		return inRectScope(canvas, instance.options, point);
	};

	instance.isVisible = () => {
		return isRectVisible(canvas, transformRectSidePosition(instance.options));
	};

	const render = async () => {
		// 画矩形
		await drawImage(canvas, instance.options);
	};

	return Object.assign(instance, { render, options });
};
