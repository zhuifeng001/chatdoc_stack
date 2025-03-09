import { MarkScrollIntoViewOptions } from '@/types/draw';
import { getCanvasCursor, setCanvasCursor } from '../utils/canvas';
import {
	CanvasEventOptions,
	CanvasRectInstance,
	CanvasRectOptions,
	Func,
	MarkInternalParams,
	MarkOptions,
	PageItem,
	RectStandardPosition,
	ShapeInstance,
} from '../types';
import { useShortcut } from '../utils/useShortcut';
import { convertPositionByRect, inverseTransformPoint } from '../utils/util';
import { useRectInternal } from '../core/draw/useRectInternal';
import { InternalPage } from '@/utils/page';
import { DrawOptions, PluginProps } from '@/plugins';
import { isEventPointInShape } from './draw-util';

export const useDrawRect = (props: PluginProps, options?: DrawOptions) => {
	const { canvas, ctx, markInstance, markParams, markOptions } = props;
	const { getState, setState } = options || {};
	const { registerEvent, destroy: destroyEvent } = useShortcut();
	let start = false;
	const offset: [number, number] = [0, 0];
	const startOffset: [number, number] = [0, 0];
	const lastOffset: [number, number] = [0, 0];
	let currRectInstance: CanvasRectInstance | null | undefined = null;
	let shapeCustomOptions: CanvasRectOptions | null | undefined;

	const onMousedownFn = (e: Event) => {
		// 不是左击
		if ((e as MouseEvent).button !== 0) {
			return;
		}
		start = true;
		const event = e as MouseEvent;
		// offset[0] = event.x;
		// offset[1] = event.y;
		[offset[0], offset[1]] = inverseTransformPoint(canvas, [event.x, event.y]);
		[startOffset[0], startOffset[1]] = inverseTransformPoint(canvas, [event.offsetX, event.offsetY]);

		const state = getState?.();
		if (state) {
			// 鼠标在图形上，不能在图形内绘制
			if (state.draw && state.drag && !state.canDrawingInShape && isEventPointInShape({ point: [event.offsetX, event.offsetY], markInstance })) {
				start = false;
				return;
			}
		}
	};

	const onMousemoveFn = (e: Event) => {
		if (!start) return;
		const event = e as MouseEvent;
		[lastOffset[0], lastOffset[1]] = inverseTransformPoint(canvas, [event.x, event.y]);

		const currentPageIndex = markInstance.getPageIndex() as number;
		const internalPage = markInstance.getInternalPage(currentPageIndex);
		// 处理矩形选区，宽高存在正负值
		const genRectOptions = (): CanvasRectOptions => {
			const width = lastOffset[0] - offset[0];
			const height = lastOffset[1] - offset[1];
			const rect = { left: startOffset[0], top: startOffset[1], width, height };
			const options: CanvasRectOptions = {
				...rect,
				position: convertPositionByRect(rect),
				type: 'rect',
				strokeStyle: 'red',
				angle: internalPage?.angle,
				...(shapeCustomOptions || {}),
			};
			if (width < 0) {
				options.left = startOffset[0] + width;
				options.width = -width;
			}
			if (height < 0) {
				options.top = startOffset[1] + height;
				options.height = -height;
			}
			return options;
		};
		if (!currRectInstance) {
			const rectOptions = genRectOptions();
			currRectInstance = useRectInternal(canvas, ctx, rectOptions, {
				markParams,
				markOptions,
				markInstance,
				setup(instance) {
					instance.setState({ position: markInstance.transformPositionByPageRect(instance.options), index: currentPageIndex });
				},
			});
			currRectInstance?.events?.onDrawStart?.(currRectInstance);
			markInstance.setPageState(currRectInstance, currentPageIndex);
		} else {
			currRectInstance.updateOptions(genRectOptions());
		}
		currRectInstance.setState({ position: markInstance.transformPositionByPageRect(currRectInstance.options), index: currentPageIndex });
		currRectInstance?.events?.onDrawChange?.(currRectInstance);
		markInstance.render();
	};

	const onMouseupFn = () => {
		start = false;
		// 宽高小于3，忽略该操作
		if (Math.abs(lastOffset[0] - offset[0]) < 3 || Math.abs(lastOffset[1] - offset[1]) < 3) {
			currRectInstance?.events?.onDrawCancel?.(currRectInstance);
			currRectInstance && currRectInstance.destroy();
			currRectInstance = null;
			markInstance.render();
			return;
		}
		// 触发图形完成事件
		currRectInstance?.events?.onDrawComplete?.(currRectInstance);
		currRectInstance = null;
	};

	let originCursor: string;
	const enable = (customOptions?: CanvasRectOptions) => {
		shapeCustomOptions = customOptions;
		originCursor = getCanvasCursor(canvas);
		setCanvasCursor(canvas, 'crosshair', true);

		registerEvent({
			el: canvas,
			event: 'mousedown',
			// shortcut: shortcut,
			callback: onMousedownFn,
		});
		registerEvent({
			el: window as any,
			event: 'mousemove',
			// shortcut: shortcut,
			callback: onMousemoveFn,
		});
		registerEvent({
			el: window as any,
			event: 'mouseup',
			// shortcut: shortcut,
			callback: onMouseupFn,
		});
	};

	const disable = () => {
		setCanvasCursor(canvas, originCursor, true);
		destroyEvent();
	};

	return {
		name: 'DrawRect',
		enable,
		disable,
	};
};
