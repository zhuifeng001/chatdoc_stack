<template>
  <div v-if="modifiers" class="resize-chunk" title="收缩侧边栏" v-resizable:[modifiers]="placement" :style="chunkStyle">
    <!-- <div class="resize-chunk-wrap" :style="wrapStyle">
      <el-icon class="resize-chunk-icon">
        <CaretLeft v-if="placement === 'right'" />
        <CaretRight v-if="placement === 'left'" />
        <CaretTop v-if="placement === 'bottom'" />
        <CaretBottom v-if="placement === 'top'" />
      </el-icon>
    </div> -->
  </div>
</template>
<script lang="ts" setup>
import { computed, toRefs, type PropType } from "vue";

const props = defineProps({
  placement: { type: String as PropType<"left" | "right" | "top" | "bottom">, required: true },
  modifiers: { type: String, default: ".parent" },
});
const { placement, modifiers } = toRefs(props);

const chunkStyle = computed(() => {
  switch (placement.value) {
    case "left":
      return {
        left: 0,
        top: 0,
        width: "10px",
        height: "100%",
        cursor: "col-resize",
      };
    case "right":
      return {
        right: 0,
        top: 0,
        width: "10px",
        height: "100%",
        cursor: "col-resize",
      };
    case "top":
      return {
        left: 0,
        top: 0,
        width: "100%",
        height: "10px",
        cursor: "row-resize",
      };
    case "bottom":
    default:
      return {
        left: 0,
        bottom: 0,
        width: "100%",
        height: "10px",
        cursor: "row-resize",
      };
  }
});

const wrapStyle = computed(() => {
  switch (placement.value) {
    case "left":
      return {
        height: "50px",
        width: "100%",
        left: 0,
        top: "50%",
        transform: "translateY(-50%)",
        "border-radius": "0 5px 5px 0",
      };
    case "right":
      return {
        height: "50px",
        width: "100%",
        left: 0,
        top: "50%",
        transform: "translateY(-50%)",
        "border-radius": "5px 0 0 5px",
      };
    case "top":
      return {
        width: "50px",
        height: "100%",
        left: "50%",
        top: 0,
        transform: "translateX(-50%)",
        "border-radius": "0 0 5px 5px",
      };
    case "bottom":
    default:
      return {
        width: "50px",
        height: "100%",
        left: "50%",
        top: 0,
        transform: "translateX(-50%)",
        "border-radius": "5px 5px 0 0",
      };
  }
});
</script>
<style lang="less" scoped>
.resize-chunk {
  position: absolute;
  z-index: 1;

  &:hover {
    background: rgba(100, 100, 100, 0.05);
    &::before {
      background-color: rgba(100, 100, 100, 0.2);
    }
  }

  &::before {
    content: "";
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 3px;
    height: 50px;
    border-radius: 3px;
    background-color: rgba(100, 100, 100, 0.15);
    z-index: 2;
  }

  .resize-chunk-wrap {
    position: absolute;
    background: #efefef;

    display: flex;
    align-items: center;
    justify-content: center;

    .resize-chunk-icon {
      color: #b4b4b4;
      font-size: 16px;
      width: 10px;
    }

    &:hover {
      background: #dedede;

      .resize-chunk-icon {
        color: #444444;
      }
    }
  }
}
</style>
