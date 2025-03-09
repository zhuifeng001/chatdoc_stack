import { MarkInternalParams, PageItem, RectStandardPosition } from '../types';
import { formatAngle } from './rotate';

export type InternalPage<T = object> = RectStandardPosition & {
	i: number;
	item: T;
	rate: number;
	imageLoaded?: boolean;
	right: number;
	bottom: number;
	angle: number;
	originWidth: number;
	originHeight: number;
};

export type EdgeOptions = {
	padding?: number;
};

export type LocationResponse = {
	left: number;
	width: number;
};

export const getPageWidth = (page: PageItem) => {
	return (page.w || page.width || page.page_width) as number;
};
export const getPageHeight = (page: PageItem) => {
	return (page.h || page.height || page.page_height) as number;
};
export const getBaseTop = (prevInternalPage: InternalPage | undefined, markParams: MarkInternalParams) => {
	const top = markParams.multiple ? prevInternalPage?.bottom || markParams.margin : markParams.margin;
	return prevInternalPage ? top : markParams.margin;
};
/**
 *
 * @param pageItem          当前页
 * @param i                 当前索引
 * @param currInternalPage   重新生成之前的数据
 * @param prevInternalPage  上一个索引的内部数据
 * @param markParams
 * @returns
 */
export const genInternalPage = (
	pageItem: PageItem,
	i: number,
	currInternalPage: InternalPage<PageItem> | undefined,
	prevInternalPage: InternalPage<PageItem> | undefined,
	markParams: MarkInternalParams,
	isLast: boolean
): InternalPage<PageItem> => {
	let { getLocation } = markParams;
	const { left, width } = getLocation!(pageItem, markParams, currInternalPage);
	let height = 0;
	let originWidth = getPageWidth(pageItem);
	let originHeight = getPageHeight(pageItem);
	let rate = 1;

	if (originWidth == null || originHeight == null) {
		if (pageItem.aspectRatio) {
			rate = Number(pageItem.aspectRatio);
		}
		height = width / rate;
	} else {
		rate = width / getPageWidth(pageItem);
		height = rate * getPageHeight(pageItem);
	}
	const baseTop = getBaseTop(prevInternalPage, markParams);

	const angle = currInternalPage?.angle ?? pageItem.angle ?? 0; // 默认是 0

	if (angle) {
		const degree = (formatAngle(angle) * Math.PI) / 180;
		const c = Math.cos(degree);
		const s = Math.sin(degree);
		const rotatedWidth = Math.abs(c * width + s * height);
		const rotatedHeight = Math.abs(s * width + c * height);
		const finalWidth = rotatedWidth;
		const finalHeight = rotatedHeight;
		const halfWidth = (markParams.width - finalWidth) / 2;
		let finalLeft = halfWidth;
		let finalTop = baseTop;

		return {
			i,
			item: pageItem,
			rate,
			angle,
			left: finalLeft,
			top: finalTop,
			right: finalLeft + finalWidth,
			bottom: finalTop + finalHeight + (isLast ? 0 : markParams.gap),
			width: finalWidth,
			height: finalHeight,
			originWidth,
			originHeight,
		};
	}

	return {
		i,
		item: pageItem,
		left,
		top: baseTop,
		right: left + width,
		bottom: baseTop + height + (isLast ? 0 : markParams.gap),
		width,
		height: height,
		rate,
		angle,
		originWidth,
		originHeight,
	};
};

export const setInternalPageAngle = (internalPage: InternalPage<PageItem>, angle: number) => {
	internalPage.angle = angle;
};

export const transformShapeActualPosition = (
	position: number[],
	internalPage: InternalPage,
	prevInternalPage: InternalPage | undefined,
	markParams: MarkInternalParams
) => {
	if (!position?.length) return position;
	const baseTop = getBaseTop(prevInternalPage, markParams);
	const { rate, width, height } = internalPage;

	let { angle = 0 } = internalPage;
	angle = formatAngle(angle);

	return position.map((num, i) => {
		if (i & 1) {
			// 偶数位  top
			let y = Math.floor(num * rate + baseTop);
			if (angle === 90) {
				return y;
			} else if (angle === 180) {
				return y + height;
			} else if (angle === 270) {
				return y + height;
			}
			return y;
		} else {
			// 奇数位  left
			let x = Math.floor(num * rate + internalPage.left);
			if (angle === 90) {
				return x + width;
			} else if (angle === 180) {
				return x + width;
			} else if (angle === 270) {
				return x;
			}
			return x;
		}
	});
};

export const inverseShapeRealPosition = (
	position: number[],
	internalPage: InternalPage,
	prevInternalPage: InternalPage | undefined,
	markParams: MarkInternalParams
) => {
	if (!position?.length) return position;
	const baseTop = getBaseTop(prevInternalPage, markParams);
	const rate = internalPage.rate;
	return position.map((num, i) => {
		if (i & 1) {
			// 偶数位  top
			return Math.floor((num - baseTop) / rate);
		} else {
			// 奇数位  left
			return Math.floor((num - internalPage.left) / rate);
		}
	});
};

/**
 * 渲染canvas宽度就是图片的宽度 + padding
 * @returns
 */
export const calcPositionByWidth = (pageItem: PageItem, params: MarkInternalParams, internalPage?: InternalPage): LocationResponse => {
	const { margin: containerPadding, padding: pagePadding, gap, width: containerWidth, height: containerHeight } = params;
	const markContainerWidth = containerWidth - 2 * containerPadding - 2 * pagePadding;

	if ([90, 270].includes(internalPage?.angle as number)) {
		const pageWidth = getPageWidth(pageItem);
		const pageHeight = getPageHeight(pageItem);
		const imgWidth = Math.min(markContainerWidth, (markContainerWidth * pageWidth) / pageHeight);
		return {
			left: containerPadding,
			width: imgWidth,
		};
	}

	return {
		left: containerPadding + pagePadding,
		width: markContainerWidth,
	};
};

/**
 * 渲染canvas高度就是图片的高度 + padding
 * @returns
 */
export const calcPositionByHeight = (pageItem: PageItem, params: MarkInternalParams, internalPage?: InternalPage): LocationResponse => {
	const { margin: containerPadding, padding: pagePadding, gap, width: containerWidth, height: containerHeight, modeOfMaxHeightOptions } = params;
	const markContainerWidth = containerWidth - 2 * containerPadding - 2 * pagePadding;
	const pageWidth = getPageWidth(pageItem);
	const pageHeight = getPageHeight(pageItem);
	const defaultReturn = { width: markContainerWidth, left: containerPadding };
	if (pageWidth == null || pageHeight == null) return defaultReturn;

	const { scrollTop = 0, maxWidth = markContainerWidth } = modeOfMaxHeightOptions;
	let imgWidth = Math.min(maxWidth, (pageWidth / pageHeight) * (containerHeight - containerPadding - gap - scrollTop));

	// 最小为总宽度的1/3
	imgWidth = Math.max(markContainerWidth / 3, imgWidth);

	if ([90, 270].includes(internalPage?.angle as number)) {
		const imgHeight = (imgWidth / pageWidth) * pageHeight;
		const rotatedWidth = (Math.min(markContainerWidth, imgHeight) * pageWidth) / pageHeight;

		return {
			left: containerWidth / 2 - rotatedWidth / 2,
			width: rotatedWidth,
		};
	}

	return {
		left: containerWidth / 2 - imgWidth / 2,
		width: imgWidth,
	};
};

/**
 * 图片内容切边处理
 * 根据点位位置，计算出整体内容在图片中的位置
 */
export const calcPositionByMaxWidth = (pageItem: PageItem, params: MarkInternalParams): LocationResponse => {
	const { margin: containerPadding, width: containerWidth, padding: pagePadding } = params;
	const markContainerWidth = containerWidth - 2 * containerPadding - 2 * pagePadding;
	const defaultReturn = { width: markContainerWidth, left: containerPadding };

	let markLeft: number | undefined = undefined;
	let markRight: number | undefined = undefined;
	const pageWidth = getPageWidth(pageItem);
	const originWidth = pageWidth;
	if (originWidth === 0 || originWidth == null) return defaultReturn;

	const getOcrArray = (): any[] => {
		if (Array.isArray(pageItem.areas) && pageItem.areas.length) return pageItem.areas;
		if (Array.isArray(pageItem.lines) && pageItem.lines.length) return pageItem.lines;
		return [];
	};

	getOcrArray().map((area, i) => {
		if (!area) return;
		let position = area.position || area.pos;
		if (!position) return;
		// 不用处理点位
		// position = rotatePointsForOcr(area.position, pageItem.angle, pageItem.width, pageItem.height);
		if (markLeft === undefined) markLeft = position[0];
		if (markRight === undefined) markRight = position[2];
		markLeft = Math.min(position[0], position[6], markLeft as number);
		markRight = Math.max(position[2], position[4], markRight as number);
	});

	if (markLeft == null || markRight == null) return defaultReturn;

	const widthRate = originWidth / (markRight - markLeft);
	const width = markContainerWidth * widthRate;
	const imgRate = width / originWidth;

	return { left: -(markLeft * imgRate - containerPadding - pagePadding), width };
};
