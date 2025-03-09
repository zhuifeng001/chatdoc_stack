<template>
  <div :class="$style['loading']"></div>
</template>
<style lang="less" module>
@keyframes _default {
  0% {
    transform: rotate(0);
  }

  100% {
    transform: rotate(360deg);
  }
}

.loading {
  position: relative;
  width: 20px;
  height: 20px;
  // color: var(--primary-color);

  &:before {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    margin: auto;
    width: 100%;
    height: 100%;
    content: ' ';
    display: block;
    background: 0;
    animation: _default 1s ease-in-out infinite;
    border-radius: 50%;
    margin: 0;
    box-sizing: border-box;
    border: 2px solid #fff;
    border-color: currentColor transparent currentColor transparent;

    animation-play-state: running;
  }
}
</style>
