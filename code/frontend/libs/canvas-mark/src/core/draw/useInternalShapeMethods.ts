import { MarkOptions, Func, RectStandardPosition, ShapeInstance, PageItem, MarkInternalParams } from '@/types';
import { getMarkEvents } from '../useGlobalEvents';
import { MarkScrollIntoViewOptions } from '@/types/draw';
import { transformActualPoint } from '../../utils/util';
import { InternalPage } from '@/utils/page';
import { MarkInstance } from '../mark';

export type InternalShapeMethodsOptions = {
	markOptions: MarkOptions;
	markParams: MarkInternalParams;
	markInstance: MarkInstance;
	setup?: Func;
};

export const useInternalShapeMethods = (canvas: HTMLCanvasElement, instance: ShapeInstance, options: InternalShapeMethodsOptions) => {
	const { markOptions, markInstance } = options;
	const originActivated = instance.activated;
	return {
		events: getMarkEvents(markInstance, markOptions),
		getOffset() {
			const options = instance.options;
			return transformActualPoint(canvas, [options.left, options.top]);
		},
		activated(intoView = true, intoViewOptions?: MarkScrollIntoViewOptions) {
			// 去除上一次激活状态
			markInstance.getActive()?.deactivated();
			// 保存当前激活对象
			markInstance.setActive(instance);
			// 设置当前激活状态
			originActivated(intoView, intoViewOptions);
		},
		addSelector(selector: string) {
			const selectors = instance.options.selector;
			instance.updateOptions({
				selector: [...(selectors || []), selector],
			});
			markInstance.addSelector(instance, selector);
		},
		removeSelector(selector: string) {
			const selectors = instance.options.selector;
			instance.updateOptions({
				selector: selectors?.filter(s => s !== selector),
			});
			markInstance.removeSelector(instance, selector);
		},
		scrollIntoView: (options?: MarkScrollIntoViewOptions) => {
			markInstance.scrollIntoView(instance.options, options);
		},
		destroy: (render = true) => {
			markInstance.removePageState(instance);
			render && markInstance.render();
		},
	};
};
