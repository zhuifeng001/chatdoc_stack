<template>
  <a-modal
    v-model:open="loginModalVisible"
    destroyOnClose
    :centered="true"
    :closable="true"
    :maskClosable="false"
    :keyboard="false"
    :footer="null"
    :width="800"
    :wrapClassName="$style['login-modal']"
  >
    <div :class="$style['login-wrap']">
      <div :class="$style['login-left']">
        <div :class="$style['left-label']">个人知识管理助手</div>
        <div :class="$style['left-desc']">
          集成公开知识库及用户个人知识，运用行业领先文档解析引擎及检索召回策略，为用户提供专业准确的信息检索、文档内容解读及文本内容生成服务，提升知识工作者知识应用及生成效率。
        </div>
      </div>
      <div :class="$style['login-right']">
        <Close :class="$style['close-modal']" @click="loginModalVisible = false" />
        <div :class="$style['right-label']">
          <!-- <span
            :class="{ [$style['label-item-active']]: formState.type === 'phone' }"
            @click="formState.type = 'phone'"
          >
            验证码登录
          </span> -->
          <span
            :class="{ [$style['label-item-active']]: formState.type === 'password' }"
            @click="formState.type = 'password'"
          >
            密码登录
          </span>
        </div>
        <a-form ref="FormRef" :class="$style['login-form']" :model="formState">
          <template v-if="formState.type === 'password'">
            <a-form-item label="" name="account" :rules="[{ required: true, message: '请输入账号' }]">
              <a-input
                v-model:value="formState.account"
                placeholder="请输入账号"
                :class="$style['username-input']"
                @change="validateForm(['account'])"
              >
                <template v-slot:suffix> <User /></template>
              </a-input>
            </a-form-item>
            <a-form-item label="" name="password" :rules="[{ required: true, message: '请输入密码' }]">
              <a-input-password
                v-model:value="formState.password"
                placeholder="请输入密码"
                @change="validateForm(['password'])"
                @pressEnter="onLogin"
              />
            </a-form-item>
          </template>
          <template v-else-if="formState.type === 'phone'">
            <a-form-item
              label=""
              name="mobile"
              :autoLink="false"
              :rules="[
                { required: true, message: '请输入手机号' },
                { pattern: mobileRegEx, message: '手机号格式不正确' }
              ]"
            >
              <a-input
                v-model:value="formState.mobile"
                placeholder="手机号"
                :class="$style['username-input']"
                @blur="validateForm(['mobile'])"
              >
                <template v-slot:prefix>
                  <PhonePrefix
                    v-model:value="formState.mobileAreaCode"
                    style="width: 70px"
                    :bordered="false"
                    size="small"
                    :class="$style['phone-prefix']"
                  />
                </template>
              </a-input>
            </a-form-item>
            <a-form-item
              label=""
              name="code"
              :autoLink="false"
              :rules="[
                { required: true, message: '请输入验证码' },
                { min: 6, max: 6, message: '验证码长度不正确' }
              ]"
            >
              <a-input
                v-model:value="formState.code"
                placeholder="验证码"
                autocomplete="off"
                @blur="validateForm(['code'])"
                @pressEnter="onLogin"
              >
                <template v-slot:suffix>
                  <a-button type="link" @click.stop="sendMobileCode" :class="$style['send-code']">
                    {{ count ? `${count} 后重新发送` : '获取验证码' }}
                  </a-button>
                </template>
              </a-input>
            </a-form-item>
          </template>
          <a-form-item>
            <a-button type="primary" :class="$style['login-btn']" :loading="loading" @click="onLogin"
              >登录/注册</a-button
            >
          </a-form-item>
        </a-form>
      </div>
    </div>
  </a-modal>
</template>
<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue'
import { useUser } from '../store/useUser'
import { storeToRefs } from 'pinia'
import { Close, Down, User } from '@icon-park/vue-next'
import { message } from 'ant-design-vue'
import { md5Salt } from '@/utils/crypto'
import { useCountDown } from '../hooks/useCountDown'
import { sendSMS } from '@/api/knowledge-base'
import { useLockFn } from '../hooks/useLockFn'
import PhonePrefix from './login/PhonePrefix.vue'
import { useGlobal } from '~/store'

const router = useRouter()
const route = useRoute()

const useGlobalStore = useGlobal()
const { selectIds } = storeToRefs(useGlobalStore)

const userStore = useUser()
const { loginModalVisible } = storeToRefs(userStore)

const formState = reactive({
  type: 'password',
  account: 'admin',
  password: 'admin',
  agreeLicense: false,
  mobileAreaCode: '86',
  mobile: '',
  code: ''
})

const { count, start: startCountDown } = useCountDown()

const FormRef = ref()
const loading = ref()
watch([loginModalVisible], () => {
  formState.agreeLicense = false
  FormRef.value?.resetFields()
})
const validateForm = (name?: string | string[]) => {
  nextTick(() => {
    FormRef.value.validateFields(name)
  })
}
const onLogin = useLockFn(() => {
  FormRef.value
    .validate()
    .then(() => {
      const params =
        formState.type === 'phone'
          ? {
              mobileAreaCode: formState.mobileAreaCode,
              mobile: formState.mobile,
              code: formState.code
            }
          : {
              account: formState.account,
              password: md5Salt(formState.password, '')
            }
      loading.value = true
      userStore
        .login(params)
        .then(() => {
          loading.value = false
          loginModalVisible.value = false
          const data = selectIds.value
          track({ name: '登录', keyword: formState.type === 'phone' ? '手机号登录' : '密码登录' })

          if (data) {
            router.push({ name: 'knowledge-base', state: { data: JSON.stringify(data) } })
            selectIds.value = undefined
          } else {
            setTimeout(() => {
              location.reload()
            }, 300)
          }
        })
        .catch(() => {
          loading.value = false
        })
    })
    .catch(() => {})
})

const sendMobileCode = useLockFn(async () => {
  await sendSMS({ mobile: formState.mobile, mobileAreaCode: formState.mobileAreaCode })
  startCountDown()
})
</script>
<style lang="less" module>
.login-modal {
  :global {
    .ant-modal-content {
      background: #ffffff;
      box-shadow: 0px 6px 18px 0px rgba(3, 10, 26, 0.12);
      border-radius: 8px;
      overflow: hidden;
    }
    .ant-modal-body {
      padding: 0;
      overflow: hidden;
    }
  }

  .login-wrap {
    width: 800px;
    height: 540px;

    display: flex;
    align-items: stretch;

    .login-left {
      width: 360px;
      padding: 60px;
      background: url(../images/login-bg.png) no-repeat 100% 96%;

      .left-label {
        margin-bottom: 30px;
        font-size: 25px;
        font-weight: normal;
        color: #000000;
        line-height: 15px;
      }

      .left-desc {
        font-size: 14px;
        font-weight: 400;
        color: #000000;
        line-height: 20px;
      }
    }

    .login-right {
      position: relative;
      padding: 60px;
      .right-label {
        margin-bottom: 40px;
        font-size: 20px;
        color: #000000;
        line-height: 28px;

        & > span {
          padding-right: 20px;
          cursor: pointer;
        }
        .label-item-active {
          font-weight: 600;
        }
      }

      .close-modal {
        position: absolute;
        padding: 6px;
        right: 20px;
        top: 20px;
        color: #969ca7;
        cursor: pointer;

        &:hover {
          background: #f2f4f7;
          border-radius: 4px;
        }

        svg {
          width: 14px;
          height: 14px;
        }
      }
    }
  }
}

.login-form {
  width: 320px;

  .username-input {
    :global {
      .ant-select-selector {
        padding-left: 0 !important;
      }
      .ant-input-suffix {
        color: rgba(0, 0, 0, 0.45);
        cursor: pointer;

        &:hover {
          color: rgba(0, 0, 0, 0.85);
        }
      }
    }
  }

  .phone-prefix {
    :global {
      .ant-select-selection-item {
        overflow: visible;
      }
    }
  }

  .active {
    color: var(--primary-color);
  }

  .login-btn {
    width: 100%;
    height: 40px;
    background: var(--primary-color);
    border-radius: 4px;
  }

  :global {
    input::-webkit-inner-spin-button {
      -webkit-appearance: none !important;
    }

    .ant-input-affix-wrapper {
      padding: 8px 11px;
    }

    .ant-select-lg,
    .ant-btn-lg,
    .ant-input-lg {
      font-size: 14px;
    }

    .ant-input-lg {
      padding: 8px 11px;
    }

    .ant-btn-lg {
      border-left: transparent;
    }
  }

  .send-code {
    padding: 0;
    height: 22px;
  }

  .textin-login-btn {
    margin-top: 16px;
    width: 100%;
    height: 40px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;

    .textin-icon {
      margin-right: 6px;
      width: 16px;
      height: 16px;
    }
  }
}
</style>
