# 实例方法

```ts
// 初始化
const init = ({ mode, translate, scale }?: MarkInitOptions) => Promise<void>
const destroy = () => void
const reset = () => void
const render = () => void
const rerender = () => void

// 设置模式
const setMode = (mode: RenderMode) => void

// 缩放
const setScaleByRadio: (radio: number, radioOrigin?: [number, number]) => void

// 移除图形，可移除指定页的图形
const removeRect = (index: number) => void

// 画矩形
const drawRect = (originData: MarkDrawRectOptions, options?: MarkDrawShapeParams | undefined) => CanvasRectInstance 

// 画图徽
const drawBadge = (originData: MarkDrawBadgeOptions, index: number) => void

// 切换页
const changePage = (page: number , intoView?: boolean, noRender?: boolean) => void

// 获取指定页的图形
const getPageState: (page?: number) => ShapeInstance[] 

// 获取一个图形，类似于 querySelector
const queryState = (idOrSelector: string | number) => ShapeInstance | undefined

// 类似于 querySelectorAll
const queryAllState = (idOrSelector?: string | number | undefined, page?: number) => ShapeInstance[] | undefined

// 获取一个点在哪一页
const getPageByPoint = ([x, y]: [number, number]) => number

// 矩形位置转化为点位坐标
const transformPositionByPageRect: (rectOptions: RectStandardPosition, index?: number | undefined) => number[] | undefined
```
