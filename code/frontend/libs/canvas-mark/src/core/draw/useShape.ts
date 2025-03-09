import { MarkScrollIntoViewOptions } from '../../types/draw';
import { CommonShapeOptions, ShapeInstance } from '../../types';
import { CanvasEventOptions, InternalShapeOptions, RectStandardPosition } from '../../types/index';
import { CanvasShapeInstance, CanvasShapeState } from '../../types';
import { isRectVisible, transformRectSidePosition } from '../../utils/util';

const getDefaultState = (): CanvasShapeState => ({
	// 鼠标是否在图形范围内
	inRange: false,
	// 第几页
	index: 1,
	// 点位
	position: [],
	// 是否是选中状态
	active: false,
	// 是否隐藏
	visible: true,
	// 可触发事件
	canEmitEvent: true,
	// 自定义数据
	data: undefined,
	// 角度
	angle: 0,
	// 动画状态
	animationStatus: 'done',
	// 动画前的参数
	originOptions: undefined,
});

interface ShapeConstructor {
	<T extends RectStandardPosition & CanvasEventOptions & InternalShapeOptions & CommonShapeOptions>(
		canvas: HTMLCanvasElement,
		ctx: CanvasRenderingContext2D,
		options: T
	): CanvasShapeInstance<T>;
	getId: () => number;
	id: number;
}

export const useShape: ShapeConstructor = <T extends RectStandardPosition & CanvasEventOptions & InternalShapeOptions & CommonShapeOptions>(
	canvas: HTMLCanvasElement,
	ctx: CanvasRenderingContext2D,
	options: T
): CanvasShapeInstance<T> => {
	const id = (useShape.id = useShape.getId());
	const state: CanvasShapeState = getDefaultState();

	// 鼠标是否在图形范围内
	const isInShapeRange = (e: PointerEvent | [number, number]) => false;

	// 是否在可视范围内
	const isVisible = () => false;

	// 渲染图形
	const render = () => {};

	const destroy = () => {};

	const scrollIntoView = (opt?: MarkScrollIntoViewOptions) => {};

	const move = ([x, y]: [number, number]) => {};

	const addSelector = (selector: string) => {};
	const removeSelector = (selector: string) => {};
	const getOffset = () => {};
	const rotate = (angle: number, render?: boolean) => {
		setState({ angle });
	};

	const setActiveAnimation = () => {};
	// 类似于阻止冒泡
	const stopPropagation = () => {
		instance.setState({
			canEmitEvent: false,
		});
	};
	const restorePropagation = () => {
		instance.setState({
			canEmitEvent: true,
		});
	};

	// 设置激活状态
	const activated = (intoView = true, intoViewOptions?: MarkScrollIntoViewOptions) => {
		setState({ active: true });
		if (intoView) {
			instance.scrollIntoView(intoViewOptions);
			instance.setActiveAnimation();
		}
	};

	const deactivated = () => {
		setState({ active: false });
	};

	const updateOptions = (newOptions: Partial<T>) => {
		instance.options = Object.freeze({
			...instance.options,
			...newOptions,
		});
	};

	const setState = (newState: Partial<CanvasShapeState>) => {
		instance.state = Object.freeze({
			...instance.state,
			...newState,
		});
	};

	const instance: CanvasShapeInstance<T> = {
		id,
		options: Object.freeze(options),
		updateOptions,
		state: Object.freeze(state),
		setState,
		activated,
		deactivated,
		setActiveAnimation,
		isInShapeRange,
		isVisible,
		render,
		destroy,
		scrollIntoView,
		stopPropagation,
		restorePropagation,
		addSelector,
		removeSelector,
		getOffset,
		rotate,
		move,
	};

	return instance;
};

useShape.id = 0;
useShape.getId = () => ++useShape.id;
