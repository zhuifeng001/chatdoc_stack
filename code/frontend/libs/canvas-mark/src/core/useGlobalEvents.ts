import { CanvasDrawEvent, CanvasEvent, Func, MarkOptions, PageItem } from '../types';
import { useEvent } from '../utils/useEvent';
import { ShapeInstance } from '../types';
import { getCanvasCursor, setCanvasCursor } from '../utils/canvas';
import { InternalPage } from '../utils/page';
import { rotatePoint, rotatePointBase, rotatePoints, rotatePointsBase } from '../utils/rotate';
import { MarkInstance } from './mark';

const getMarkDrawEvents = (markInstance: MarkInstance, markOptions: MarkOptions): Partial<Record<CanvasDrawEvent, Func>> => {
	return {
		onDrawStart: (...args) => {
			markOptions?.onDrawStart?.(...args);
			markInstance.emit('drawStart', args);
		},
		onDrawComplete: (...args) => {
			markOptions?.onDrawComplete?.(...args);
			markInstance.emit('drawComplete', args);
		},
		onDrawCancel: (...args) => {
			markOptions?.onDrawCancel?.(...args);
			markInstance.emit('drawCancel', args);
		},
		onDrawChange: (...args) => {
			markOptions?.onDrawChange?.(...args);
			markInstance.emit('drawChange', args);
		},
		onDrawRemove: (...args) => {
			markOptions?.onDrawRemove?.(...args);
			markInstance.emit('drawRemove', args);
		},
	};
};

export const getMarkEvents = (markInstance: MarkInstance, markOptions: MarkOptions): Partial<Record<CanvasEvent, Func>> => {
	return {
		click: (...args) => {
			markOptions?.onMarkClick?.(...args);
			markInstance.emit('markClick', args);
		},
		rightClick: (...args) => {
			markOptions?.onMarkRightClick?.(...args);
			markInstance.emit('markRightClick', args);
		},
		mousemove: (...args) => {
			markOptions?.onMarkHover?.(...args);
			markInstance.emit('markHover', args);
		},
		mouseleave: (...args) => {
			markOptions?.onMarkLeave?.(...args);
			markInstance.emit('markLeave', args);
		},
		...getMarkDrawEvents(markInstance, markOptions),
	};
};

const MarkEventsMap: Partial<Record<CanvasEvent, string>> = {
	click: 'click',
	rightClick: 'mouseup',
	mousemove: 'mousemove',
	mouseleave: 'mousemove',
};

type GlobalEventsOptions = {
	markInstance: MarkInstance;
	markOptions: MarkOptions;
	getPageState: (page?: InternalPage<PageItem> | number) => ShapeInstance[];
	getPageIndex: () => number;
	getPages: () => PageItem[];
	getInternalPagesByVisible: () => InternalPage<PageItem>[];
};

export const useGlobalEvents = (
	canvas: HTMLCanvasElement,
	{ markInstance, getPageState, getPages, getPageIndex, markOptions, getInternalPagesByVisible }: GlobalEventsOptions
) => {
	const { on, off } = useEvent(canvas);

	const EventValidatorMap: Partial<Record<CanvasEvent, Func>> = {
		click: (e: PointerEvent, shape: ShapeInstance) => {
			if (shape.isInShapeRange(e)) {
				eventMap?.click?.(shape, e);
			}
		},
		rightClick: (e: PointerEvent, shape: ShapeInstance) => {
			if (e.button === 2) {
				if (shape.isInShapeRange(e)) {
					eventMap?.rightClick?.(shape, e);
				}
			}
		},
		mousemove: (e: PointerEvent, shape: ShapeInstance) => {
			if (shape.isInShapeRange(e)) {
				shape.setState({ inRange: true });
				onInternalMarkHover(e);
				eventMap?.mousemove?.(shape, e);
			}
		},
		mouseleave: (e: PointerEvent, shape: ShapeInstance) => {
			// if (shape.isInShapeRange(e)) {
			// 	shape.setState({ inRange: true });
			// }
			if (shape.state.inRange && !shape.isInShapeRange(e)) {
				shape.setState({ inRange: false });
				eventMap?.mouseleave?.(shape, e);
			}
		},
	};

	let eventMap = getMarkEvents(markInstance, markOptions);

	const onInternalMarkHover = (e: Event) => {
		if (!getCanvasCursor(canvas) || getCanvasCursor(canvas) === 'default') {
			setCanvasCursor(canvas, 'pointer', true);
		}
	};

	const onInternalMarkNoHover = (e: Event) => {
		if (getCanvasCursor(canvas) === 'pointer') {
			setCanvasCursor(canvas, 'default', true);
		}
		markOptions.onMarkNoHover?.(e);
		markInstance.emit('markNoHover', [e]);
	};

	const handler = (e: Event, eventName: CanvasEvent) => {
		// FIXED 优化性能，只获取可视页的图形
		const shapes: ShapeInstance[] = [];
		getInternalPagesByVisible().forEach(internalPage => {
			shapes.push(...getPageState(internalPage.i));
		});

		let noHover = true;
		for (const shape of shapes) {
			// 恢复冒泡
			shape.restorePropagation();
			// 触发事件
			EventValidatorMap[eventName]?.(e, shape);

			if (shape.state.inRange) {
				noHover = false;
			}
			// 如果已经阻止冒泡，就退出
			if (!shape.state.canEmitEvent) break;
		}
		if (noHover) {
			onInternalMarkNoHover(e);
		}
	};

	const init = () => {
		eventMap = getMarkEvents(markInstance, markOptions);
		for (const key in MarkEventsMap) {
			on(MarkEventsMap[key], e => handler(e, key as CanvasEvent));
		}
		// 阻止右键默认行为
		on('contextmenu', e => e.preventDefault());
	};

	const destroy = () => {
		off();
	};

	return { init, destroy };
};
