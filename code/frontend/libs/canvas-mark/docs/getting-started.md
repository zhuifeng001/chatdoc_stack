# 开始

## 安装

```shell
# npm
npm i canvas-mark
# yarn
yarn add canvas-mark
#pnpm
pnpm add canvas-mark
```

## 使用

```html
<body>
<div id="mark"></div>
<script>
import { createMark }   from  'canvas-mark';

const { init, destroy } = createMark({
  selector: '#mark',
  pages: [
    {
      index: 1,      // 第几页，索引从1开始
      url: ''        // 背景图片
      width: 600,    // 背景图片的原始高度
      height: 600,   // 背景图片的原始宽度
    }
  ],
  onChangePage(page){}
  onMarkClick(shape){}
});

// 初始化
init();

</script>
</body>
```

## Vue/React示例

::: code-group

<<< @/demo/Mark.vue

<<< @/demo/Mark.tsx
