import { Func, MarkInternalParams, MarkOptions, PageItem, RectSidePosition, RectStandardPosition, ShapeInstance } from '../types';
import { InternalPage, genInternalPage } from '../utils/page';
import { getCanvasPositionBy2d, getRectPositionBy2d, getScaleBy2d, getTransformBy2d, isRectVisible, isRectVisibleMiddle } from '../utils/util';
import { useScrollIntoView } from '../utils/useScrollIntoView';
import { usePageMarkState } from './draw/usePageMarkState';
import { getMarkEvents, useGlobalEvents } from './useGlobalEvents';
import { useDrawMark } from './useDrawMark';
import { useGlobalActive } from './useGlobalActive';
import { doAsyncFuncImmediately } from '../utils/doAsyncFuncImmediately';
import { MarkInstance } from './mark';

type MultiPageOptions = {
	markOptions: MarkOptions;
	markParams: MarkInternalParams;
	markInstance: MarkInstance;
	resetContainerRect: () => void;
	updateContainerRect: (internalPage: InternalPage<PageItem>, isLast: boolean) => void;
	updateTranslate: (translate: [number, number]) => void;
	render: Func<[boolean?], void>;
	getLastScale: Func<[], [number, number]>;
} & ReturnType<typeof useScrollIntoView>;

export const useMultiPage = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, options: MultiPageOptions) => {
	// 多页索引从1开始
	let pageIndex = 1;
	const getPageIndex = () => pageIndex;
	const setPageIndex = (index: number) => (pageIndex = index);
	const getPages = () => markParams.pages || [];
	const getPageByIndex = (index: number) => getPages()[index - 1];
	const {
		markParams,
		markOptions,
		markInstance,
		updateContainerRect,
		resetContainerRect,
		updateTranslate,
		getLastScale,
		render,
		scrollIntoView,
		scrollBehaviorY,
	} = options;

	const internalPagesMap = new WeakMap<PageItem, InternalPage<PageItem>>();
	// 默认当前页
	const getInternalPage = (internalPage: InternalPage<PageItem> | number = getPageIndex()) => {
		if (typeof internalPage === 'number') {
			internalPage = getInternalPageByIndex(internalPage) as InternalPage<PageItem>;
		}
		return internalPage;
	};
	const getInternalPageByPageItem = (page: PageItem) => {
		return internalPagesMap.get(page);
	};
	const getInternalPageByIndex = (index: number) => {
		const page = getPageByIndex(index);
		return getInternalPageByPageItem(page);
	};

	const calcPageIndexAndChangePage = (internalPage: InternalPage<PageItem>) => {
		if (isRectVisibleMiddle(canvas, internalPage)) {
			commandPage(internalPage);
		}
	};
	const getPagesByVisible = () => {
		return visibleArrayOfInternalPage.map(internalPage => internalPage.item);
	};

	const getInternalPagesByVisible = () => {
		return visibleArrayOfInternalPage;
	};

	const getPageByPoint = ([x, y]: [number, number]) => {
		// 小于 0， 返回空
		if (y < 0) return 1;
		const top = y;
		const pages = getPages();
		for (const pageItem of pages) {
			const internalPage = internalPagesMap.get(pageItem);
			if (!internalPage) continue;
			if (internalPage.top > top) return Math.max(1, internalPage.i - 1);
		}
		// 没有就返回最后一页
		return pages.length;
	};

	const commandPage = (internalPage: InternalPage<PageItem> | number, emit = true) => {
		internalPage = getInternalPage(internalPage);
		if (!internalPage) return;

		if (pageIndex === internalPage.i) return;

		pageIndex = internalPage.i;

		if (emit) {
			markOptions.onChangePage?.(pageIndex, internalPage.item);
			markInstance.emit('changePage', [pageIndex, internalPage.item]);
		}
	};

	const changePage = (internalPage: InternalPage<PageItem> | number, intoView = true, emit = true) => {
		commandPage(internalPage, emit);

		if (intoView) {
			scrollToPage(internalPage);
		}

		render(true);
	};

	const scrollToPage = (internalPage: InternalPage<PageItem> | number) => {
		const [translateX] = getTransformBy2d(canvas);
		const [scaleX, scaleY] = getScaleBy2d(canvas);
		internalPage = getInternalPage(internalPage);
		const diff = markParams.multiple ? (internalPage.i === 1 ? markParams.margin : markParams.gap) : markParams.margin;
		updateTranslate([translateX, -internalPage.top * scaleY + diff]);
	};

	const { setActive, getActive } = useGlobalActive();

	const {
		destroy: destroyDrawState,
		getPageState,
		setPageState,
		removePageState,
		renderPageState,
		updatePageState,
		queryState,
		queryAllState,
		removeSelector,
		addSelector,
	} = usePageMarkState(canvas, {
		getInternalPage,
		updateShapeState: (...args: [any, any]) => updateShapeState(...args),
	});

	const {
		destroy: destroyDrawMark,
		drawRect,
		drawPolygon,
		drawBadge,
		removeShape,
		drawInternalPageBgImage,
		updateShapeState,
		removePageBgImageState,
		transformPositionByPageRect,
		transformPositionByPagePolygon,
	} = useDrawMark(canvas, ctx, {
		markOptions,
		markParams,
		markInstance,
		getInternalPageByIndex,
		getInternalPage,
		changePage,
		scrollToMark: scrollIntoView,
		getPageIndex,
		getPages,
		render,
		setPageState,
		removePageState,
		queryState,
		queryAllState,
		setActive,
		getActive,
		removeSelector,
		addSelector,
	});

	const { init: globalEventsInit, destroy: globalEventsDestroy } = useGlobalEvents(canvas, {
		markInstance,
		markOptions,
		getPageIndex,
		getPageState,
		getPages,
		getInternalPagesByVisible,
	});

	// 生成内部数据
	const genInternalPages = () => {
		removePageBgImageState();
		resetContainerRect();

		let prevInternalPage: InternalPage<PageItem> | undefined;
		const pages = getPages();
		for (let i = 0; i < pages.length; i++) {
			const pageItem = getPageByIndex(i + 1);
			const currInternalPage = internalPagesMap.get(pageItem);
			const isLast = i === pages.length - 1;
			// 生成内部数据
			const internalPage = genInternalPage(pageItem, i + 1, currInternalPage, prevInternalPage, markParams, isLast);
			internalPagesMap.set(pageItem, internalPage);
			prevInternalPage = internalPage;

			// 更新总视图窗口
			updateContainerRect(internalPage, isLast);
			updatePageState(internalPage);
		}
	};

	const drawState = (internalPage: InternalPage<PageItem>) => {
		// 渲染图形
		if (imgLoadedRecord[internalPage.i]) {
			drawInternalPageBgImage(internalPage);
			renderPageState(internalPage);
		} else {
			markOptions.onImageLoading?.(internalPage.i, internalPage.item);
			markInstance.emit('imageLoading', [internalPage.i, internalPage.item]);
			drawInternalPageBgImage(internalPage).then(() => {
				markOptions.onImageLoaded?.(internalPage.i, internalPage.item);
				markInstance.emit('imageLoaded', [internalPage.i, internalPage.item]);
				if (!imgLoadedRecord[internalPage.i]) {
					markOptions.onFirstRendered?.(internalPage.i, internalPage.item);
					markInstance.emit('firstRendered', [internalPage.i, internalPage.item]);
				}
				imgLoadedRecord[internalPage.i] = true;
				renderPageState(internalPage);
			});
		}
	};

	const drawPageBySingleMode = async () => {
		visibleArrayOfInternalPage.length = 0;

		const page = getPageByIndex(pageIndex);
		const internalPage = internalPagesMap.get(page) as InternalPage<PageItem>;
		// 更新视图窗口
		resetContainerRect();
		updateContainerRect(internalPage, true);

		visibleArrayOfInternalPage.push(internalPage);

		drawState(internalPage);
	};

	const findVisiblePageIndex = () => {
		const pages = getPages();
		let start = 0;
		let end = pages.length;
		let mid = 0;
		const { top: canvasTop, height: canvasBottom } = getCanvasPositionBy2d(canvas);
		let count = 0;
		while (start < end) {
			mid = ~~((start + end) / 2);
			const page = getPageByIndex(mid + 1);
			const internalPage = internalPagesMap.get(page) as InternalPage<PageItem>;
			const { top: scaledRectTop, bottom: scaledRectBottom } = getRectPositionBy2d(canvas, internalPage);
			if (scaledRectTop > canvasBottom) {
				end = mid;
			} else if (scaledRectBottom < canvasTop) {
				start = mid;
			} else if (scaledRectBottom >= canvasTop && scaledRectTop <= canvasBottom) {
				break;
			}
			// 设置上限
			if (++count === 30000) {
				console.log('Infinite loop...');
				break;
			}
		}
		return mid;
	};

	const collectVisibleInternalPage = (visiblePageIndex: number) => {
		const pages = getPages();
		const { top: canvasTop, height: canvasBottom } = getCanvasPositionBy2d(canvas);

		const pageIndexCache = new Map<number, boolean>();
		const dfs = (i: number) => {
			if (pageIndexCache.get(i)) return;
			const page = getPageByIndex(i + 1);
			const internalPage = internalPagesMap.get(page) as InternalPage<PageItem>;
			const { top: scaledRectTop, bottom: scaledRectBottom } = getRectPositionBy2d(canvas, internalPage);
			if (scaledRectBottom >= canvasTop && scaledRectTop <= canvasBottom) {
				pageIndexCache.set(i, true);
				visibleArrayOfInternalPage.push(internalPage);
				// 按页排序
				visibleArrayOfInternalPage.sort((a, b) => a.i - b.i);
				i > 0 && dfs(i - 1);
				i < pages.length - 1 && dfs(i + 1);
			}
		};

		dfs(visiblePageIndex);
	};

	const imgLoadedRecord: boolean[] = [];
	const drawPageByMultiMode = async () => {
		visibleArrayOfInternalPage.length = 0;
		const mid = findVisiblePageIndex();
		collectVisibleInternalPage(mid);

		const arr = visibleArrayOfInternalPage;
		for (let i = 0; i < arr.length; i++) {
			const internalPage = arr[i];

			// 计算当前位置是第几页
			calcPageIndexAndChangePage(internalPage);

			drawState(internalPage);
		}
	};

	const visibleArrayOfInternalPage: InternalPage<PageItem>[] = [];

	const drawPage = async (waitPromise = false) => {
		let promise: Promise<any> | undefined;
		if (markParams.multiple) {
			promise = drawPageByMultiMode();
		} else {
			promise = drawPageBySingleMode();
		}
	};

	const init = () => {
		pageIndex = 1;
		genInternalPages();
		globalEventsDestroy();
		globalEventsInit();
	};

	const update = () => {
		genInternalPages();
		markInstance.emit('update', getPages());
	};
	const destroy = () => {
		imgLoadedRecord.length = 0;
		destroyDrawMark();
		destroyDrawState();
		globalEventsDestroy();
	};

	return {
		init,
		update,
		destroy,
		getPageIndex,
		getPagesByVisible,
		getPageByPoint,
		changePage,
		drawPage,
		drawRect,
		drawPolygon,
		drawBadge,
		/**
		 * deprecated
		 */
		removeRect: removeShape,
		removeShape,
		getInternalPage,
		getInternalPagesByVisible,
		genInternalPages,
		/**
		 * deprecated
		 */
		scrollToMark: scrollIntoView,
		scrollIntoView,
		removePageState,
		updatePageState,
		getPageState,
		setPageState,
		transformPositionByPageRect,
		transformPositionByPagePolygon,
		queryState,
		queryAllState,
		setActive,
		getActive,
		addSelector,
		removeSelector,
	};
};
