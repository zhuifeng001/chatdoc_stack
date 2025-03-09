import { CanvasBadgeInstance, CanvasBadgeOptions } from '@/types';
import { InternalShapeMethodsOptions, useInternalShapeMethods } from './useInternalShapeMethods';
import { useBadge } from './useBadge';
import { AnimationKeyframeOptions } from '../useAnimation';
import { usePolygonAnimation } from '../usePolygonAnimation';
import { rotatePoints } from '../../utils/rotate';
import { transformShapeActualPosition } from '../../utils/page';
import { convertRectByPosition } from '../../utils/util';
import { getMinRectByPolygon } from '../../utils/polygon';

export const useBadgeInternal = (
	canvas: HTMLCanvasElement,
	ctx: CanvasRenderingContext2D,
	options: CanvasBadgeOptions,
	internalOptions: InternalShapeMethodsOptions
): CanvasBadgeInstance => {
	const { markInstance, markParams, setup } = internalOptions;
	const instance = useBadge(canvas, ctx, options);

	const methods = useInternalShapeMethods(canvas, instance, internalOptions);

	Object.assign(instance, {
		...methods,
		// 设置激活动画
		setActiveAnimation: (options?: AnimationKeyframeOptions) => {
			usePolygonAnimation(instance as any, markInstance.render, options).run();
		},
		rotate(angle: number, render = true) {
			const originAngle = instance.state.angle;
			if (originAngle === angle) return;
			instance.setState({ angle });
			const position = instance.state.position;
			const internalPage = markInstance.getInternalPage(instance.state.index);
			if (!internalPage) return;
			const newPosition = rotatePoints(position, angle - originAngle);
			if (!newPosition) return;
			const prevInternalPage = markInstance.getInternalPage(instance.state.index - 1);
			const actualPosition = transformShapeActualPosition(newPosition, internalPage, prevInternalPage, markParams);

			instance.updateOptions({
				position: actualPosition,
				...convertRectByPosition(getMinRectByPolygon(actualPosition)),
			});

			render && instance.render();
		},
		move([x, y]: [number, number]) {
			const newPosition = instance.options.position.map((n, i) => {
				if (i & 1) {
					return n + y;
				} else {
					return n + x;
				}
			});
			instance.updateOptions({
				position: newPosition,
				...convertRectByPosition(getMinRectByPolygon(newPosition)),
			});
			instance.setState({ position: markInstance.transformPositionByPagePolygon(newPosition, instance.state.index) });
			instance?.events?.onDrawChange?.(instance);
			markInstance.render();
		},
	} as Partial<CanvasBadgeInstance>);

	const init = () => {
		setup?.(instance);
		if (instance.options.angle && instance.options.angle !== instance.state.angle) {
			instance.rotate(instance.options.angle, false);
		}
	};
	init();

	return instance;
};
