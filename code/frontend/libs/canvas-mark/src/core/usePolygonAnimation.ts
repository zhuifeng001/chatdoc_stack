import { convertRectByPosition } from './../utils/util';
import { calculatePolygonCenter, getMinRectByPolygon } from '../utils/polygon';
import { CanvasPolygonInstance, CanvasPolygonOptions, CanvasRectInstance, Func, PolygonPosition, ShapeInstance, ShapePosition } from '../types';
import { AnimationKeyframe, AnimationOptions, useShapeAnimation } from './draw/useShapeAnimation';
import { AnimationKeyframeOptions } from './useAnimation';

export const getDefaultPolygonKeyframes = <S extends ShapeInstance = CanvasPolygonInstance>(
	shape: S,
	options?: AnimationKeyframeOptions
): PolygonPosition[] => {
	let { unit, period = 2 } = options || {};
	const polygonOriginOptions = { ...shape.options } as CanvasPolygonOptions;
	const { width, height } = convertRectByPosition(getMinRectByPolygon((shape as CanvasPolygonInstance).options.position));

	unit ??= Math.min(width / 2, height / 2, 2) || 2; // 最小单位是 2

	const perPeriodKeyframe = [
		{
			position: polygonOriginOptions.position,
		},
		{
			position: calcKeyframePosition(polygonOriginOptions.position, unit),
		},
		{
			position: polygonOriginOptions.position,
		},
		{
			position: calcKeyframePosition(polygonOriginOptions.position, -unit),
		},
	];

	const keyframes: PolygonPosition[] = Array.from({ length: period })
		.map(() => perPeriodKeyframe)
		.flat()
		.concat({
			position: polygonOriginOptions.position,
		});

	return keyframes;
};

export const usePolygonAnimation = (shape: CanvasPolygonInstance, render: Func, options?: AnimationKeyframeOptions) => {
	const keyframes = getDefaultPolygonKeyframes(shape, options);
	return useShapeAnimation<PolygonPosition, CanvasPolygonInstance>({
		duration: 600,
		render,
		keyframes: keyframes.map(keyframe => {
			return {
				percent: 0.1,
				state: [[shape, keyframe]],
			};
		}),
		handler: useDefaultPolygonAnimationHandler,
	});
};

export const useDefaultPolygonAnimationHandler = <T extends ShapePosition = PolygonPosition, S extends ShapeInstance = CanvasPolygonInstance>(
	options: AnimationOptions<T, S>
) => {
	const { keyframes, duration, render } = options;
	const setAnimatedShape = (shape: CanvasPolygonInstance) => {
		if (shape.state.animationStatus === 'doing') return;
		const shapeOptions = shape.options;
		shape.setState({
			animationStatus: 'doing',
			originOptions: {
				position: shapeOptions.position,
				...convertRectByPosition(getMinRectByPolygon(shapeOptions.position)),
			} as any,
		});
	};

	const restoreAnimatedShape = (shape: CanvasPolygonInstance) => {
		if (shape.state.animationStatus === 'done') return;
		const shapeOptions = shape.options;
		const shapeOriginOptions = shape.state.originOptions || {};
		shape.updateOptions({ ...shapeOriginOptions });
		shape.setState({ animationStatus: 'done', originOptions: undefined });
	};

	return {
		init() {
			keyframes.map(keyframe => {
				for (const [shape, polygonOptions] of keyframe.state as [CanvasPolygonInstance, PolygonPosition][]) {
					setAnimatedShape(shape);
				}
			});
		},
		destroy() {},
		restore() {
			keyframes.map(keyframe => {
				for (const [shape, polygonOptions] of keyframe.state as [CanvasPolygonInstance, PolygonPosition][]) {
					restoreAnimatedShape(shape);
				}
			});
		},
		run(startKeyframe: AnimationKeyframe<T, S>, endKeyframe: AnimationKeyframe<T, S>, progress: number) {
			for (const [shape, polygonOptions] of startKeyframe.state as [CanvasPolygonInstance, PolygonPosition][]) {
				let start = polygonOptions as PolygonPosition;
				let end = new Map(endKeyframe.state as [CanvasPolygonInstance, PolygonPosition][]).get(shape) as PolygonPosition;

				const newPosition: number[] = [];
				const startPosition = start.position;
				const endPosition = end.position;
				for (let i = 0; i < endPosition.length; i++) {
					newPosition[i] = startPosition[i] + (endPosition[i] - startPosition[i]) * progress;
				}

				const rect = convertRectByPosition(getMinRectByPolygon(newPosition));
				shape.updateOptions({
					position: newPosition,
					...rect,
				});
			}
		},
	};
};

const calcKeyframePosition = (position: number[], distance: number) => {
	const [cx, cy] = calculatePolygonCenter(position);
	const res: number[] = [];
	for (let i = 0; i < position.length; i++) {
		if (i & 1) {
			// 偶数
			const symbol = position[i] < cy ? -1 : 1;
			res[i] = position[i] + distance * symbol;
		} else {
			// 奇数
			const symbol = position[i] < cx ? -1 : 1;
			res[i] = position[i] + distance * symbol;
		}
	}
	return res;
};
