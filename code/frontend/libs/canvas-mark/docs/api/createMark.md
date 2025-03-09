---
outline: deep
---

# createMark

## Props

### selector

div 容器选择器

- Type: String | HTMLDivElement
- Required: true

### pages

文档的每页配置项

- Type: Array\<[PageItem](../types/index.html#pageitem)\>
- Required: true

### multiple

文档显示方式

`true` 多页竖向排列展示，可滚动切换页  
`false` 多页仅展示一页，切换页需调用`changePage`方法

- Type: Boolean
- Default: true

### margin

外边距

- Type: Number
- Default: 20

### padding

外边距

- Type: Number
- Default: 20

### gap

两页之间的间距

- Type: Number
- Default: 20

### mode

展示模式，目前支持两种

 `max-width`  根据 lines 点位展示最大宽度  
 `default`    根据图片宽度 100% 展示

- Type: [RenderMode](../types/index.html#rendermode)
- Default: 20

### plugins

自定义插件

- Type: Array\<[MarkPlugin](../types/index.html#markplugin)\>
- Default: []

## Events

### onChangePage

切换页时触发

```ts
type onChangePage = (page: number, pageItem?: PageItem) => void;
```

### onMarkClick

图像左击事件

```ts
type onMarkClick = (shape: CanvasShapeInstance) => void;
```

### onMarkRightClick

图像右击事件

```ts
type onMarkRightClick = (shape: CanvasShapeInstance) => void;
```

### onMarkHover

图像hover进入事件

```ts
type onMarkHover = (shape: CanvasShapeInstance) => void;
```

### onMarkLeave

图像hover离开事件

```ts
type onMarkLeave = (shape: CanvasShapeInstance) => void;
```

### onContainerSizeChange

总宽度、总高度发生变化

```ts
/**
 * @param rect 容器尺寸
 * @param rect 缩放平移还原后的容器尺寸
 */
type onContainerSizeChange = (rect: RectSidePosition, originRect?: RectSidePosition) => void;
```
