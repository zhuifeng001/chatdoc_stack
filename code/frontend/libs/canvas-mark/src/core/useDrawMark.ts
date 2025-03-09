import { useIdlePromise } from './../utils/canvas';
import {
	CanvasImageOptions,
	CanvasBadgeOptions,
	CanvasBadgeInstance,
	CanvasRectInstance,
	CanvasRectOptions,
	MarkInternalParams,
	MarkOptions,
	Func,
	RectStandardPosition,
	ShapeInstance,
	PageItem,
	CanvasPolygonOptions,
	CanvasPolygonInstance,
	CanvasImageInstance,
	ShapeOptions,
} from '../types';
import { MarkDrawShapeOptions, MarkDrawShapeParams, MarkDrawBadgeOptions, MarkScrollIntoViewOptions } from '../types/draw';
import { InternalPage, inverseShapeRealPosition, transformShapeActualPosition } from '../utils/page';
import { convertRectByPosition, convertPositionByRect } from '../utils/util';
import { useImage } from './draw/useImage';
import { RemovePageStateOptions } from './draw/usePageMarkState';
import { useBadgeInternal } from './draw/useBadgeInternal';
import { useRectInternal } from './draw/useRectInternal';
import { isNumber } from 'lodash-es';
import { usePolygonInternal } from './draw/usePolygonInternal';
import { MarkInstance } from './mark';
import { loadImage } from '../utils/useMarkUtil';
import { useImageInternal } from './draw/useImageInternal';

type DrawShapeOptions = {
	markOptions: MarkOptions;
	markParams: MarkInternalParams;
	markInstance: MarkInstance;
	getInternalPage: Func<[(InternalPage<PageItem> | number)?], InternalPage<PageItem>>;
	getInternalPageByIndex: Func<[number], InternalPage<PageItem> | undefined>;
	render: Func;
	getPageIndex: Func<[], number>;
	getPages: Func<[], PageItem[]>;
	changePage: Func<[InternalPage<PageItem>, boolean?], void>;
	scrollToMark: Func<[RectStandardPosition, MarkScrollIntoViewOptions?], void>;
	setPageState: Func<[ShapeInstance, InternalPage<PageItem>, boolean?], void>;
	removePageState: Func<[ShapeInstance?, InternalPage<PageItem>?, RemovePageStateOptions?], void>;
	queryState: Func<[number | string], ShapeInstance | undefined>;
	queryAllState: Func<[(number | string)?], ShapeInstance[] | undefined>;
	setActive: Func<[any], void>;
	getActive: Func<[], any>;
	removeSelector: Func<[ShapeInstance, string], void>;
	addSelector: Func<[ShapeInstance, string], void>;
};

export const useDrawMark = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, options: DrawShapeOptions) => {
	const {
		markParams,
		markOptions,
		markInstance,
		getInternalPageByIndex,
		getInternalPage,
		changePage,
		render,
		scrollToMark,
		setPageState,
		removePageState,
		removeSelector,
		addSelector,
		queryState,
		queryAllState,
		getPageIndex,
		getPages,
		setActive,
		getActive,
	} = options;

	// 背景图片不保存在 state 中
	const bgImageStateMap = new Map<string, CanvasImageInstance>();
	const removePageBgImageState = () => {
		// markOptions.pages?.forEach((page, i) => {
		// 	// const state = queryState(`bg-image-${String(i + 1)}`);
		// 	// const internalPage = getInternalPageByIndex(i + 1);
		// 	// state && removePageState(state, internalPage, { type: 'image' });
		// 	const id = `bg-image-${String(i + 1)}`;
		// 	const state = bgImageStateMap.get(id);
		// 	state && bgImageStateMap.delete(id);
		// });
		[...bgImageStateMap.values()].forEach(shape => {
			shape.destroy(false);
		});
		bgImageStateMap.clear();
	};

	const preloadImage = (index: number) => {
		const prevInternalPage = getInternalPage(index);
		if (!prevInternalPage) return;
		loadImage(
			prevInternalPage.item.getUrl || (prevInternalPage.item.url as string),
			prevInternalPage.item.getUrlHeader,
			prevInternalPage.item.formatUrl,
			markOptions.enableWorker
		);
	};

	const preload = (pageIndex: number) => {
		const preloadNum = markParams.preloadImageNum;
		const len = getPages().length;
		const start = Math.max(1, pageIndex - preloadNum);
		const end = Math.min(len, pageIndex + preloadNum);
		let i = pageIndex - 1;
		let j = pageIndex + 1;
		while (i > start || j < end) {
			i > 0 && preloadImage(i);
			j <= len && preloadImage(j);
			i--;
			j++;
		}
	};

	const preloadImages = () => {
		const pageIndex = getPageIndex();

		// 不用加载当前页
		// preloadImage(pageIndex);
		// 缓冲加载其他页
		useIdlePromise(() => {
			preload(pageIndex);
		});
	};

	const drawInternalPageBgImage = async (internalPage: InternalPage<PageItem>) => {
		const imageOptions: CanvasImageOptions = {
			src: internalPage.item.getUrl || (internalPage.item.url as string),
			getUrlHeader: internalPage.item.getUrlHeader,
			formatUrl: internalPage.item.formatUrl,
			enableWorker: markOptions.enableWorker,
			type: 'image',
			border: markParams.backgroundImageBorder,
			...internalPage,
			angle: (internalPage.item.imageAngle || 0) + internalPage.angle,
			id: `bg-image-${String(internalPage.i)}`,
			selector: ['.bg-image'],
			unshift: true, // 优先渲染
			first: internalPage.i === 1,
			last: internalPage.i === getPages().length,
		};
		// let imageInstance = queryState(imageOptions.id as string);
		// if (!imageInstance) {
		// 	imageInstance = useImage(canvas, ctx, imageOptions);
		// 	setPageState(imageInstance, internalPage);
		// }
		let imageInstance = bgImageStateMap.get(imageOptions.id as string);
		if (!imageInstance) {
			imageInstance = useImageInternal(canvas, ctx, imageOptions, {
				markOptions,
				markParams,
				markInstance,
			});
			bgImageStateMap.set(imageOptions.id as string, imageInstance);
			setPageState(imageInstance, internalPage);
		}
		await imageInstance.render();

		preloadImages();
	};

	const renderShape = (rectInstance: ShapeInstance) => {
		// 只渲染可视区域的图形
		if (!rectInstance.isVisible()) return rectInstance;
		rectInstance.render();
		markOptions.onDrawComplete?.(rectInstance);
		markInstance.emit('drawComplete', [rectInstance]);
	};

	const drawShape = <T extends ShapeInstance>(createShape: Func, originData: MarkDrawShapeOptions, options?: MarkDrawShapeParams) => {
		if (!originData?.position?.length) return;
		const internalPage = getInternalPageByIndex(originData.index || getPageIndex());

		let rectInstance: T | undefined;
		if (internalPage) {
			rectInstance = createShape(originData.position, internalPage.i, originData.options);
			if (!rectInstance) return;

			if (options?.visible != null) {
				rectInstance.setState({ visible: options.visible });
			}

			rectInstance.setState({ data: originData?.data });

			renderShape(rectInstance);
		}
		return rectInstance;
	};

	const drawRect = (originData: MarkDrawShapeOptions, options?: MarkDrawShapeParams): CanvasRectInstance | undefined => {
		return drawShape(createExternalRectState, originData, options);
	};
	const drawPolygon = (originData: MarkDrawShapeOptions, options?: MarkDrawShapeParams): CanvasPolygonInstance | undefined => {
		return drawShape(createExternalPolygonState, originData, options);
	};

	const focusRect = (idOrSelector: string) => {
		const shapeInstances = queryAllState(idOrSelector);
		if (shapeInstances) {
			shapeInstances.forEach(shape => shape.activated());
			shapeInstances[0].activated();
		}
	};

	const drawBadge = (originData: MarkDrawShapeOptions, options?: MarkDrawShapeParams): CanvasBadgeInstance | undefined => {
		return drawShape(createExternalBadgeState, originData, options);
	};

	const removeShape = (index: number | RemovePageStateOptions) => {
		if (isNumber(index)) {
			removePageState(undefined, getInternalPageByIndex(index));
		} else {
			removePageState(undefined, undefined, index);
		}
	};

	const createExternalRectState = (position: number[], index: number, customRectOptions?: Partial<CanvasRectOptions>) => {
		const internalPage = getInternalPageByIndex(index);
		if (!internalPage) return;
		const prevInternalPage = getInternalPageByIndex(internalPage.i - 1);
		const actualPosition = transformShapeActualPosition(position, internalPage, prevInternalPage, markParams);
		const rectOptions: CanvasRectOptions = {
			position: actualPosition,
			...convertRectByPosition(actualPosition),
			type: 'rect',
			strokeStyle: '#1a66ff',
			fillStyle: 'rgba(72, 119, 255, 0.1)',
			angle: internalPage.angle,
			...customRectOptions,
			_rate: internalPage.rate,
		};
		const rectInstance = useRectInternal(canvas, ctx, rectOptions, {
			markParams,
			markOptions,
			markInstance,
			setup(instance) {
				instance.setState({ position, index });
			},
		});
		setPageState(rectInstance, internalPage);
		return rectInstance;
	};

	const createExternalPolygonState = (position: number[], index: number, customPolygonOptions?: Partial<CanvasPolygonOptions>) => {
		const internalPage = getInternalPageByIndex(index);
		if (!internalPage) return;
		const prevInternalPage = getInternalPageByIndex(internalPage.i - 1);
		const actualPosition = transformShapeActualPosition(position, internalPage, prevInternalPage, markParams);
		const rect = convertRectByPosition(actualPosition);
		const polygonOptions: CanvasPolygonOptions = {
			type: 'polygon',
			position: actualPosition,
			...rect,
			strokeStyle: '#1a66ff',
			fillStyle: 'rgba(72, 119, 255, 0.1)',
			angle: internalPage.angle,
			...customPolygonOptions,
			_rate: internalPage.rate,
		};
		const rectInstance = usePolygonInternal(canvas, ctx, polygonOptions, {
			markParams,
			markOptions,
			markInstance,
			setup(instance) {
				instance.setState({ position, index });
			},
		});
		setPageState(rectInstance, internalPage);
		return rectInstance;
	};

	const createExternalBadgeState = (position: number[], index: number, customBadgeOptions?: Partial<CanvasBadgeOptions>) => {
		const internalPage = getInternalPageByIndex(index);
		if (!internalPage) return;
		const prevInternalPage = getInternalPageByIndex(internalPage.i - 1);
		const actualPosition = transformShapeActualPosition(position, internalPage, prevInternalPage, markParams);
		const rect = convertRectByPosition(actualPosition);
		const badgeOptions: CanvasBadgeOptions = {
			type: 'badge',
			position: actualPosition,
			...rect,
			strokeStyle: '#1a66ff',
			fillStyle: 'rgba(72, 119, 255, 0.1)',
			angle: internalPage.angle,
			...customBadgeOptions,
			_rate: internalPage.rate,
		};
		const rectInstance = useBadgeInternal(canvas, ctx, badgeOptions, {
			markParams,
			markOptions,
			markInstance,
			setup(instance) {
				instance.setState({ position, index });
			},
		});
		setPageState(rectInstance, internalPage);
		return rectInstance;
	};

	const transformPositionByPageRect = <T extends RectStandardPosition>(rectOptions: T, index: number = getPageIndex()) => {
		return transformPositionByPagePolygon(convertPositionByRect(rectOptions), index);
	};

	const transformPositionByPagePolygon = (position: number[], index: number = getPageIndex()) => {
		const internalPage = getInternalPageByIndex(index);
		if (!internalPage) return;

		const prevInternalPage = getInternalPageByIndex(internalPage.i - 1);
		return inverseShapeRealPosition(position, internalPage, prevInternalPage, markParams);
	};

	const updateShapeState = (shapeInstance: ShapeInstance, index: number) => {
		const internalPage = getInternalPageByIndex(index);
		if (!internalPage) return;

		const position = shapeInstance.state.position;
		if (!position) return;

		const prevInternalPage = getInternalPageByIndex(internalPage.i - 1);

		if (shapeInstance.options.type === 'polygon' || shapeInstance.options.type === 'badge') {
			const instance = shapeInstance as CanvasPolygonInstance;
			const actualPosition = transformShapeActualPosition(position, internalPage, prevInternalPage, markParams);
			const rect = convertRectByPosition(actualPosition);
			const polygonOptions: CanvasPolygonOptions = {
				...instance.options,
				position: actualPosition,
				...rect,
				_rate: internalPage.rate,
			};
			instance.updateOptions(polygonOptions);
			if (instance.options.angle) {
				instance.setState({ angle: 0 });
				instance.rotate(instance.options.angle, false);
			}
		} else {
			const instance = shapeInstance as CanvasRectInstance;
			const rect = convertRectByPosition(transformShapeActualPosition(position, internalPage, prevInternalPage, markParams));
			const rectOptions: CanvasRectOptions = {
				...instance.options,
				...rect,
			};
			instance.updateOptions(rectOptions);
			if (instance.options.angle) {
				instance.setState({ angle: 0 });
				instance.rotate(instance.options.angle, false);
			}
		}

		return shapeInstance;
	};

	const destroy = () => {
		bgImageStateMap.clear();
	};

	return {
		destroy,
		drawInternalPageBgImage,
		removeShape,
		drawBadge,
		drawRect,
		drawPolygon,
		createExternalRectState,
		updateShapeState,
		transformPositionByPageRect,
		transformPositionByPagePolygon,
		removePageBgImageState,
	};
};
