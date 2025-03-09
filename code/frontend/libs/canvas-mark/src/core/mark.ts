import { Func, PageItem, RectStandardPosition, RenderMode, ShapeInstance } from '../types';
import { clearCanvas, createCanvas, getNode, setCanvasCursor, setCanvasRectByRatio } from '../utils/canvas';
import { InternalPage } from '../utils/page';
import { imageCache } from '../utils/useMarkUtil';
import { ToolsInstance, useTools } from '../utils/useTools';
import { getDefaultScale, getRectPositionBy2d, getScaleBy2d, getTransformBy2d, transformActualPoint } from '../utils/util';
import { CanvasRectOptions, MarkInternalParams, MarkOptions, RectSidePosition } from '../types';
import { useRenderMode } from './useMode';
import { useMultiPage } from './useMultiPage';
import { useScrollbar } from '../utils/useScrollbar';
import { useDrawRect } from '../plugins/useDrawRect';
import { useScrollIntoView } from '../utils/useScrollIntoView';
import { useCopyText } from '../plugins/useCopyText';
import { useDraw } from '../plugins/useDraw';
import { MarkPlugin } from '../plugins';
import { useDragShape } from '../plugins/useDragShape';
import { AnimationProps, useAnimation, AnimationKeyframeOptions } from './useAnimation';
import { keepDecimalBit } from '../utils/number';
import { getDevicePixelRatio } from '../utils/device';
import { useRotate } from './useRotate';
import { useResizeListener } from '../utils/dom';
import createEventEmitter from 'mitt';

// 仅支持浏览器
if (typeof window !== 'undefined') {
	import('@netless/canvas-polyfill');
}

export type MarkInstance = ReturnType<typeof createMark>;

export type MultiPageInstance = ReturnType<typeof useMultiPage>;

export type MarkInitOptions = {
	mode?: RenderMode;
	translate?: [number, number];
	scale?: [number, number];
};

export const createMark = (options: MarkOptions) => {
	let params: MarkInternalParams;
	const syncParams = () => {
		const newParams = {
			markOptions: options,
			pages: [],
			getLocation: params?.getLocation,
			mode: options.mode || 'default',
			width: 0,
			height: 0,
			backgroundColor: '',
			...options,
			backgroundImageBorder: options.backgroundImageBorder,
			enableCopyText: options.enableCopyText ?? false,
			enableWorker: options.enableWorker ?? true,
			margin: options.margin ?? 20,
			padding: options.padding ?? 20,
			gap: options.gap ?? 20,
			modeOfMaxHeightOptions: options.modeOfMaxHeightOptions || { scrollTop: 0 },
			multiple: options.multiple ?? true,
			preloadImageNum: options.preloadImageNum ?? 3,
			minScale: options.minScale || 0.1,
			maxScale: options.maxScale || 10,
			disableScroll: options.disableScroll ?? false,
			disableZoom: options.disableZoom ?? false,
			disableMove: options.disableMove ?? false,
			scrollbarVerticalClassName: options.scrollbarVerticalClassName || 'scroll-bar',
			scrollbarHorizontalClassName: options.scrollbarHorizontalClassName || 'scroll-bar',
			plugins: [
				options.enableCopyText && useCopyText, //
				useDraw,
				...(options.plugins || []),
			].filter(Boolean) as MarkPlugin[],
			getMarkInstance: () => markInstance,
		};
		if (!params) return newParams;
		Object.assign(params, newParams);
		setMode(params.mode, false);
		return params;
	};

	// 默认值
	params = syncParams();

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D;

	const eventEmitter = createEventEmitter();

	let containerResizeDestroy: Func | undefined;
	const setContainerRect = () => {
		const targetNode = getNode(options.selector);

		if (targetNode == null) {
			throw new Error('selector is not exist');
		}

		containerResizeDestroy = useResizeListener(
			targetNode,
			() => {
				params.width = options.width ?? targetNode.offsetWidth;
				params.height = options.height ?? targetNode.offsetHeight;
			},
			{ enableFrame: true }
		);

		params.width = options.width ?? targetNode.offsetWidth;
		params.height = options.height ?? targetNode.offsetHeight;
		return targetNode;
	};

	const createContainer = () => {
		const targetNode = setContainerRect();

		if (canvas) {
			setCanvasRectByRatio(canvas, params.width, params.height);
		} else {
			canvas = createCanvas({
				width: params.width,
				height: params.height,
			});
			targetNode.appendChild(canvas);
		}

		ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
		ctx.translate(lastTranslate[0], lastTranslate[1]);
		ctx.scale(lastScale[0], lastScale[1]);

		if (ctx == null) {
			throw new Error('ctx is not exist');
		}
	};

	const containerRect: RectSidePosition = { left: 0, top: 0, right: 0, bottom: 0 };
	const getContainerRect = () => containerRect;
	const resetContainerRect = (emit = true) => {
		containerRect.left = 0;
		containerRect.top = 0;
		containerRect.right = 0;
		containerRect.bottom = 0;
		emit && options.onContainerSizeChange?.(containerRect, containerRect);
		scrollbarInstance?.resetContainerSize();
	};
	const updateContainerRect = (internalPage: InternalPage, isLast?: boolean) => {
		const [scaleX, scaleY] = getScaleBy2d(canvas);
		const left = internalPage.left * scaleX;
		const right = internalPage.right * scaleX;
		const top = internalPage.top * scaleY;
		const bottom = internalPage.bottom * scaleY;
		containerRect.left = containerRect.left === 0 ? Math.max(containerRect.left, left) : Math.min(containerRect.left, left);
		containerRect.top = containerRect.top === 0 ? Math.max(containerRect.top, top) : Math.min(containerRect.top, top);
		containerRect.right = Math.max(containerRect.right, right);
		containerRect.bottom = Math.max(containerRect.bottom, bottom);
		options.onContainerSizeChange?.(containerRect, getRectPositionBy2d(canvas, containerRect));
		if (isLast) {
			scrollbarInstance?.setVerticalRect(containerRect, { isLast });
			scrollbarInstance?.setVerticalScroll(lastTranslate);
		}
	};

	const lastTranslate: [number, number] = [0, 0];
	const getLastTranslate = () => lastTranslate;
	const resetTranslate = (emit = true) => {
		const prevTranslate = lastTranslate.slice() as [number, number];
		lastTranslate[0] = 0;
		lastTranslate[1] = 0;
		emit && options.onTranslateChange?.(lastTranslate, prevTranslate);
	};
	const updateTranslate = (translate: [number, number]) => {
		const prevTranslate = lastTranslate.slice() as [number, number];
		if (prevTranslate[0] === translate[0] && prevTranslate[1] === translate[1]) return;

		lastTranslate[0] = translate[0];
		lastTranslate[1] = translate[1];

		options.onTranslateChange?.(lastTranslate, prevTranslate);
		scrollbarInstance?.setVerticalScroll(lastTranslate);
	};
	const updateTranslateWithTool = (translate: [number, number]) => {
		updateTranslate(translate);
		toolInstance?.updateTranslate(translate);
	};

	const lastScale: [number, number] = getDefaultScale();
	const getLastScale = () => lastScale;
	const resetScale = (emit = true) => {
		const prevScale = lastScale.slice() as [number, number];
		const defaultScale = getDefaultScale();
		lastScale[0] = defaultScale[0];
		lastScale[1] = defaultScale[1];
		emit && options.onScaleChange?.(lastScale, prevScale);
	};
	const updateScale = (scale: [number, number]) => {
		const prevScale = lastScale.slice() as [number, number];
		if (keepDecimalBit(prevScale[0], 3) === keepDecimalBit(scale[0], 3) && keepDecimalBit(prevScale[1], 3) === keepDecimalBit(scale[1], 3)) return;

		lastScale[0] = scale[0];
		lastScale[1] = scale[1];

		options.onScaleChange?.(lastScale, prevScale);
	};
	const updateScaleWithTool = (scale: [number, number]) => {
		updateScale(scale);
		toolInstance?.updateScale(lastScale);
	};

	const draw = async (translate: [number, number], scale: [number, number], { waitPromise = false } = {}) => {
		if (!ctx) return;
		ctx.save();
		clearCanvas(canvas, ctx);
		const [xScale, yScale] = scale;
		const [translateX, translateY] = translate;
		ctx.translate(translateX, translateY);
		ctx.scale(xScale, yScale);
		if (params.backgroundColor) {
			ctx.fillStyle = params.backgroundColor;
			ctx.fillRect(-translateX / xScale, -translateY / yScale, canvas.width / xScale, canvas.height / yScale);
		}
		multiPageInstance?.drawPage(waitPromise);
		ctx.restore();
		updateScaleWithTool(getScaleBy2d(canvas));
		updateTranslateWithTool(getTransformBy2d(canvas));
	};

	const pluginDestroyFnCollection: Func[] = [];
	const setupPlugins = () => {
		if (params.plugins?.length) {
			destroyPlugins();
			params.plugins.forEach((plugin, i) => {
				const pluginInstance = plugin({ canvas, ctx, markInstance, markOptions: options, markParams: params });
				const { init, destroy, name = plugin.name ?? `${i}` } = pluginInstance;
				markInstance.plugins[name] = pluginInstance;
				init?.();
				destroy && pluginDestroyFnCollection.push(destroy);
			});
		}
	};
	const destroyPlugins = () => {
		markInstance.plugins = {};
		pluginDestroyFnCollection.forEach(destroy => destroy());
		pluginDestroyFnCollection.length = 0;
	};

	let toolInstance: ToolsInstance | null;

	const initTool = () => {
		toolInstance = useTools(canvas, {
			markParams: params,
			markOptions: options,
			disableScroll: params.disableScroll,
			disableZoom: params.disableZoom,
			disableMove: params.disableMove,
			getTranslate: () => lastTranslate,
			getContainerRect,
			scrollBehaviorY: (...args) => scrollIntoViewInstance?.scrollBehaviorY(...args),
			updateTranslate,
			updateScale,
			render,
			onScroll: (newV, oldV) => options.onScroll?.(newV, oldV),
			onDrag: (newV, oldV) => options.onDrag?.(newV, oldV),
			zoomOptions: {
				getMin: () => params.minScale,
				getMax: () => params.maxScale,
			},
			onZoom: () => {
				multiPageInstance?.genInternalPages();
			},
		});
		toolInstance?.init();
	};

	let scrollbarInstance: ReturnType<typeof useScrollbar> | null;
	const initScrollbar = () => {
		if (!params.disableScroll)
			scrollbarInstance = useScrollbar({
				canvas,
				markParams: params,
				containerSelector: options.selector,
				getMarkInstance: () => markInstance,
				onScroll: (e: Event, translate) => {
					updateTranslateWithTool(translate);
					render();
				},
			});
	};

	let multiPageInstance: ReturnType<typeof useMultiPage> | null;
	const initMultiPage = () => {
		multiPageInstance = useMultiPage(canvas, ctx, {
			markOptions: options,
			markParams: params,
			markInstance,
			updateContainerRect,
			resetContainerRect,
			getLastScale,
			updateTranslate: updateTranslateWithTool,
			render,
			scrollIntoView: (...args: [any]) => scrollIntoViewInstance?.scrollIntoView(...args),
			scrollBehaviorY: (...args: [any]) => scrollIntoViewInstance?.scrollBehaviorY(...args) as Promise<void>,
		});
	};

	let scrollIntoViewInstance: ReturnType<typeof useScrollIntoView> | null;
	const initScrollIntoView = () => {
		scrollIntoViewInstance = useScrollIntoView(canvas, {
			getMin: () => containerRect?.top,
			getMax: () => containerRect?.bottom,
			render,
			updateTranslate: updateTranslateWithTool,
		});
	};

	const initData = () => {
		params.width = 0;
		params.height = 0;
		resetTranslate(false);
		resetScale(false);
		resetContainerRect(false);
	};

	const { getMode, setMode } = useRenderMode(params);
	const setModeAndReset = (mode: RenderMode) => {
		const prePageIndex = multiPageInstance?.getPageIndex();
		setMode(mode);
		reset();
		if (prePageIndex) {
			multiPageInstance?.changePage(prePageIndex, true);
		}
	};

	const initContainer = () => {
		initData();
		createContainer();
	};

	const init = async ({ mode, translate, scale }: MarkInitOptions = {}) => {
		initContainer();
		setMode(mode ?? params.mode, false);

		!scrollIntoViewInstance && initScrollIntoView();
		!scrollbarInstance && initScrollbar();
		scrollbarInstance?.init();
		!multiPageInstance && initMultiPage();
		multiPageInstance?.init();
		!toolInstance && initTool();

		setupPlugins();
		render(true); // 首次渲染，等待图片加载完成
	};

	const enableDrawShape = (options?: CanvasRectOptions) => {
		markInstance.plugins.Draw?.enable(options);
	};
	const cancelDrawShape = () => {
		markInstance.plugins.Draw?.disable();
	};

	const destroy = () => {
		destroyPlugins();
		toolInstance?.destroy();
		multiPageInstance?.destroy();
		scrollbarInstance?.destroy();
		canvas && (canvas.parentElement || canvas.parentNode)?.removeChild(canvas);
		canvas = null as any;
		ctx = null as any;
		toolInstance = null;
		multiPageInstance = null;
		scrollbarInstance = null;
		imageCache.clear();
		containerResizeDestroy?.();
	};

	const reset = () => {
		const scale: [number, number] = getDefaultScale();
		const translate: [number, number] = [0, 0];
		updateTranslateWithTool(translate);
		updateScaleWithTool(scale);
		multiPageInstance?.genInternalPages();
		render();
	};

	const render = (waitPromise = false) => {
		draw(lastTranslate, lastScale, { waitPromise });
	};

	const rerender = () => {
		const translate: [number, number] = lastTranslate;
		const preWidth = params.width;
		syncParams();
		createContainer();
		setMode(params.mode, false);
		const rate = params.width / preWidth;
		updateTranslateWithTool([translate[0] * rate, translate[1] * rate]);
		updateScaleWithTool(lastScale);

		// 重新渲染，不能清除 state
		multiPageInstance?.init();

		destroyPlugins();
		setupPlugins();

		render();
	};

	const updateOptions = (newOptions: Partial<MarkOptions>) => {
		options = Object.assign(options, newOptions);
		syncParams();
	};

	const updatePages = (newPages?: PageItem[]) => {
		if (newPages) {
			options.pages = newPages;
			params.pages = newPages;
		}

		multiPageInstance?.update();

		render();
	};

	const animate = (props: Omit<AnimationProps, 'render'>, options?: AnimationKeyframeOptions) =>
		useAnimation({ ...props, render } as AnimationProps, options);

	const rotate = (index?: number) => useRotate({ markInstance, markParams: params, index, getPageIndex: () => multiPageInstance?.getPageIndex() });

	const markInstance = {
		...eventEmitter,
		options,
		init,
		destroy,
		reset,
		render,
		rerender,
		rotate,
		enableDrawShape,
		cancelDrawShape,
		getCanvas() {
			return canvas;
		},
		getContainerRect: () => {
			const devicePixelRatio = getDevicePixelRatio();
			return {
				left: containerRect.left * devicePixelRatio,
				top: containerRect.top * devicePixelRatio,
				right: containerRect.right * devicePixelRatio,
				bottom: containerRect.bottom * devicePixelRatio,
			};
		},
		getTranslate: getLastTranslate,
		updateTranslate: updateTranslateWithTool,
		getScale: getLastScale,
		updateScale: updateScaleWithTool,
		animate,
		setMode: setModeAndReset,
		setScaleByRadio: (radio: number, radioOrigin?: [number, number]) => {
			const { width, height } = canvas.getBoundingClientRect();
			radioOrigin = radioOrigin || [width / 2, height / 2];
			toolInstance?.setScaleByRadio(radio, radioOrigin);
		},
		removeRect: (...args: Parameters<MultiPageInstance['removeRect']>) => multiPageInstance?.removeRect(...args),
		removeShape: (...args: Parameters<MultiPageInstance['removeShape']>) => multiPageInstance?.removeShape(...args),
		removePageState: (...args: Parameters<MultiPageInstance['removePageState']>) => multiPageInstance?.removePageState(...args),
		drawRect: (...args: Parameters<MultiPageInstance['drawRect']>) => multiPageInstance?.drawRect(...args),
		drawPolygon: (...args: Parameters<MultiPageInstance['drawPolygon']>) => multiPageInstance?.drawPolygon(...args),
		drawBadge: (...args: Parameters<MultiPageInstance['drawBadge']>) => multiPageInstance?.drawBadge(...args),
		getInternalPage: (...args: Parameters<MultiPageInstance['getInternalPage']>) => multiPageInstance?.getInternalPage(...args),
		getInternalPagesByVisible: (...args: Parameters<MultiPageInstance['getInternalPagesByVisible']>) =>
			multiPageInstance?.getInternalPagesByVisible(...args),
		genInternalPages: (...args: Parameters<MultiPageInstance['genInternalPages']>) => multiPageInstance?.genInternalPages(...args),
		changePage: (...args: Parameters<MultiPageInstance['changePage']>) => multiPageInstance?.changePage(...args),
		getPageState: (...args: Parameters<MultiPageInstance['getPageState']>) => multiPageInstance?.getPageState(...args),
		setPageState: (...args: Parameters<MultiPageInstance['setPageState']>) => multiPageInstance?.setPageState(...args),
		queryState: (...args: Parameters<MultiPageInstance['queryState']>) => multiPageInstance?.queryState(...args),
		queryAllState: (...args: Parameters<MultiPageInstance['queryAllState']>) => multiPageInstance?.queryAllState(...args),
		getActive: (...args: Parameters<MultiPageInstance['getActive']>) => multiPageInstance?.getActive(...args),
		setActive: (...args: Parameters<MultiPageInstance['setActive']>) => multiPageInstance?.setActive(...args),
		getPageByPoint: (...args: Parameters<MultiPageInstance['getPageByPoint']>) => multiPageInstance?.getPageByPoint(...args),
		getPageIndex: (...args: Parameters<MultiPageInstance['getPageIndex']>) => multiPageInstance?.getPageIndex(...args),
		addSelector: (...args: Parameters<MultiPageInstance['addSelector']>) => multiPageInstance?.addSelector(...args),
		removeSelector: (...args: Parameters<MultiPageInstance['removeSelector']>) => multiPageInstance?.removeSelector(...args),
		scrollIntoView: (...args: Parameters<MultiPageInstance['scrollIntoView']>) => multiPageInstance?.scrollIntoView(...args),
		transformPositionByPageRect: (...args: Parameters<MultiPageInstance['transformPositionByPageRect']>) =>
			multiPageInstance?.transformPositionByPageRect(...args),
		transformPositionByPagePolygon: (...args: Parameters<MultiPageInstance['transformPositionByPagePolygon']>) =>
			multiPageInstance?.transformPositionByPagePolygon(...args),
		getBoundingClientRect: () => {
			const DomRect = canvas.getBoundingClientRect();
			const devicePixelRatio = getDevicePixelRatio();
			// DomRect 为 DOMRect 实例，不可解构
			return Object.assign(DomRect, { actualWidth: DomRect.width * devicePixelRatio, actualHeight: DomRect.height * devicePixelRatio });
		},
		transformActualPoint: (point: number[]) => transformActualPoint(canvas, point),
		updatePages,
		updateOptions,
		plugins: {} as Record<string, any>,
	};

	return markInstance;
};
