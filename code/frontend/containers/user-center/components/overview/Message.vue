<template>
  <a-tabs v-model:activeKey="activeKey" :class="$style['tab-wrapper']">
    <!-- <a-tab-pane key="1" tab="系统消息"> </a-tab-pane> -->
    <a-tab-pane key="2" tab="版本更新"> </a-tab-pane>
  </a-tabs>
  <div :class="$style['data-box']">
    <a-skeleton
      avatar
      :paragraph="{ rows: 1 }"
      v-if="loading"
      v-for="(item, i) in new Array(3)"
      :key="i"
      :class="$style['skeleton-row']"
    />
    <template v-else>
      <div
        v-if="curData.length"
        v-for="item in curData"
        :key="item.id"
        :class="$style['msg-item']"
        @click="detail(item)"
      >
        <span :class="[$style['msg-ico'], { [$style['msg-new']]: item.new }]">
          <SoundFilled />
        </span>
        <div :class="$style['msg-content']">
          <div :class="$style['msg-title']">{{ item.title }}</div>
          <div :class="$style['msg-desc']">{{ item.desc }}</div>
          <div :class="$style['msg-operate']">
            <!-- <a-button @click.stop="read(item)" type="primary" style="margin-right: 8px" v-if="item.new">已读</a-button>
            <a-button @click.stop="detail(item)">详情</a-button> -->
          </div>
        </div>
        <span :class="$style['msg-time']">{{ item.time }}</span>
      </div>
      <div v-else :class="$style['message-empty']">
        <NuxtImg
          format="webp"
          src="/assets/images/financial/SearchEmpty.png"
          alt=""
          width="120px"
          height="120px"
          sizes="120px 120px"
        />
        <div>暂无消息</div>
      </div>
    </template>
  </div>
</template>
<script lang="ts" setup>
import SoundFilled from '../../images/SoundFilled.vue'

const activeKey = ref('2')
const loading = ref(true)
const officialData = ref<Record<string, any>>([])
const versionData = ref<Record<string, any>>([])
const curData = ref<Record<string, any>>([])

onMounted(() => {
  loading.value = false
  officialData.value = [
    { id: 1, title: '系统消息', desc: '消息通知详情文案', new: true, time: '1天前' },
    { id: 2, title: '系统消息', desc: '消息通知详情文案', new: false }
  ]
  versionData.value = [
    { id: 4, title: 'V0.4', desc: `版本V0.4\n2024年07月12日`, new: true },
    { id: 3, title: 'V0.3', desc: `版本V0.3\n2024年03月22日`, new: true },
    { id: 2, title: 'V0.2', desc: `版本V0.2\n2023年12月26日`, new: true },
    { id: 1, title: 'V0.1', desc: `版本V0.1\n2023年11月06日`, new: true }
  ]
  curData.value = officialData.value
})

watchEffect(() => {
  if (activeKey.value == '1') {
    curData.value = officialData.value
  } else {
    curData.value = versionData.value
  }
})

const read = item => {
  console.log('read', item)
}
const detail = item => {
  console.log('detail', item)
}
</script>
<style lang="less" module>
.tab-wrapper {
  margin-top: 4px;
  :global {
    .ant-tabs-nav {
      margin-bottom: 20px;
      &::before {
        display: none;
      }
    }
  }
}
.data-box {
  .message-empty {
    text-align: center;
    color: var(--text-gray-color);
  }
  .msg-item {
    display: flex;
    margin-bottom: 20px;
    cursor: pointer;
    position: relative;
    &:hover {
      .msg-content {
        color: var(--primary-color);

        .msg-operate {
          // transition: 0.5s;
          // background-color: rgba(240, 242, 245, 0.8);
          // border-radius: 4px;
          // // display: block;
          // display: flex;
          // justify-content: center;
          // align-items: center;
        }
      }
    }
    .msg-ico {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: #f2f4f7;
      border-radius: 8px;
      color: #959ba6;

      &.msg-new {
        background: #ffebeb;
        color: #d94141;
      }
    }
    .msg-content {
      flex: 1 1 auto;
      margin: 0 16px;
      .msg-title {
        font-weight: 500;
        line-height: 20px;
      }
      .msg-desc {
        margin-top: 4px;
        line-height: 16px;
        font-size: 12px;
        color: var(--text-gray-color);
        white-space: pre-wrap;
      }
      .msg-operate {
        display: none;
        // margin-top: 8px;
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        transition: background-image 1s ease;
      }
    }
    .msg-time {
      font-size: 12px;
      color: var(--text-gray-color);
      line-height: 40px;
    }
  }
}
.skeleton-row {
  :global {
    .ant-skeleton-title {
      margin-top: 0 !important;
    }
    .ant-skeleton-paragraph {
      margin-top: 12px !important;
    }
  }
}
</style>
