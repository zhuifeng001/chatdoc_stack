import * as mitt from 'mitt';
import { ShapePosition as ShapePosition$1, ShapeInstance as ShapeInstance$1, Func as Func$1 } from '@/types';

interface PluginProps {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    markInstance: MarkInstance;
    markOptions: MarkOptions;
    markParams: MarkInternalParams;
}
type MarkPlugin = (props: PluginProps) => {
    name: string;
    init: () => void;
    destroy: () => void;
    [key: string]: any;
};

type InternalPage<T = object> = RectStandardPosition & {
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
type LocationResponse = {
    left: number;
    width: number;
};

type MarkDrawShapeOptions = {
    index?: number;
    position: number[];
    data?: any;
    options?: Partial<ShapeOptions>;
};
type MarkDrawBadgeOptions = {
    x: number;
    y: number;
    text: string;
    data?: any;
    options?: Partial<CanvasBadgeOptions>;
};
type MarkDrawShapeParams = {
    visible?: boolean;
};
type MarkScrollIntoViewOptions = {
    threshold?: number;
} & ScrollIntoViewOptions;

type Func<Args extends any[] = any[], T = any> = (...args: NonNullable<Args>) => T;
type ImageSrc = string | (() => string | Promise<string>);
type WorkerImageRes<T = string> = {
    src: string;
    data: T;
    type?: string;
    headers?: Record<string, string>;
};
type PageItem = {
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
    aspectRatio?: number;
    index: number;
    areas?: any[];
    lines?: PageItemLine[];
    angle?: number;
    imageAngle?: number;
};
type PageItemLine = {
    pos?: number[];
    position?: number[];
    text: string;
    char_pos?: number[][];
    char_positions?: number[][];
};
type RectSidePosition = {
    left: number;
    top: number;
    right: number;
    bottom: number;
};
type RectStandardPosition = {
    left: number;
    top: number;
    width: number;
    height: number;
};
type CanvasEvent = 'click' | 'rightClick' | 'mousemove' | 'mousedown' | 'mouseup' | 'mouseleave' | 'mouseenter' | 'wheel' | CanvasDrawEvent;
type CanvasDrawEvent = 'onDrawStart' | 'onDrawChange' | 'onDrawComplete' | 'onDrawCancel' | 'onDrawRemove';
type ShapeStyleConfig = {
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
type CanvasEventOptions = {
    events?: Partial<Record<CanvasEvent, Func>>;
};
type CommonShapeOptions = {
    id?: string;
    selector?: string[];
    type?: string;
    unshift?: boolean;
    data?: any;
    angle?: number;
};
type PolygonPosition = {
    position: number[];
};
type ShapePosition = RectStandardPosition | PolygonPosition;
type InternalShapeOptions = {
    first?: boolean;
    last?: boolean;
    _rate?: number;
};
type CanvasBadgeOptions = RectStandardPosition & InternalShapeOptions & CommonShapeOptions & ShapeStyleConfig & PolygonPosition & {
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
type BorderPlacement = 'left' | 'right' | 'top' | 'bottom';
type CanvasRectOptions = RectStandardPosition & InternalShapeOptions & CommonShapeOptions & ShapeStyleConfig & {
    readonly type: 'rect';
    position: number[];
    borderPlacement?: BorderPlacement[];
    padding?: [number, number, number, number];
};
type CanvasPolygonOptions = RectStandardPosition & InternalShapeOptions & CommonShapeOptions & ShapeStyleConfig & PolygonPosition & {
    readonly type: 'polygon';
};
type CanvasImageOptions = RectStandardPosition & InternalShapeOptions & ShapeStyleConfig & CommonShapeOptions & {
    type: 'image';
    src: string | (() => string | Promise<string>);
    getUrlHeader?: () => Record<string, string>;
    formatUrl?: (res: WorkerImageRes<string | Blob>) => string;
    enableWorker?: boolean;
    border?: BorderStyle;
};
type CanvasShapeState = {
    inRange: boolean;
    index: number;
    position: number[];
    angle: number;
    active: boolean;
    visible: boolean;
    canEmitEvent: boolean;
    data?: any;
    animationStatus?: 'doing' | 'done';
    originOptions?: ShapeOptions;
};
type CanvasShapeInstance<T = ShapeOptions> = CanvasEventOptions & {
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
type CanvasPolygonInstance = CanvasShapeInstance<CanvasPolygonOptions>;
type CanvasRectInstance = CanvasShapeInstance<CanvasRectOptions>;
type CanvasImageInstance = CanvasShapeInstance<CanvasImageOptions>;
type CanvasBadgeInstance = CanvasShapeInstance<CanvasBadgeOptions>;
type ShapeOptions = CanvasPolygonOptions | CanvasRectOptions | CanvasImageOptions | CanvasBadgeOptions;
type ShapeInstance = CanvasPolygonInstance | CanvasRectInstance | CanvasImageInstance | CanvasBadgeInstance;
type ContainerChangeOptions = {
    isLast?: boolean;
};
type RenderMode = 'max-width' | 'max-height' | 'default';
type BorderStyle = {
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
type MarkOptions = {
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
type MarkInternalParams = {
    markOptions: MarkOptions;
} & {
    backgroundImageBorder?: BorderStyle;
    getMarkInstance: () => MarkInstance;
} & Omit<Required<MarkOptions>, 'backgroundImageBorder' | 'onImageLoading' | 'onImageLoaded' | 'onFirstRendered' | 'onChangePage' | 'onContainerSizeChange' | 'onDrag' | 'onScroll' | 'onTranslateChange' | 'onScaleChange' | 'onMarkNoHover' | 'onMarkHover' | 'onMarkClick' | 'onMarkLeave' | 'onMarkRightClick' | 'onModeChange' | 'onCopySelected' | 'data' | CanvasDrawEvent>;
type ShapeUnion = 'rect' | 'image';
declare enum ShapeEnums {
    RECT = "rect",
    IMAGE = "image"
}

type RemovePageStateOptions = Partial<Pick<CanvasRectOptions | CanvasImageOptions, 'type'>> & {
    selector?: string;
};

type IntoViewOptions = {
    updateTranslate: (translate: [number, number]) => void;
    getMin: () => number;
    getMax: () => number;
    render: () => void;
};
declare const useScrollIntoView: (canvas: HTMLCanvasElement, { updateTranslate, getMin, getMax, render }: IntoViewOptions) => {
    scrollIntoView: (rect: RectStandardPosition, options?: MarkScrollIntoViewOptions) => void;
    scrollBehaviorY: (endTranslate: [number, number], startTranslate?: [number, number]) => Promise<void>;
};

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
declare const useMultiPage: (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, options: MultiPageOptions) => {
    init: () => void;
    update: () => void;
    destroy: () => void;
    getPageIndex: () => number;
    getPagesByVisible: () => PageItem[];
    getPageByPoint: ([x, y]: [number, number]) => number;
    changePage: (internalPage: InternalPage<PageItem> | number, intoView?: boolean, emit?: boolean) => void;
    drawPage: (waitPromise?: boolean) => Promise<void>;
    drawRect: (originData: MarkDrawShapeOptions, options?: MarkDrawShapeParams) => CanvasRectInstance | undefined;
    drawPolygon: (originData: MarkDrawShapeOptions, options?: MarkDrawShapeParams) => CanvasPolygonInstance | undefined;
    drawBadge: (originData: MarkDrawShapeOptions, options?: MarkDrawShapeParams) => CanvasBadgeInstance | undefined;
    /**
     * deprecated
     */
    removeRect: (index: number | RemovePageStateOptions) => void;
    removeShape: (index: number | RemovePageStateOptions) => void;
    getInternalPage: (internalPage?: InternalPage<PageItem> | number) => InternalPage<PageItem>;
    getInternalPagesByVisible: () => InternalPage<PageItem>[];
    genInternalPages: () => void;
    /**
     * deprecated
     */
    scrollToMark: (rect: RectStandardPosition, options?: MarkScrollIntoViewOptions) => void;
    scrollIntoView: (rect: RectStandardPosition, options?: MarkScrollIntoViewOptions) => void;
    removePageState: (stateValue?: ShapeInstance, internalPage?: InternalPage<PageItem>, options?: RemovePageStateOptions) => void;
    updatePageState: (internalPage: InternalPage<PageItem>) => void;
    getPageState: (internalPage?: InternalPage<PageItem> | number) => ShapeInstance[];
    setPageState: (stateValue: ShapeInstance, internalPage: InternalPage<PageItem> | number) => void;
    transformPositionByPageRect: <T extends RectStandardPosition>(rectOptions: T, index?: number) => number[] | undefined;
    transformPositionByPagePolygon: (position: number[], index?: number) => number[] | undefined;
    queryState: (idOrSelector: number | string) => ShapeInstance | undefined;
    queryAllState: (idOrSelector?: number | string, internalPage?: InternalPage<PageItem> | number) => ShapeInstance[] | undefined;
    setActive: (newActive: any) => void;
    getActive: () => any;
    addSelector: (shapeInstance: ShapeInstance, selector: number | string) => void;
    removeSelector: (shapeInstance: ShapeInstance, selector: number | string) => void;
};

type AnimationKeyframe<T extends ShapePosition$1 = ShapePosition$1, S extends ShapeInstance$1 = ShapeInstance$1> = {
    percent: number;
    state: [S, T][];
};
type AnimationHandler<T extends ShapePosition$1 = ShapePosition$1, S extends ShapeInstance$1 = ShapeInstance$1> = (options: AnimationOptions<T, S>) => {
    init: Func$1;
    destroy: Func$1;
    restore: Func$1;
    run: (startKeyframe: AnimationKeyframe<T, S>, endKeyframe: AnimationKeyframe<T, S>, progress: number) => void;
};
type AnimationOptions<T extends ShapePosition$1 = ShapePosition$1, S extends ShapeInstance$1 = ShapeInstance$1> = {
    duration: number;
    keyframes: AnimationKeyframe<T, S>[];
    render: Func$1;
    handler: AnimationHandler<T, S>;
};

type AnimationKeyframeOptions = {
    unit?: number;
    period?: number;
};
type AnimationProps = ShapeAnimationOptions | AnimationOptions;
type ShapeAnimationOptions = {
    shapes: ShapeInstance[];
    render: Func;
};

type MarkInstance = ReturnType<typeof createMark>;
type MultiPageInstance = ReturnType<typeof useMultiPage>;
type MarkInitOptions = {
    mode?: RenderMode;
    translate?: [number, number];
    scale?: [number, number];
};
declare const createMark: (options: MarkOptions) => {
    options: MarkOptions;
    init: ({ mode, translate, scale }?: MarkInitOptions) => Promise<void>;
    destroy: () => void;
    reset: () => void;
    render: (waitPromise?: boolean) => void;
    rerender: () => void;
    rotate: (index?: number) => void;
    enableDrawShape: (options?: CanvasRectOptions) => void;
    cancelDrawShape: () => void;
    getCanvas(): HTMLCanvasElement;
    getContainerRect: () => {
        left: number;
        top: number;
        right: number;
        bottom: number;
    };
    getTranslate: () => [number, number];
    updateTranslate: (translate: [number, number]) => void;
    getScale: () => [number, number];
    updateScale: (scale: [number, number]) => void;
    animate: (props: Omit<AnimationProps, "render">, options?: AnimationKeyframeOptions) => {
        run: () => void;
    };
    setMode: (mode: RenderMode) => void;
    setScaleByRadio: (radio: number, radioOrigin?: [number, number]) => void;
    removeRect: (index: number | RemovePageStateOptions) => void | undefined;
    removeShape: (index: number | RemovePageStateOptions) => void | undefined;
    removePageState: (stateValue?: ShapeInstance | undefined, internalPage?: InternalPage<PageItem> | undefined, options?: RemovePageStateOptions | undefined) => void | undefined;
    drawRect: (originData: MarkDrawShapeOptions, options?: MarkDrawShapeParams | undefined) => CanvasRectInstance | undefined;
    drawPolygon: (originData: MarkDrawShapeOptions, options?: MarkDrawShapeParams | undefined) => CanvasPolygonInstance | undefined;
    drawBadge: (originData: MarkDrawShapeOptions, options?: MarkDrawShapeParams | undefined) => CanvasBadgeInstance | undefined;
    getInternalPage: (internalPage?: number | InternalPage<PageItem> | undefined) => InternalPage<PageItem> | undefined;
    getInternalPagesByVisible: () => InternalPage<PageItem>[] | undefined;
    genInternalPages: () => void | undefined;
    changePage: (internalPage: number | InternalPage<PageItem>, intoView?: boolean | undefined, emit?: boolean | undefined) => void | undefined;
    getPageState: (internalPage?: number | InternalPage<PageItem> | undefined) => ShapeInstance[] | undefined;
    setPageState: (stateValue: ShapeInstance, internalPage: number | InternalPage<PageItem>) => void | undefined;
    queryState: (idOrSelector: string | number) => ShapeInstance | undefined;
    queryAllState: (idOrSelector?: string | number | undefined, internalPage?: number | InternalPage<PageItem> | undefined) => ShapeInstance[] | undefined;
    getActive: () => any;
    setActive: (newActive: any) => void | undefined;
    getPageByPoint: (args_0: [number, number]) => number | undefined;
    getPageIndex: () => number | undefined;
    addSelector: (shapeInstance: ShapeInstance, selector: string | number) => void | undefined;
    removeSelector: (shapeInstance: ShapeInstance, selector: string | number) => void | undefined;
    scrollIntoView: (rect: RectStandardPosition, options?: MarkScrollIntoViewOptions | undefined) => void | undefined;
    transformPositionByPageRect: (rectOptions: RectStandardPosition, index?: number | undefined) => number[] | undefined;
    transformPositionByPagePolygon: (position: number[], index?: number | undefined) => number[] | undefined;
    getBoundingClientRect: () => DOMRect & {
        actualWidth: number;
        actualHeight: number;
    };
    transformActualPoint: (point: number[]) => number[];
    updatePages: (newPages?: PageItem[]) => void;
    updateOptions: (newOptions: Partial<MarkOptions>) => void;
    plugins: Record<string, any>;
    all: mitt.EventHandlerMap<Record<mitt.EventType, unknown>>;
    on<Key extends mitt.EventType>(type: Key, handler: mitt.Handler<Record<mitt.EventType, unknown>[Key]>): void;
    on(type: "*", handler: mitt.WildcardHandler<Record<mitt.EventType, unknown>>): void;
    off<Key extends mitt.EventType>(type: Key, handler?: mitt.Handler<Record<mitt.EventType, unknown>[Key]> | undefined): void;
    off(type: "*", handler: mitt.WildcardHandler<Record<mitt.EventType, unknown>>): void;
    emit<Key extends mitt.EventType>(type: Key, event: Record<mitt.EventType, unknown>[Key]): void;
    emit<Key extends mitt.EventType>(type: undefined extends Record<mitt.EventType, unknown>[Key] ? Key : never): void;
};

type ConnectorPoint = {
    x: number;
    y: number;
};
type ConnectorLineStyle = {
    stroke?: string;
    strokeWidth?: string;
    strokeDasharray?: string;
    fill?: string;
};
type CreateArcLineOptions = {
    baseX?: number;
    radius?: number;
};
declare const useConnector: () => {
    createLine: (anchor: ConnectorPoint, target: ConnectorPoint, lineStyle?: ConnectorLineStyle) => void;
    createArcLine: (anchor: ConnectorPoint, target: ConnectorPoint, options?: CreateArcLineOptions, lineStyle?: ConnectorLineStyle) => void;
    destroy: () => void;
};

export { type BorderPlacement, type BorderStyle, type CanvasBadgeInstance, type CanvasBadgeOptions, type CanvasDrawEvent, type CanvasEvent, type CanvasEventOptions, type CanvasImageInstance, type CanvasImageOptions, type CanvasPolygonInstance, type CanvasPolygonOptions, type CanvasRectInstance, type CanvasRectOptions, type CanvasShapeInstance, type CanvasShapeState, type CommonShapeOptions, type ContainerChangeOptions, type Func, type ImageSrc, type InternalShapeOptions, type MarkDrawBadgeOptions, type MarkDrawShapeOptions, type MarkDrawShapeParams, type MarkInitOptions, type MarkInstance, type MarkInternalParams, type MarkOptions, type MarkScrollIntoViewOptions, type MultiPageInstance, type PageItem, type PageItemLine, type PolygonPosition, type RectSidePosition, type RectStandardPosition, type RenderMode, ShapeEnums, type ShapeInstance, type ShapeOptions, type ShapePosition, type ShapeStyleConfig, type ShapeUnion, type WorkerImageRes, createMark, useConnector };
