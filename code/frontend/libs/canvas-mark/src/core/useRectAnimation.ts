import { CanvasRectInstance, Func, RectStandardPosition, ShapeInstance, ShapePosition } from '../types';
import { AnimationKeyframe, AnimationOptions, useShapeAnimation } from './draw/useShapeAnimation';
import { AnimationKeyframeOptions } from './useAnimation';

export const getDefaultRectKeyframes = <S extends ShapeInstance = CanvasRectInstance>(
	shape: S,
	options?: AnimationKeyframeOptions
): RectStandardPosition[] => {
	let { unit, period = 2 } = options || {};
	const rectOriginOptions = { ...shape.options };

	unit ??= Math.min(rectOriginOptions.width / 2, rectOriginOptions.height / 2, 2) || 2; // 最小单位是 2
	const scaleXValue = unit;
	const scaleYValue = unit;

	const prePeriodKeyframe = [
		{
			left: rectOriginOptions.left,
			top: rectOriginOptions.top,
			width: rectOriginOptions.width,
			height: rectOriginOptions.height,
		},
		{
			left: rectOriginOptions.left - scaleXValue,
			top: rectOriginOptions.top - scaleYValue,
			width: rectOriginOptions.width + 2 * scaleXValue,
			height: rectOriginOptions.height + 2 * scaleYValue,
		},
		{
			left: rectOriginOptions.left,
			top: rectOriginOptions.top,
			width: rectOriginOptions.width,
			height: rectOriginOptions.height,
		},
		{
			left: rectOriginOptions.left + scaleXValue,
			top: rectOriginOptions.top + scaleYValue,
			width: rectOriginOptions.width - 2 * scaleXValue,
			height: rectOriginOptions.height - 2 * scaleYValue,
		},
	];

	const keyframes: RectStandardPosition[] = Array.from({ length: period })
		.map(() => prePeriodKeyframe)
		.flat()
		.concat({
			left: rectOriginOptions.left,
			top: rectOriginOptions.top,
			width: rectOriginOptions.width,
			height: rectOriginOptions.height,
		});

	return keyframes;
};

export const useRectAnimation = (shape: CanvasRectInstance, render: Func, options?: AnimationKeyframeOptions) => {
	const keyframes = getDefaultRectKeyframes(shape, options);
	return useShapeAnimation<RectStandardPosition, CanvasRectInstance>({
		duration: 600,
		render,
		keyframes: keyframes.map(keyframe => {
			return {
				percent: 0.1,
				state: [[shape, keyframe]],
			};
		}),
		handler: useDefaultRectAnimationHandler,
	});
};

export const useDefaultRectAnimationHandler = <T extends ShapePosition = RectStandardPosition, S extends ShapeInstance = CanvasRectInstance>(
	options: AnimationOptions<T, S>
) => {
	const { keyframes, duration, render } = options;

	const setAnimatedShape = (shape: ShapeInstance) => {
		if (shape.state.animationStatus === 'doing') return;
		const shapeOptions = shape.options;
		shape.setState({
			animationStatus: 'doing',
			originOptions: {
				left: shapeOptions.left,
				top: shapeOptions.top,
				width: shapeOptions.width,
				height: shapeOptions.height,
			} as any,
		});
	};

	const restoreAnimatedShape = (shape: ShapeInstance) => {
		if (shape.state.animationStatus === 'done') return;
		const shapeOptions = shape.options;
		const shapeOriginOptions = shape.state.originOptions || {};
		shape.updateOptions({ ...shapeOriginOptions });
		shape.setState({ animationStatus: 'done', originOptions: undefined });
	};

	return {
		init() {
			keyframes.map(keyframe => {
				for (const [shape, rectOptions] of keyframe.state) {
					setAnimatedShape(shape);
				}
			});
		},
		destroy() {},
		restore() {
			keyframes.map(keyframe => {
				for (const [shape, rectOptions] of keyframe.state) {
					restoreAnimatedShape(shape);
				}
			});
		},
		run(startKeyframe: AnimationKeyframe<T, S>, endKeyframe: AnimationKeyframe<T, S>, progress: number) {
			for (const [shape, rectOptions] of startKeyframe.state) {
				let start = rectOptions as RectStandardPosition;
				let end = new Map(endKeyframe.state).get(shape) as RectStandardPosition;

				const left = start.left + (end.left - start.left) * progress;
				const top = start.top + (end.top - start.top) * progress;
				const width = start.width + (end.width - start.width) * progress;
				const height = start.height + (end.height - start.height) * progress;
				shape.updateOptions({
					left: left,
					top: top,
					width: width,
					height: height,
				});
			}
		},
	};
};
