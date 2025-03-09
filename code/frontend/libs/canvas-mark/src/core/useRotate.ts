import { formatAngle } from '../utils/rotate';
import { Func, MarkInternalParams } from '..';
import { MarkInstance } from './mark';

type RotateOptions = {
	index?: number;
	angle?: number;
	markInstance: MarkInstance;
	markParams: MarkInternalParams;
	getPageIndex: Func<[], number | undefined>;
};

export const useRotate = (options: RotateOptions) => {
	const { markParams, markInstance, index, angle = 90, getPageIndex } = options;
	const pages = markParams.pages;
	const prePageIndex = getPageIndex() ?? 1;
	for (let i = 0; i < pages.length; i++) {
		if (index != null && index - 1 !== i) continue;
		const internalPage = markInstance.getInternalPage(i + 1);
		if (!internalPage) continue;
		internalPage.angle = formatAngle(internalPage.angle + angle);
	}

	markInstance.genInternalPages();
	markInstance.changePage(prePageIndex);
};
