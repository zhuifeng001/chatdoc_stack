# SearchBar 搜索栏

<script lang="ts" setup>
import { propsSearchBar } from '~/suite/SearchBar'
import { propsSearchBarItem } from '~/suite/SearchBarItem'
import searchBarPropsRaw from '~/suite/SearchBar/src/prop.ts?raw'
import searchBarItemPropsRaw from '~/suite/SearchBarItem/src/prop.ts?raw'
import Demo from '~/suite/SearchBar/src/demo.vue'
</script>

统一搜索栏样式，自带响应式布局，可缩放屏幕宽度查看。

## API

### TxSearchBar 组件属性

属性同 [`a-form`](https://www.antdv.com/components/form-cn) 组件属性，扩展属性如下：

<ApiPropTable :props="propsSearchBar" :propsRaw="searchBarPropsRaw"></ApiPropTable>

### TxSearchBarItem 组件属性

属性同 [`a-form-item`](https://www.antdv.com/components/form-cn#Form-Item) 组件属性，扩展属性如下

<ApiPropTable :props="propsSearchBarItem" :propsRaw="searchBarItemPropsRaw"></ApiPropTable>

## 示例

1. 单行示例

:::demo column

```vue
<template>
  <TxSearchBar>
    <TxSearchBarItem label="关键字1">
      <a-input placeholder="请输入" />
    </TxSearchBarItem>
    <TxSearchBarItem label="关键字2">
      <a-input placeholder="请输入" />
    </TxSearchBarItem>
    <TxSearchBarItem last>
      <tx-button type="primary">搜索</tx-button>
    </TxSearchBarItem>
  </TxSearchBar>
</template>
```

:::

1. 换行示例

:::demo column

```vue
<template>
  <TxSearchBar>
    <TxSearchBarItem label="关键字1">
      <a-input placeholder="请输入" />
    </TxSearchBarItem>
    <TxSearchBarItem label="关键字2">
      <a-input placeholder="请输入" />
    </TxSearchBarItem>
    <TxSearchBarItem label="关键字3">
      <a-input placeholder="请输入" />
    </TxSearchBarItem>
    <TxSearchBarItem label="关键字4">
      <a-input placeholder="请输入" />
    </TxSearchBarItem>
    <TxSearchBarItem label="关键字5">
      <a-input placeholder="请输入" />
    </TxSearchBarItem>
    <TxSearchBarItem last>
      <tx-button type="primary">搜索</tx-button>
    </TxSearchBarItem>
  </TxSearchBar>
</template>
```

:::

## 备注

基于
[`a-form`](https://www.antdv.com/components/form-cn)、
[`a-form-item`](https://www.antdv.com/components/form-cn#Form-Item)、
[`a-row`](https://www.antdv.com/components/grid-cn#Row)、
[`a-col`](https://www.antdv.com/components/grid-cn#Col) 的组件组合封装，可以满足表单的一些功能和响应式布局需求。

<FeedbackSupport name="fuller_xu"></FeedbackSupport>
