import { createNode, getNode } from './canvas';
import { ContainerChangeOptions, Func, MarkInternalParams, RectSidePosition } from '../types';
import { useShortcut } from './useShortcut';
import { getDevicePixelRatio } from './device';
import { getScaleBy2d, getTransformBy2d } from './util';
import { MarkInstance } from '..';

type ScrollOptions = {
	canvas: HTMLCanvasElement;
	containerSelector: HTMLElement | string;
	onScroll: Func;
	markParams: MarkInternalParams;
	getMarkInstance: Func<[], MarkInstance>;
};

export const hasVerticalScroll = (canvas: HTMLCanvasElement, markParams: MarkInternalParams, containerRect: RectSidePosition) => {
	const [scaleX, scaleY] = getScaleBy2d(canvas);
	const height = containerRect.bottom - containerRect.top + 2 * markParams.margin * scaleY;
	// 总高度小于canvas高度，禁用滚动
	if (height < canvas.height / getDevicePixelRatio()) {
		return false;
	}
	return true;
};

export const hasHorizontalScroll = (canvas: HTMLCanvasElement, markParams: MarkInternalParams, containerRect: RectSidePosition) => {
	const [scaleX, scaleY] = getScaleBy2d(canvas);
	const width = containerRect.right - containerRect.left + 2 * markParams.margin * scaleX;
	// 总高度小于canvas高度，禁用滚动
	if (width < canvas.width / getDevicePixelRatio()) {
		return false;
	}
	return true;
};

const isAppendedStyle = false;

export const useScrollbar = ({ canvas, containerSelector, onScroll, markParams, getMarkInstance }: ScrollOptions) => {
	const markInstance = getMarkInstance();
	const { registerEvent, destroy: destroyEvent } = useShortcut();
	const containerSize = { left: 0, top: 0, right: 0, bottom: 0 };
	const verticalWrapperClass = 'mark-scroll-vertical-wrapper';
	const verticalClass = 'mark-scroll-vertical';
	let scrollVerticalWrapperNode: HTMLElement;
	let scrollVerticalNode: HTMLElement;
	const horizontalWrapperClass = 'mark-scroll-horizontal-wrapper';
	const horizontalClass = 'mark-scroll-horizontal';
	let scrollHorizontalNode: HTMLElement;
	let scrollHorizontalWrapperNode: HTMLElement;
	// 互锁
	let setScrollLock = 0;
	let emitScrollTopLock = 0;
	let emitScrollLeftLock = 0;

	const onWheelHandler = (e: Event) => {
		setScrollLock = 1;
	};

	const onScrollInternal = (...args) => {
		setScrollLock = 1;
		onScroll(...args);
		setScrollLock = 0;
	};

	const onScrollHandler = (e: Event) => {
		const target = e.target as HTMLElement;
		const devicePixelRatio = getDevicePixelRatio();
		if (e.target === scrollVerticalWrapperNode) {
			const [translateX, translateY] = getTransformBy2d(canvas);
			const [scaleX, scaleY] = getScaleBy2d(canvas);
			if (emitScrollTopLock === 1) {
				emitScrollTopLock = 0;
				return;
			}
			const ty = -(containerSize.top - markParams.margin * scaleY + target?.scrollTop * devicePixelRatio);
			onScrollInternal(e, [translateX, ty]);
		}
		if (e.target === scrollHorizontalWrapperNode) {
			const [translateX, translateY] = getTransformBy2d(canvas);
			const [scaleX, scaleY] = getScaleBy2d(canvas);
			if (emitScrollLeftLock === 1) {
				emitScrollLeftLock = 0;
				return;
			}
			const tx = -(containerSize.left - markParams.margin * scaleX + target?.scrollLeft * devicePixelRatio);
			onScrollInternal(e, [tx, translateY]);
		}
	};
	const setVerticalScroll = (translate: [number, number]) => {
		if (setScrollLock === 1) {
			return;
		}
		const devicePixelRatio = getDevicePixelRatio();
		const [scaleX, scaleY] = getScaleBy2d(canvas);
		// if (scrollVerticalWrapperNode && hasVerticalScroll(canvas, markParams, containerSize)) {
		if (scrollVerticalWrapperNode && scrollVerticalWrapperNode.scrollHeight > scrollVerticalWrapperNode.clientHeight) {
			const scrollTop = Math.max(0, -translate[1] - containerSize.top + markParams.margin * scaleY);
			emitScrollTopLock = 1;
			scrollVerticalWrapperNode.scrollTop = scrollTop / devicePixelRatio;
		}
		// if (scrollHorizontalWrapperNode && hasHorizontalScroll(canvas, markParams, containerSize)) {
		if (scrollHorizontalWrapperNode && scrollHorizontalWrapperNode.scrollWidth > scrollHorizontalWrapperNode.clientWidth) {
			const scrollLeft = Math.max(0, -translate[0] - containerSize.left + markParams.margin * scaleX);
			emitScrollLeftLock = 1;
			scrollHorizontalWrapperNode.scrollLeft = scrollLeft / devicePixelRatio;
		}
	};
	const resetContainerSize = () => {
		containerSize.left = 0;
		containerSize.top = 0;
		containerSize.right = 0;
		containerSize.bottom = 0;
	};
	const setContainerSize = (e: RectSidePosition) => {
		containerSize.left = e.left;
		containerSize.top = e.top;
		containerSize.right = e.right;
		containerSize.bottom = e.bottom;
	};

	const setVerticalRect = (e: RectSidePosition, options?: ContainerChangeOptions) => {
		setContainerSize(e);
		const devicePixelRatio = getDevicePixelRatio();
		if (options?.isLast) {
			const [scaleX, scaleY] = getScaleBy2d(canvas);
			if (scrollVerticalNode) {
				const height = containerSize.bottom - containerSize.top;
				scrollVerticalNode.style.height = `${(height + 2 * markParams.margin * scaleY) / devicePixelRatio}px`;
			}
			if (scrollHorizontalNode) {
				const width = containerSize.right - containerSize.left;
				scrollHorizontalNode.style.width = `${(width + 2 * markParams.margin * scaleX) / devicePixelRatio}px`;
			}
		}
	};

	const destroy = () => {
		destroyEvent();
	};

	const init = () => {
		const containerNode = getNode(containerSelector);
		if (!containerNode) return;

		if (!isAppendedStyle) {
			document.head.appendChild(createNode({ nodeName: 'style', children: MarkScrollbarClass }));
		}

		const getClassName = (className: string | string[]) => {
			return Array.isArray(className) ? className : [String(className || '')].filter(Boolean);
		};

		const verticalClassName = getClassName(markParams.scrollbarVerticalClassName);
		const horizontalClassName = getClassName(markParams.scrollbarHorizontalClassName);

		scrollVerticalWrapperNode = createNode({ className: [...verticalClassName, verticalWrapperClass] }) as HTMLElement;
		scrollVerticalNode = createNode({ className: verticalClass }) as HTMLElement;
		scrollVerticalWrapperNode.appendChild(scrollVerticalNode);
		containerNode.appendChild(scrollVerticalWrapperNode);

		scrollHorizontalWrapperNode = createNode({ className: [...horizontalClassName, horizontalWrapperClass] }) as HTMLElement;
		scrollHorizontalNode = createNode({ className: horizontalClass }) as HTMLElement;
		scrollHorizontalWrapperNode.appendChild(scrollHorizontalNode);
		containerNode.appendChild(scrollHorizontalWrapperNode);

		destroy();
		registerEvent([
			{
				el: scrollVerticalWrapperNode,
				event: 'wheel',
				callback: onWheelHandler,
			},
			{
				el: scrollVerticalWrapperNode,
				event: 'scroll',
				callback: onScrollHandler,
			},
			{
				el: scrollHorizontalWrapperNode,
				event: 'scroll',
				callback: onScrollHandler,
			},
		]);
	};

	return {
		init,
		destroy,
		setVerticalScroll,
		setVerticalRect,
		resetContainerSize,
	};
};

export const MarkScrollbarClass = `
.mark-scroll-vertical-wrapper {
	position: absolute;
	top: 0;
	right: 0;
	padding: 0;
	margin: 0;
	width: 10px;
	height: 100%;
	overflow-x: hidden;
	overflow-y: auto;
  z-index: 1;
}
.mark-scroll-vertical {
	width: 10px;
	min-height: 100%;
}

.mark-scroll-horizontal-wrapper {
	position: absolute;
	left: 0;
	bottom: 0;
	padding: 0;
	margin: 0;
	width: 100%;
	height: 10px;
	overflow-x: auto;
	overflow-y: hidden;
  z-index: 1;
}
.mark-scroll-horizontal {
	min-width: 100%;
	height: 10px;
}

.mark-scroll-vertical-wrapper::-webkit-scrollbar-thumb:vertical,
.mark-scroll-vertical-wrapper::-webkit-scrollbar-thumb:horizontal,
.mark-scroll-horizontal-wrapper::-webkit-scrollbar-thumb:vertical,
.mark-scroll-horizontal-wrapper::-webkit-scrollbar-thumb:horizontal {
	background-color: rgb(150, 150, 150);
}

.mark-scroll-vertical-wrapper::-moz-scrollbar-thumb:vertical,
.mark-scroll-vertical-wrapper::-moz-scrollbar-thumb:horizontal,
.mark-scroll-horizontal-wrapper::-moz-scrollbar-thumb:vertical,
.mark-scroll-horizontal-wrapper::-moz-scrollbar-thumb:horizontal {
	background-color: rgb(150, 150, 150);
}
`;
