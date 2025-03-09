
# Typescript 类型

## Func

```ts
type Func<Args extends any[] = any[], T = any> = (...args: NonNullable<Args>) => T;
```

## PageItem

```ts
type PageItem = {
 index: number;           // 当前页
 url: string;             // 背景图
 width: number;          // 背景图原始宽度
 height: number;         // 背景图原始高度
 lines?: PageItemLine[];  // 图像切边展示用、复制文字内容用
 areas?: any[];
 angle?: number;          // 图片和点位同时旋转角度
 imageAngle?: number;     // 仅图片旋转角度
};
```

## RenderMode

```ts
/**
 * max-width 根据 lines 点位展示最大宽度
 * default   根据图片宽度 100% 展示
 */
type RenderMode = 'max-width' | 'default';
```

## RectSidePosition

```ts
type RectSidePosition = {
 left: number;
 top: number;
 right: number;
 bottom: number;
};
```

## CanvasShapeInstance

```ts
type CanvasShapeInstance<T extends CommonShapeOptions> = {
 id: number | string;
 destroy: Func<[], void>;                                    // 销毁、删除
 render: Func<[], void | Promise<void>>;                     // 画图形
 options: Readonly<T>;                                       // 只读配置项
 updateOptions: Func<[Partial<T>]>;                          // 更新配置项
 state: Readonly<CanvasShapeState>;                          // 只读状态
 setState: Func<[Partial<CanvasShapeState>]>;                // 更新状态
 activated: Func<[boolean?]>;                                // 设置激活
 deactivated: Func<[]>;                                      // 设置未激活
 setActiveAnimation: Func;                                   // 设置动画
 isInShapeRange: Func<[PointerEvent | [number, number]], boolean>;              // 鼠标是否在图形上
 isVisible: Func<[], boolean>;                               // 图形是否在canvas可视范围内
 scrollIntoView: Func<[MarkScrollIntoViewOptions?], void>;   // 图形滚动到可视区域
 restorePropagation: Func<[], void>;                         // 点击恢复冒泡
 stopPropagation: Func<[], void>;                            // 点击渎职冒泡
 removeSelector: Func<[string], void>;                       // 删除 selector
 addSelector: Func<[string], void>;                          // 添加 selector
 rotate: Func<[number, boolean?], void>;                     // 旋转
 move: Func<[[x: number, y: number]], void>;                 // 移动
};
```

## PageItemLine

```ts
type PageItemLine = {
 pos: number[];           // 行的坐标
 text: string;            // 行内文字
 char_pos?: number[][];   // 每个文字的坐标数组
};
```

## MarkPlugin

```ts
interface PluginProps {
 canvas: HTMLCanvasElement;
 ctx: CanvasRenderingContext2D;
 markInstance: MarkInstance;
 markOptions: MarkOptions;
}

type MarkPlugin = (props: PluginProps) => {
 init: () => void;
 destroy: () => void;
};
```
