<template>
  <div :class="$style['user-info-wrapper']">
    <div :class="$style['user-info-header']" v-if="userInfo">
      <div :class="$style['user-name-box']">
        <div :class="$style['user-name']">你好，{{ userInfo?.name || userInfo?.account }}</div>
        <div :class="$style['info-desc']">欢迎回来！</div>
      </div>
      <div :class="$style['user-avatar']">
        <img v-if="userInfo?.avatar" :src="getPublicImage(userInfo.avatar, 'avatar')" />
        <span v-else :class="$style['avatar-img']"><AccountCircle /></span>
      </div>
    </div>
    <div v-else style="padding: 20px">
      <a-space style="display: flex">
        <a-skeleton active :paragraph="{ rows: 1 }" style="width: 200px" />
        <a-skeleton-avatar active :size="70" />
      </a-space>
    </div>
    <!-- :link="{ title: '设置', href: '/user-center' }" -->
    <Card :class="$style['page-right-user']" title=" ">
      <div v-if="userInfo" v-for="item in infoList" :key="item.label" :class="$style['info-item']">
        <span :class="$style['info-item-label']">{{ item.label }}</span>
        <span :class="[$style['info-item-value'], item.class]">{{ item.value || '-' }}</span>
      </div>
      <a-skeleton
        v-else
        active
        :paragraph="{ rows: 5, width: '100%' }"
        :title="false"
        :class="$style['skeleton-info-list']"
      />
    </Card>
  </div>
</template>
<script lang="ts" setup>
import { getUserInfo, getPublicImage } from '~/api'
import Card from './Card.vue'
import AccountCircle from '~/containers/knowledge-base/images/AccountCircle.vue'

const userInfo = ref<{ [key: string]: any }>()
const infoList = ref<{ label: string; value: any; class?: any }[]>([])

onMounted(() => {
  getData()
})

const getData = async () => {
  const { data } = await getUserInfo()
  userInfo.value = data
  if (userInfo.value) {
    const { account, mobile, company, email, hasPassword } = userInfo.value
    infoList.value = [
      { label: '账号名', value: account },
      { label: '手机号', value: mobile },
      {
        label: '密码',
        value: hasPassword ? '已设置' : '未设置',
        class: hasPassword ? 'set-password' : 'no-password'
      },
      { label: '邮箱', value: email }
      // { label: '公司', value: company }
    ]
  }
}
</script>
<style lang="less" module>
.user-info-wrapper {
  background-color: #fff;
  .user-info-header {
    display: flex;
    height: 120px;
    background: #c9d6e7;
    border-radius: 2px 2px 0px 0px;
    backdrop-filter: blur(10px);
    .user-name-box {
      flex: 1 1 auto;
      overflow: hidden;
      padding: 38px 20px 34px;
      .user-name {
        margin-bottom: 4px;
        font-size: 18px;
        line-height: 24px;
        font-weight: bold;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .info-desc {
        line-height: 20px;
        color: var(--text-gray-color);
      }
    }
    .user-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 72px;
      height: 72px;
      margin: 24px;
      background-color: #e1e4eb;
      border-radius: 50%;
      overflow: hidden;
      .avatar-img {
        width: 40px;
        height: 40px;
        color: #fff;
      }
      img {
        max-width: 100%;
        max-height: 100%;
      }
    }
  }
  .page-right-user {
    .info-item {
      display: flex;
      margin-top: 12px;
      &:first-child {
        margin-bottom: 20px;
      }
    }
    .info-item-label {
      width: 72px;
      color: #858c99;
    }
    .info-item-value {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    :global {
      .set-password {
        color: #11a35f;
      }
      .no-password {
        color: #d94141;
      }
    }
  }
  .skeleton-info-list {
    width: 80%;
    margin-top: 20px;
    :global {
      .ant-skeleton-paragraph {
        margin: 0;
        li {
          height: 20px;
          & + li {
            margin-top: 12px;
          }
        }
      }
    }
  }
}
</style>
