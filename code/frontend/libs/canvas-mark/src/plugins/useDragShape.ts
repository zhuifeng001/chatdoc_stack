import { useShortcut } from '../utils/useShortcut';
import { DrawOptions, PluginProps } from '.';
import { inverseTransformPoint } from '../utils/util';
import { ShapeInstance } from '@/types';
import { getCanvasCursor, setCanvasCursor } from '../utils/canvas';
import { isEventPointInShape } from './draw-util';

export const useDragShape = (props: PluginProps, options?: DrawOptions) => {
	const { canvas, markInstance, markParams } = props;
	const { getState, setState } = options || {};
	const { registerEvent, destroy: destroyEvent } = useShortcut();

	let start = false;
	const lastPoint: [number, number] = [0, 0];
	const offset: [number, number] = [0, 0];
	let selectedShape: ShapeInstance | undefined;

	const onMousedownFn = (e: Event) => {
		// 不是左击
		if ((e as MouseEvent).button !== 0) {
			return;
		}
		start = true;
		const event = e as MouseEvent;
		[lastPoint[0], lastPoint[1]] = inverseTransformPoint(canvas, [event.offsetX, event.offsetY]);

		selectedShape = isEventPointInShape({ point: [event.offsetX, event.offsetY], markInstance });

		const state = getState?.();
		if (state) {
			// 鼠标在图形上，不能在图形内绘制
			if (state.draw && state.drag && state.canDrawingInShape && selectedShape) {
				start = false;
				return;
			}
		}

		if (selectedShape) {
			originCursor = getCanvasCursor(canvas);
			setCanvasCursor(canvas, 'move', true);
		}
	};

	const onMousemoveFn = (e: Event) => {
		if (!start || !selectedShape) return;
		const event = e as MouseEvent;
		const [lastX, lastY] = inverseTransformPoint(canvas, [event.offsetX, event.offsetY]);
		[offset[0], offset[1]] = [lastX - lastPoint[0], lastY - lastPoint[1]];
		selectedShape.move?.([offset[0], offset[1]]);
		[lastPoint[0], lastPoint[1]] = [lastX, lastY];
	};

	const onMouseupFn = (e: Event) => {
		start = false;
		selectedShape = undefined;
		setCanvasCursor(canvas, originCursor, true);
	};

	let originCursor: string;
	const enable = () => {
		registerEvent({
			el: canvas,
			event: 'mousedown',
			callback: onMousedownFn,
		});
		registerEvent({
			el: window as any,
			event: 'mousemove',
			callback: onMousemoveFn,
		});
		registerEvent({
			el: window as any,
			event: 'mouseup',
			callback: onMouseupFn,
		});
	};

	const disable = () => {
		destroyEvent();
	};

	return {
		name: 'DragShape',
		enable,
		disable,
	};
};
