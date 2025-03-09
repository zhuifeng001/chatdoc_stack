export const propsSearchBarItem = {
  /**
   * 是否是最后一个元素，固定在右下角
   */
  last: { type: Boolean, default: false },
  /**
   * col 属性 （同 [a-col](https://www.antdv.com/components/grid-cn#Col) 组件属性）
   */
  col: { type: Object, default: () => ({}) },
}
