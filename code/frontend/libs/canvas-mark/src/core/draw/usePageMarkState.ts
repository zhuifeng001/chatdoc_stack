import { PageItem, ShapeInstance, ShapeOptions } from '../../types';
import { InternalPage } from '../../utils/page';
import { DrawStateInstance, useDrawState } from './useDrawState';
import { CanvasImageOptions, CanvasRectInstance, CanvasRectOptions, Func, MarkInternalParams } from '../../types';

export type RemovePageStateOptions = Partial<Pick<CanvasRectOptions | CanvasImageOptions, 'type'>> & { selector?: string };

type PageMarkStateOptions = {
	getInternalPage: Func<[internalPage: InternalPage<PageItem> | number], InternalPage<PageItem>>;
	updateShapeState: Func<[CanvasRectInstance, InternalPage<PageItem> | number]>;
};

export const usePageMarkState = (canvas: HTMLCanvasElement, { getInternalPage, updateShapeState }: PageMarkStateOptions) => {
	const pageDrawStateMap = new Map<PageItem, DrawStateInstance>();
	const shapeIdMap = new Map<number | string, ShapeInstance>();
	const shapeIdReflectMap = new Map<ShapeInstance, number | string>();
	const setShapeIdMap = (idOrSelector: number | string, shapeInstance: ShapeInstance) => {
		shapeIdReflectMap.set(shapeInstance, idOrSelector);
		shapeIdMap.set(idOrSelector, shapeInstance);
	};
	const removeShapeIdMap = (shapeInstance: ShapeInstance) => {
		let id: string | number | undefined;
		if ((id = shapeIdReflectMap.get(shapeInstance))) {
			shapeIdMap.delete(id);
			shapeIdReflectMap.delete(shapeInstance);
		}
	};
	const shapeSelectorMap = new Map<number | string, ShapeInstance[]>();
	const shapeSelectorReflectMap = new Map<ShapeInstance, number | string>();
	const setShapeSelectorMap = (shapeInstance: ShapeInstance, selector: number | string) => {
		let arr = shapeSelectorMap.get(selector);
		if (!arr) arr = [];
		if (!arr.includes(shapeInstance)) arr.push(shapeInstance);
		shapeSelectorMap.set(selector, arr);
		shapeSelectorReflectMap.set(shapeInstance, selector);
	};
	const removeShapeSelector = (shapeInstance: ShapeInstance, selector: number | string) => {
		const arr = shapeSelectorMap.get(selector);
		if (arr) {
			const index = arr.indexOf(shapeInstance);
			if (index > -1) arr.splice(index, 1);
		}
	};
	const removeShapeSelectorMap = (shapeInstance: ShapeInstance) => {
		const originSelector = shapeSelectorReflectMap.get(shapeInstance) as string;
		const selectors = shapeInstance.options.selector || [];
		if (!selectors.includes(originSelector)) {
			selectors.push(originSelector);
		}
		selectors?.forEach(selector => {
			removeShapeSelector(shapeInstance, selector);
		});
		if (shapeSelectorReflectMap.has(shapeInstance)) {
			shapeSelectorReflectMap.delete(shapeInstance);
		}
	};
	const queryState = (idOrSelector: number | string) => {
		if (idOrSelector == null) return;
		return shapeIdMap.get(idOrSelector) || shapeSelectorMap.get(idOrSelector)?.[0];
	};
	const queryAllState = (idOrSelector?: number | string, internalPage?: InternalPage<PageItem> | number) => {
		if (internalPage) {
			internalPage = getInternalPage(internalPage);
			const shapesByPage = pageDrawStateMap.get(internalPage.item)?.getState();
			if (idOrSelector == null) return shapesByPage;
			return shapesByPage?.filter(s => s.options.id === idOrSelector || !!s.options.selector?.includes(idOrSelector as string));
		}
		if (idOrSelector == null) return [...new Set([...shapeIdMap.values()].flat())];
		let shape: ShapeInstance | undefined;
		if ((shape = shapeIdMap.get(idOrSelector))) return [shape];
		return shapeSelectorMap.get(idOrSelector)?.slice();
	};
	const getPageState = (internalPage?: InternalPage<PageItem> | number) => {
		if (!internalPage) {
			const shapes: ShapeInstance[] = [];
			for (const [page, drawState] of pageDrawStateMap) {
				shapes.push(...(drawState.getState() || []));
			}
			return shapes;
		}
		internalPage = getInternalPage(internalPage);
		if (!internalPage) return [];

		return getPageDrawState(internalPage).getState();
	};
	const getPageDrawState = (internalPage: InternalPage<PageItem>) => {
		let drawState = pageDrawStateMap.get(internalPage.item);
		if (!drawState) {
			drawState = useDrawState();
			pageDrawStateMap.set(internalPage.item, drawState);
		}
		return drawState;
	};
	const setPageState = (stateValue: ShapeInstance, internalPage: InternalPage<PageItem> | number) => {
		internalPage = getInternalPage(internalPage);
		if (!internalPage) return;

		const drawState = getPageDrawState(internalPage);

		stateValue.setState({ index: internalPage.i });
		drawState.setState(stateValue);
		setShapeIdMap(stateValue.id, stateValue);
		let selectors: string[] | undefined;
		if ((selectors = stateValue.options.selector)) {
			for (const selector of selectors) {
				setShapeSelectorMap(stateValue, selector);
			}
		}
		if (stateValue.options.id) {
			setShapeIdMap(stateValue.options.id, stateValue);
		}
	};

	const removeShapeByDrawState = (pageDrawState: DrawStateInstance, stateValue?: ShapeInstance, options: RemovePageStateOptions = {}) => {
		const { type, selector } = options;
		pageDrawState.getState().forEach(shape => {
			if (stateValue && shape !== stateValue) return;
			if (type && shape.options.type !== type) return;
			if (selector && !shape.options.selector?.includes(selector)) return;
			pageDrawState.removeState(shape);
			// 删除 shapeIdMap
			removeShapeIdMap(shape);
			// 删除 shapeSelectorMap
			removeShapeSelectorMap(shape);
		});
	};

	/**
	 * 删除支持自定义参数控制
	 * 1. 指定 stateValue，删除指定的图形
	 * 2. 指定 internalPage，删除指定页的图形
	 * 3. 指定 type，删除指定类型的图形
	 * @param stateValue
	 * @param internalPage
	 * @param param2
	 */
	const removePageState = (stateValue?: ShapeInstance, internalPage?: InternalPage<PageItem>, options: RemovePageStateOptions = {}) => {
		if (internalPage) {
			const pageDrawState = pageDrawStateMap.get(internalPage.item);
			pageDrawState && removeShapeByDrawState(pageDrawState, stateValue, options);
			return;
		}

		for (const [pageItem, pageDrawState] of pageDrawStateMap) {
			removeShapeByDrawState(pageDrawState, stateValue, options);
		}
	};

	const renderShapeByPageDrawState = (pageDrawState: DrawStateInstance, options: RemovePageStateOptions = {}) => {
		const { type, selector } = options;
		pageDrawState.getState().map(shape => {
			if (type && shape.options.type !== type) return;
			if (selector && !shape.options.selector?.includes(selector)) return;
			draw(shape);
		});
	};

	/**
	 * 渲染当前页图形
	 * 没有指定某一页，就渲染全部
	 * @param internalPage
	 */
	const renderPageState = (internalPage?: InternalPage<PageItem>, options: RemovePageStateOptions = {}) => {
		if (internalPage) {
			const pageDrawState = pageDrawStateMap.get(internalPage.item);
			pageDrawState && renderShapeByPageDrawState(pageDrawState, options);
			return;
		}
		for (const [pageItem, pageDrawState] of pageDrawStateMap) {
			renderShapeByPageDrawState(pageDrawState, options);
		}
	};

	const updateAllPageState = () => {
		for (const [pageItem, drawState] of pageDrawStateMap) {
			for (const shape of drawState.getState()) {
				updateState(shape, getInternalPage(shape.state.index));
			}
		}
	};

	/**
	 * @param internalPage
	 */
	const updatePageState = (internalPage: InternalPage<PageItem>) => {
		pageDrawStateMap
			.get(internalPage.item)
			?.getState()
			?.forEach(shape => {
				updateState(shape, internalPage);
			});
	};

	const updateState = (shape: ShapeInstance, internalPage: InternalPage<PageItem>) => {
		shape.updateOptions({ angle: internalPage.angle ?? 0 });
		updateShapeState(shape as CanvasRectInstance, shape.state.index);
	};

	const draw = async (shapeInstance: ShapeInstance) => {
		// 只渲染可视区域的图形
		if (!shapeInstance.isVisible()) return;

		shapeInstance.render();
	};

	const destroy = () => {
		for (const [pageItem, pageDrawState] of pageDrawStateMap) {
			pageDrawState.removeState();
		}
		pageDrawStateMap.clear();
		shapeIdMap.clear();
		shapeSelectorMap.clear();
	};

	return {
		destroy,
		getPageState,
		setPageState,
		renderPageState,
		removePageState,
		updatePageState,
		queryState,
		queryAllState,
		addSelector: setShapeSelectorMap,
		removeSelector: removeShapeSelector,
	};
};
