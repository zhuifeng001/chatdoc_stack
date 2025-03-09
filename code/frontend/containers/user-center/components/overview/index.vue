<template>
  <div :class="[$style['page-wrapper'], 'scroll-bar']">
    <div :class="$style['page-body']">
      <div :class="$style['page-left']">
        <!-- <Card :class="$style['page-left-list']" title="我的知识库" :link="{ title: '全部', href: '/user-center/user-kb' }">
          <LibraryList />
        </Card> -->
        <Card
          :class="$style['page-left-chart']"
          title="知识库问答次数"
          :link="{ title: '问答记录', href: '/user-center/qa-records' }"
        >
          <ChartStatistical />
        </Card>
      </div>
      <div :class="$style['page-right']">
        <UserInfo />
        <Card :class="$style['page-right-message']" title="消息通知">
          <Message />
        </Card>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import Card from './Card.vue'
import LibraryList from './LibraryList.vue'
import ChartStatistical from './ChartStatistical.vue'
import UserInfo from './UserInfo.vue'
import Message from './Message.vue'
</script>
<style lang="less" module>
.page-wrapper {
  height: 100%;
  width: 100%;
  padding-right: 20px;
  overflow: hidden auto;

  .page-body {
    display: flex;
  }

  &::after {
    content: '';
    display: block;
    height: 20px;
  }

  .page-left {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    .page-left-list {
      margin-bottom: 20px;
    }
    .page-left-chart {
      flex: 1 1 auto;
    }
  }

  .page-right {
    flex: 0 0 360px;
    padding-left: 20px;
    .page-right-message {
      margin-top: 20px;
    }
  }
}
</style>
