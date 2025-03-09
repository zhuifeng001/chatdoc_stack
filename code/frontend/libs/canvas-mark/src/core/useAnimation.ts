import { CanvasRectOptions, Func, RectStandardPosition, ShapeInstance, ShapePosition } from '..';
import { AnimationKeyframe, AnimationOptions, useShapeAnimation } from './draw/useShapeAnimation';
import { getDefaultPolygonKeyframes, useDefaultPolygonAnimationHandler } from './usePolygonAnimation';
import { getDefaultRectKeyframes, useDefaultRectAnimationHandler } from './useRectAnimation';

export type AnimationKeyframeOptions = {
	unit?: number;
	period?: number;
};

export type AnimationProps = ShapeAnimationOptions | AnimationOptions;

type ShapeAnimationOptions = {
	shapes: ShapeInstance[];
	render: Func;
};

export const useAnimation = (props: AnimationProps, options?: AnimationKeyframeOptions) => {
	const { render } = props;
	let animationOptions: AnimationOptions;

	if ('shapes' in props && props.shapes) {
		const props_1 = props as ShapeAnimationOptions;
		animationOptions = getDefaultAnimation(props_1.shapes, render, options) as AnimationOptions;
		return useShapesAnimation(animationOptions);
	} else {
		const props_2 = props as Pick<AnimationOptions, 'render'>;
		// 自定义动画
		animationOptions = {
			...props_2,
			render,
		} as AnimationOptions;
		return useShapeAnimation(animationOptions);
	}
};

/**
 * 默认动画，对图形进行分组，不同的图形使用不同的handler
 * @returns
 */
export const useShapesAnimation = (options: AnimationOptions) => {
	let allShapes = options.keyframes.map(o => o.state.map(p => p[0])).flat(2);
	const shapeTypeMap = groupByShapesByType(allShapes);
	const arr: ReturnType<typeof useShapeAnimation>[] = [];
	for (const [type, shapes] of shapeTypeMap) {
		if (type === 'rect') {
			options.handler = useDefaultRectAnimationHandler;
		} else if (type === 'polygon' || type === 'badge') {
			options.handler = useDefaultPolygonAnimationHandler;
		}
		arr.push(useShapeAnimation(options));
	}
	return {
		run: () => {
			arr.map(o => o.run());
		},
	};
};

export const groupByShapesByType = (shapes: ShapeInstance[]) => {
	const shapeTypeMap = new Map<string, ShapeInstance[]>();
	for (const shape of shapes) {
		const type = shape.options.type;
		let arr: ShapeInstance[] | undefined = shapeTypeMap.get(type);
		if (!arr) {
			shapeTypeMap.set(type, (arr = []));
		}
		arr.push(shape);
	}
	return shapeTypeMap;
};

const getKeyframesState = (shapes: ShapeInstance[], options?: AnimationKeyframeOptions) => {
	if (!shapes?.length) return [];
	const shapeMap = new Map<ShapeInstance, ShapePosition[]>();
	shapes.map(shape =>
		shapeMap.set(shape, shape.options.type === 'rect' ? getDefaultRectKeyframes(shape, options) : getDefaultPolygonKeyframes(shape, options))
	);

	const res: AnimationKeyframe[] = [];

	const keyframesOfFirstShape = shapeMap.get(shapes[0]) || [];
	for (let i = 0; i < keyframesOfFirstShape.length; i++) {
		const keyframe: AnimationKeyframe = {
			percent: 0.1,
			state: [],
		};
		for (const [shape, keyframes] of shapeMap) {
			keyframe.state.push([shape, keyframes[i]]);
		}
		res.push(keyframe);
	}
	return res;
};

const getDefaultAnimation = (shapes: ShapeInstance[], render: Func, options?: AnimationKeyframeOptions): Omit<AnimationOptions, 'handler'> => {
	return {
		duration: 600,
		render,
		keyframes: getKeyframesState(shapes, options),
	};
};
