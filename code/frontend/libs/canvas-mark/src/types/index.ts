import { MarkInstance } from '../core/mark';
import { MarkPlugin } from '../plugins';
import { InternalPage, LocationResponse } from '../utils/page';
import { MarkScrollIntoViewOptions } from './draw';

export type Func<Args extends any[] = any[], T = any> = (...args: NonNullable<Args>) => T;

export type ImageSrc = string | (() => string | Promise<string>);

export type WorkerImageRes<T = string> = {
	src: string; // 输入的src
	data: T;
	type?: string;
	headers?: Record<string, string>;
};

export type PageItem = {
	getUrl?: () => string | Promise<string>;
	getUrlHeader?: () => Record<string, string>;
	formatUrl?: (res: WorkerImageRes<string | Blob>) => string;
	url?: string;
	w?: number;
	width?: number;
	page_width?: number;
	h?: number;
	height?: number;
	page_height?: number;
	aspectRatio?: number; // 宽高比
	index: number;
	areas?: any[];
	lines?: PageItemLine[]; // 图像切边展示用、复制文字内容用
	angle?: number; // 图片和点位同时旋转角度
	imageAngle?: number; // 仅图片旋转角度
};

export type PageItemLine = {
	pos?: number[];
	position?: number[];
	text: string;
	char_pos?: number[][];
	char_positions?: number[][];
};

export type RectSidePosition = {
	left: number;
	top: number;
	right: number;
	bottom: number;
};

export type RectStandardPosition = {
	left: number;
	top: number;
	width: number;
	height: number;
};

export type CanvasEvent = 'click' | 'rightClick' | 'mousemove' | 'mousedown' | 'mouseup' | 'mouseleave' | 'mouseenter' | 'wheel' | CanvasDrawEvent;

export type CanvasDrawEvent = 'onDrawStart' | 'onDrawChange' | 'onDrawComplete' | 'onDrawCancel' | 'onDrawRemove';

export type ShapeStyleConfig = {
	strokeStyle?: string;
	fillStyle?: string;
	lineDash?: number[];
	lineWidth?: number;
	shadow?: {
		shadowColor?: string;
		shadowOffsetX?: number;
		shadowOffsetY?: number;
		shadowBlur?: number;
	};
};

export type CanvasEventOptions = {
	events?: Partial<Record<CanvasEvent, Func>>;
};

export type CommonShapeOptions = {
	id?: string;
	selector?: string[];
	type?: string;
	unshift?: boolean;
	data?: any;
	angle?: number;
};

export type PolygonPosition = { position: number[] };

export type ShapePosition = RectStandardPosition | PolygonPosition;

export type InternalShapeOptions = {
	first?: boolean;
	last?: boolean;
	_rate?: number;
};

export type CanvasBadgeOptions = RectStandardPosition &
	InternalShapeOptions &
	CommonShapeOptions &
	ShapeStyleConfig &
	PolygonPosition & {
		readonly type: 'badge';
		strokeStyle?: string;
		fillStyle?: string;
		fontSize?: number;
		padding?: number;
		text?: string;
		placement?: 'left-top' | 'left-bottom' | 'right-top' | 'right-bottom';
		badge?: {
			strokeStyle?: string;
			fillStyle?: string;
			color?: string;
			textBaseline?: CanvasTextBaseline;
		};
	};

export type BorderPlacement = 'left' | 'right' | 'top' | 'bottom';
export type CanvasRectOptions = RectStandardPosition &
	InternalShapeOptions &
	CommonShapeOptions &
	ShapeStyleConfig & {
		readonly type: 'rect';
		position: number[];
		borderPlacement?: BorderPlacement[];
		padding?: [number, number, number, number];
	};

export type CanvasPolygonOptions = RectStandardPosition &
	InternalShapeOptions &
	CommonShapeOptions &
	ShapeStyleConfig &
	PolygonPosition & {
		readonly type: 'polygon';
	};

export type CanvasImageOptions = RectStandardPosition &
	InternalShapeOptions &
	ShapeStyleConfig &
	CommonShapeOptions & {
		type: 'image';
		src: string | (() => string | Promise<string>);
		getUrlHeader?: () => Record<string, string>;
		formatUrl?: (res: WorkerImageRes<string | Blob>) => string;
		enableWorker?: boolean;
		border?: BorderStyle;
	};

export type CanvasShapeState = {
	inRange: boolean;
	index: number;
	position: number[];
	angle: number;
	active: boolean;
	visible: boolean;
	canEmitEvent: boolean;
	data?: any;
	animationStatus?: 'doing' | 'done'; // 动画状态
	originOptions?: ShapeOptions; // 动画前的参数
};

export type CanvasShapeInstance<T = ShapeOptions> = CanvasEventOptions & {
	id: number | string;
	destroy: Func<[render?: boolean], void>;
	render: Func<[], void | Promise<void>>;
	options: Readonly<T>;
	updateOptions: Func<[Partial<T>]>;
	state: Readonly<CanvasShapeState>;
	setState: Func<[Partial<CanvasShapeState>]>;
	activated: Func<[boolean?, intoViewOptions?: MarkScrollIntoViewOptions]>;
	deactivated: Func<[]>;
	setActiveAnimation: Func;
	isInShapeRange: Func<[PointerEvent | [number, number]], boolean>;
	isVisible: Func<[], boolean>;
	scrollIntoView: Func<[MarkScrollIntoViewOptions?], void>;
	restorePropagation: Func<[], void>;
	stopPropagation: Func<[], void>;
	removeSelector: Func<[string], void>;
	addSelector: Func<[string], void>;
	getOffset: Func<[], [number, number] | void>;
	rotate: Func<[number, boolean?], void>;
	move: Func<[[x: number, y: number]], void>;
};

export type CanvasPolygonInstance = CanvasShapeInstance<CanvasPolygonOptions>;
export type CanvasRectInstance = CanvasShapeInstance<CanvasRectOptions>;
export type CanvasImageInstance = CanvasShapeInstance<CanvasImageOptions>;
export type CanvasBadgeInstance = CanvasShapeInstance<CanvasBadgeOptions>;
export type ShapeOptions = CanvasPolygonOptions | CanvasRectOptions | CanvasImageOptions | CanvasBadgeOptions;
export type ShapeInstance = CanvasPolygonInstance | CanvasRectInstance | CanvasImageInstance | CanvasBadgeInstance;

export type ContainerChangeOptions = {
	isLast?: boolean;
};

export type RenderMode = 'max-width' | 'max-height' | 'default';

export type BorderStyle = {
	strokeStyle?: string;
	lineWidth?: number;
	borderPlacement?: BorderPlacement[];
	fillStyle?: string;
	padding?: [number, number, number, number];
	shadow?: {
		shadowColor?: string;
		shadowOffsetX?: number;
		shadowOffsetY?: number;
		shadowBlur?: number;
	};
};

export type MarkOptions = {
	/**
	 * 可自定义数据，实现传参至内部（插件等）
	 */
	data?: any;

	selector: string | HTMLElement;
	width?: number;
	height?: number;
	/**
	 * @description 外边距
	 */
	margin?: number;
	/**
	 * @description 两页之间的间距
	 */
	gap?: number;
	/**
	 * max-height模式下，下一页显示的高度值
	 */
	modeOfMaxHeightOptions?: {
		scrollTop?: number;
		maxWidth?: number;
	};
	/**
	 * @description 内边距
	 */
	padding?: number;
	/**
	 * @description 背景色
	 */
	backgroundColor?: string;
	backgroundImageBorder?: BorderStyle;
	/**
	 * @description 每页的数据
	 */
	pages?: PageItem[];
	/**
	 * @description 渲染模式
	 * @default default
	 * @enum default, max-width
	 */
	mode?: RenderMode;
	/**
	 * @description 是否显示多页样式
	 * @default true
	 */
	multiple?: boolean;
	/**
	 * @description 图片预加载数量
	 * @default 3
	 */
	preloadImageNum?: number;
	minScale?: number;
	maxScale?: number;
	disableScroll?: boolean;
	disableZoom?: boolean;
	disableMove?: boolean;
	/**
	 * 滚动条样式类名
	 */
	scrollbarVerticalClassName?: string | string[];
	scrollbarHorizontalClassName?: string | string[];
	onImageLoading?: Func<[page: number, pageItem: PageItem], void>;
	onImageLoaded?: Func<[page: number, pageItem: PageItem], void>;
	onFirstRendered?: Func<[page: number, pageItem: PageItem], void>;
	onChangePage?: Func<[number, PageItem], void>;
	getLocation?: Func<[PageItem, MarkInternalParams, InternalPage?], LocationResponse> | null;
	onContainerSizeChange?: Func<[RectSidePosition, RectSidePosition, ContainerChangeOptions?], void>;
	onDrag?: Func<[new: [number, number], old: [number, number]], void>;
	onScroll?: Func<[new: [number, number], old: [number, number]], void>;
	onTranslateChange?: Func<[new: [number, number], old: [number, number]], void>;
	onScaleChange?: Func<[new: [number, number], old: [number, number]], void>;
	onCopySelected?: Func;
	onMarkNoHover?: Func;
	onMarkHover?: Func;
	onMarkClick?: Func;
	onMarkLeave?: Func;
	onMarkRightClick?: Func;
	onDrawStart?: Func;
	onDrawComplete?: Func;
	onDrawCancel?: Func;
	onDrawChange?: Func;
	onDrawRemove?: Func;
	onModeChange?: (newV: RenderMode, oldV: RenderMode) => void;
	plugins?: MarkPlugin[];
	enableCopyText?: boolean;
	enableWorker?: boolean;
};

export type MarkInternalParams = {
	markOptions: MarkOptions;
} & {
	backgroundImageBorder?: BorderStyle;
	getMarkInstance: () => MarkInstance;
} & Omit<
		Required<MarkOptions>,
		| 'backgroundImageBorder'
		| 'onImageLoading'
		| 'onImageLoaded'
		| 'onFirstRendered'
		| 'onChangePage'
		| 'onContainerSizeChange'
		| 'onDrag'
		| 'onScroll'
		| 'onTranslateChange'
		| 'onScaleChange'
		| 'onMarkNoHover'
		| 'onMarkHover'
		| 'onMarkClick'
		| 'onMarkLeave'
		| 'onMarkRightClick'
		| 'onModeChange'
		| 'onCopySelected'
		| 'data'
		| CanvasDrawEvent
	>;

export type ShapeUnion = 'rect' | 'image';
export enum ShapeEnums {
	RECT = 'rect',
	IMAGE = 'image',
}
