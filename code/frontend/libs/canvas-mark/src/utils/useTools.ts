import { Func, MarkInternalParams, MarkOptions, RectSidePosition } from '@/types';
import { MouseMoveInstance, useMouseMove } from './useMouseMove';
import { ScrollMoveInstance, ScrollMoveOptions, useScrollMove } from './useScrollMove';
import { ZoomInstance, ZoomOptions, useZoom } from './useZoom';
import { setCanvasCursor } from './canvas';
import { getScaleBy2d, getTransformBy2d } from './util';
import { hasVerticalScroll } from './useScrollbar';

export type ToolsOptions = {
	markParams: MarkInternalParams;
	markOptions: MarkOptions;
	disableScroll?: boolean;
	disableZoom?: boolean;
	disableMove?: boolean;
	getTranslate: Func<[], [number, number]>;
	scrollToolOptions?: ScrollMoveOptions;
	zoomOptions: Partial<ZoomOptions>;
	getContainerRect: Func<[], RectSidePosition>;
	updateTranslate: Func<[[number, number]]>;
	updateScale: Func<[[number, number]]>;
	scrollBehaviorY: (end: [number, number], start?: [number, number]) => void;
	render: () => void;
	onScroll: (newV: [number, number], oldV: [number, number]) => void;
	onDrag: (newV: [number, number], oldV: [number, number]) => void;
	onZoom: () => void;
};

export type ToolsInstance = ReturnType<typeof useTools>;

export const useTools = (canvas: HTMLCanvasElement, options: ToolsOptions) => {
	const {
		updateTranslate: updateTranslateWithoutTool,
		updateScale: updateScaleWithoutTool,
		render,
		getTranslate,
		scrollToolOptions,
		zoomOptions,
		scrollBehaviorY,
		getContainerRect,
		onScroll,
		onDrag,
		onZoom,
		markOptions,
		markParams,
	} = options;
	let scrollInstance: ScrollMoveInstance | null = null;
	let moveInstance: MouseMoveInstance | null = null;
	let zoomInstance: ZoomInstance | null = null;

	const init = () => {
		if (!options.disableScroll)
			scrollInstance = useScrollMove(canvas, {
				...scrollToolOptions,
				getMin: () => 0,
				getMax: () => {
					const [scaleX, scaleY] = getScaleBy2d(canvas);
					return getContainerRect().bottom / scaleY + markParams.margin;
				},
				onBeforeMove(e: WheelEvent) {
					if (e.altKey) return false;
					const [translateX, translateY] = getTransformBy2d(canvas);
					// 总高度小于canvas高度，禁用滚动
					if (translateY === 0 && !hasVerticalScroll(canvas, markParams, getContainerRect())) {
						return false;
					}
				},
				onMove: (e: MouseEvent, currentTranslate: [number, number], prevTranslate: [number, number]) => {
					if (!scrollInstance || !zoomInstance) return;
					updateScaleWithoutTool(zoomInstance.getScale());
					updateTranslateWithoutTool(currentTranslate);
					render();
					onScroll?.(currentTranslate, prevTranslate);
				},
			});

		if (!options.disableMove)
			moveInstance = useMouseMove(canvas, {
				shortcut: 'Space + 鼠标左键',
				onMoveStart() {
					setCanvasCursor(canvas, 'grab', true);
				},
				onMoveEnd() {
					setCanvasCursor(canvas, 'default', true);
				},
				onMove: (currentTranslate: [number, number], prevTranslate: [number, number]) => {
					setCanvasCursor(canvas, 'grabbing', true);
					if (!moveInstance || !zoomInstance) return;
					updateTranslateWithoutTool(moveInstance.getTranslate());
					updateScaleWithoutTool(zoomInstance.getScale());
					render();
					onDrag?.(currentTranslate, prevTranslate);
				},
			});

		if (!options.disableZoom)
			zoomInstance = useZoom(canvas, {
				shortcut: 'Alt + 鼠标滚轮',
				...(zoomOptions || {}),
				onZoom: () => {
					if (!zoomInstance) return;
					updateTranslateWithoutTool(zoomInstance.getTranslate());
					updateScaleWithoutTool(zoomInstance.getScale());
					render();
					onZoom?.();
				},
			});
	};

	const syncTranslate = (translate: [number, number]) => {
		scrollInstance?.updateTranslate(translate);
		moveInstance?.updateTranslate(translate);
		zoomInstance?.updateTranslate(translate);
	};

	const updateScale = (scale: [number, number]) => {
		zoomInstance?.setScale(scale);
	};

	const destroy = () => {
		scrollInstance?.destroy();
		moveInstance?.destroy();
		zoomInstance?.destroy();
	};

	return {
		updateTranslate: syncTranslate,
		updateScale,
		init,
		destroy,
		setScaleByRadio: (...args: Parameters<ZoomInstance['setScaleByRadio']>) => zoomInstance?.setScaleByRadio(...args),
		setScaleAndZoom: (...args: Parameters<ZoomInstance['setScaleAndZoom']>) => zoomInstance?.setScaleAndZoom(...args),
	};
};
