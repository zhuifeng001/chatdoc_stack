<template>
  <div :class="$style.wrapper">
    <div :class="$style.centerWrap">
      <a-popover placement="leftBottom" :overlayClassName="$style.wechatCodePopover">
        <template v-slot:content>
          <div :class="$style.wechatCode">
            <div :class="$style.wechatCodeTitle">IntFinQ 用户交流群</div>
            <div :class="$style.wechatCodeImg">
              <NuxtImg
                format="webp"
                src="/assets/images/financial/wechat-group-240808.png"
                alt=""
                width="132px"
                height="132px"
              />
            </div>
            <div :class="$style.wechatCodeDesc">微信扫码加入官方用户交流群</div>
            <div :class="$style.wechatCodeTag">
              <div>
                <span>产品咨询</span>
              </div>
              <div>
                <span>问题沟通</span>
              </div>
            </div>
            <div :class="$style.wechatCodeTag">
              <div>
                <span>使用交流</span>
              </div>
              <div>
                <span>活动优惠</span>
              </div>
            </div>
          </div>
        </template>
        <div :class="$style.wechat">
          <div :class="$style.icon">
            <NuxtImg format="webp" src="/assets/images/financial/wechat.png" alt="" width="24px" height="24px" />
          </div>
          <div :class="$style.textWrapper">
            <span>官方社群</span>
          </div>
        </div>
      </a-popover>
    </div>
  </div>
</template>
<script lang="ts" setup></script>
<style lang="less" module>
@text-color: #333;
@primary-color: var(--primary-color);
@divider-color: #999;
@text-gray-color: #666;

.wrapper {
  position: fixed;
  right: 0;
  bottom: 80px;
  z-index: 10;

  .wrapper-common {
    background: linear-gradient(138deg, #e5eaf2 0%, #f5f8fc 100%);
    border: 1px solid #fff;
    border-radius: 4px 0 0 4px;
    box-shadow: 0 4px 12px 0 rgba(6, 6, 26, 0.1), 0 0 20px -15px rgba(19, 18, 60, 0.14);
  }

  .contactWrapper {
    .wrapper-common;
  }

  .bottomBox {
    width: 48px;
    height: 120px;
    background: linear-gradient(360deg, #1a66ff 0%, #389fff 100%);
    border-radius: 4px 0 0 4px;
    box-shadow: 4px 4px 8px 0 rgba(3, 10, 26, 0.1), -4px -4px 8px 0 rgba(255, 255, 255, 0.08),
      0 4px 12px 0 rgba(6, 6, 26, 0.1), 0 0 20px -15px rgba(19, 18, 60, 0.14), inset 0 0 3px 0 rgba(255, 255, 255, 0.5);
  }

  .parentBox {
    width: 48px;
    height: 120px;
    overflow: hidden;
    background: linear-gradient(315deg, rgba(255, 255, 255, 0), rgba(187, 212, 254, 1));
    border-radius: 4px 0 0 4px;

    .contactBtn {
      width: 47px;
      height: 118px;
      margin: 1px;
      padding: 16px;
      background: linear-gradient(360deg, #1a66ff 0%, #389fff 100%);
      border-radius: 4px 0 0 4px;

      p {
        width: 16px;
        height: 88px;
        margin: 0;
        color: #fff;
        font-weight: 600;
        font-size: 16px;
        line-height: 22px;
        text-shadow: 4px 4px 8px rgba(3, 10, 26, 0.1), -4px -4px 8px rgba(255, 255, 255, 0.08);
      }
    }
  }

  .centerShadow {
    position: absolute;
    top: 50px;
    right: 0;
    width: 48px;
    height: 48px;
    border-radius: 4px;
    box-shadow: 0 4px 12px 0 rgba(6, 6, 26, 0.1), 0 0 20px -15px rgba(19, 18, 60, 0.14);
  }

  .centerWrapDic {
    position: absolute;
    top: -100px;
    right: 0;
    width: 70px;
    height: 70px;
    overflow: hidden;
    border-radius: 4px 0 0 4px;
    cursor: pointer;

    .closeIcon {
      position: absolute;
      top: 1px;
      right: 1px;
      z-index: 1;
      display: block;
      width: 10px;
      height: 10px;
    }
  }

  .centerWrap {
    height: 50px + 50px + 12px;
    margin-top: 50px;
    margin-bottom: 16px;
    // padding-top: 50px;
    overflow: hidden;
    border-radius: 4px 0 0 4px;

    &.noCenter {
      padding-top: 50px + 12px;
    }

    .wechat {
      .wrapper-common;

      position: relative;
      padding: 4px;
      width: 56px;
      height: 56px;
      margin-bottom: 12px;
      box-shadow: none;
      cursor: pointer;
      text-align: center;

      .icon {
        margin: 6px auto 0;
      }

      .textWrapper {
        position: absolute;
        right: -1px;
        // bottom: -1px;
        left: -1px;
        height: 15px;
        // background: linear-gradient(360deg, #1a66ff 0%, #389fff 100%);
        // border-radius: 0 0 0 4px;

        span {
          .text;

          color: @primary-color;
          line-height: 15px;
        }
      }
    }

    .center {
      .wrapper-common;

      position: relative;
      width: 48px;
      height: 48px;
      box-shadow: none;
      cursor: pointer;

      .icon {
        margin: 6px auto 0;
      }

      &:hover .icon {
        animation: iconAnimate 1.6s;

        @keyframes iconAnimate {
          0% {
            transform: translate3d(0, 0, 0) scale(1) rotateZ(0);
          }

          25% {
            transform: translate3d(10px, -50px, 0) scale(0.5) rotateZ(0);
          }

          47% {
            transform: translate3d(0, 0, 0) scale(1) rotateZ(180deg);
          }

          50% {
            transform: translate3d(0, 0, 0) scale(1) rotateZ(180deg);
          }

          65% {
            transform: translate3d(-20px, 30px, 0) scale(1.2) rotateZ(180deg);
          }

          90% {
            transform: translate3d(-20px, 30px, 0) scale(1.2) rotateZ(0);
          }

          100% {
            transform: translate3d(0, 0, 0) scale(1) rotateZ(0);
          }
        }
      }

      .textWrapper {
        position: absolute;
        right: -1px;
        bottom: -1px;
        left: -1px;
        height: 15px;
        background: linear-gradient(360deg, #1a66ff 0%, #389fff 100%);
        border-radius: 0 0 0 4px;

        span {
          .text;

          color: #fff;
          line-height: 15px;
        }
      }
    }
  }

  .contact {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 46px;
    height: 46px;
    cursor: pointer;

    .hoverBox {
      position: absolute;
      top: 0;
      right: -1px;
      display: flex;
      align-items: center;
      width: 0;
      height: 48px;
      padding: 12px 0;
      overflow: hidden;
      color: #fff;
      font-weight: bold;
      font-size: 14px;
      line-height: 24px;
      white-space: nowrap;
      background-color: @primary-color;
      border-radius: 4px 0 0 4px;
      box-shadow: 4px 4px 8px 0 rgba(3, 10, 26, 0.1), -4px -4px 8px 0 rgba(255, 255, 255, 0.08);
      transition: width 0.4s;

      .hoverText {
        padding-right: 20px;
        padding-left: 8px;
      }

      :global {
        .anticon {
          margin-left: 12px;
          font-size: 24px;
        }
      }
    }

    &:first-child .hoverBox {
      top: -1px;
    }

    &:hover .hoverBox {
      width: 120px;
    }

    &.phone:hover .hoverBox {
      width: 164px;
    }

    &:not(:last-child)::before {
      position: absolute;
      right: 12px;
      bottom: 0;
      left: 12px;
      height: 1px;
      background-color: @divider-color;
      content: '';
    }
  }

  .messageIcon {
    position: relative;

    &::after {
      position: absolute;
      top: 2px;
      right: 2px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      animation: shadowAnimate 1.5s infinite;
      content: '';
    }

    @keyframes shadowAnimate {
      0% {
        box-shadow: 0 0 0 0 rgba(229, 82, 69, 0.7);
        opacity: 1;
      }

      70% {
        box-shadow: 0 0 0 8px rgba(229, 82, 69, 0.7);
        opacity: 0;
      }

      100% {
        opacity: 0;
      }
    }
  }

  .phone {
    cursor: default;

    .hoverText {
      font-size: 22px;
      font-family: 'CondensedBold';

      .split {
        opacity: 0.5;
      }
    }
  }

  .backTop {
    .wrapper-common;

    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    cursor: pointer;

    .icon {
      :global {
        .anticon {
          color: #475266;
        }
      }
    }

    &:hover .icon {
      :global {
        .anticon {
          color: @primary-color;
        }
      }
    }
  }
}

.icon {
  position: relative;
  width: 24px;
  height: 24px;

  :global {
    .anticon {
      color: @primary-color;
      font-size: 24px;
    }
  }
}

.text {
  display: block;
  font-weight: bold;
  font-size: 12px;
  white-space: nowrap;
  transform: scale(0.83);
}

.popoverPop {
  :global {
    .ant-popover-inner-content {
      padding: 0;
      background-color: #fff;
      border-radius: 4px;
    }

    .ant-popover-inner {
      border-radius: 4px;
      box-shadow: none;
    }

    .ant-popover-content {
      border-radius: 4px;
    }
  }

  .tipContent {
    width: 280px;
    height: 202px;
    padding: 11px 0;
    background: #fff;
    border-radius: 4px;
    box-shadow: 0 6px 18px 0 rgba(3, 10, 26, 0.12);

    .hoverBox {
      position: relative;

      .messageHoverBox {
        width: 100%;
        height: 60px;
        padding: 10px 0 10px 20px;

        .messageIcon {
          width: 40px;
          height: 40px;
          background-image: url('/images/bridge/icon-circle-message.png');
          background-size: 40px 40px;
        }

        .circular {
          position: absolute;
          right: 0;
          bottom: 2px;
          width: 10px;
          height: 10px;
          background: #1a66ff;
          border: 2px solid #fff;
          border-radius: 10px;
        }
      }

      .phoneHoverBox {
        width: 100%;
        height: 60px;
        padding: 10px 0 10px 20px;

        .phoneIcon {
          width: 40px;
          height: 40px;
          background-image: url('/images/bridge/icon-phone-default.svg');
          background-size: 40px 40px;
        }
      }

      .editHoverBox {
        width: 100%;
        height: 60px;
        padding: 10px 0 10px 20px;

        .editIcon {
          width: 40px;
          height: 40px;
          background-image: url('/images/bridge/icon-message-default.svg');
          background-size: 40px 40px;
        }
      }

      .icon {
        display: inline-block;
        width: 40px;
        height: 40px;
        margin-right: 12px;
        background: #f2f5fa;
        border-radius: 50%;

        :global {
          .anticon {
            color: @primary-color;
            font-size: 24px;
          }
        }
      }

      .contentText {
        position: absolute;
        display: inline-block;

        .titleText {
          display: block;
          width: 84px;
          height: 20px;
          color: #030a1a;
          font-weight: 500;
          font-size: 14px;
          line-height: 20px;
        }

        .hoverText {
          display: block;
          width: 100%;
          height: 17px;
          color: #858c99;
          font-weight: 400;
          font-size: 12px;
          line-height: 17px;
        }
      }
    }

    .messageHoverBox:hover {
      background: linear-gradient(270deg, #fff 0%, #e9f0ff 100%);
      cursor: pointer;

      .messageIcon {
        background-image: url('/images/bridge/icon-circle-message-hover.png');
        transition-duration: 0.5s;
      }

      .hoverText {
        color: #1a66ff;
      }
    }

    .phoneHoverBox:hover {
      background: linear-gradient(270deg, #fff 0%, #e9f0ff 100%);
      cursor: pointer;

      .phoneIcon {
        background-image: url('/images/bridge/icon-phone-hover.svg');
        transition-duration: 0.5s;
      }

      .hoverText {
        color: #1a66ff;
      }
    }

    .editHoverBox:hover {
      background: linear-gradient(270deg, #fff 0%, #e9f0ff 100%);
      cursor: pointer;

      .editIcon {
        background-image: url('/images/bridge/icon-message-hover.svg');
        transition-duration: 0.5s;
      }

      .hoverText {
        color: #1a66ff;
      }
    }
  }
}

.wechatCodePopover {
  :global {
    .ant-popover-inner {
      border-radius: 4px;
      box-shadow: 0 6px 18px 0 rgba(3, 10, 26, 0.12);
    }
    .ant-popover-inner-content {
      padding: 0;
    }
  }
  .wechatCode {
    position: relative;
    padding: 28px;
    white-space: nowrap;
    text-align: center;

    .wechatCodeTitle {
      margin-bottom: 10px;
      color: @text-color;
      font-weight: bold;
      font-size: 16px;
    }

    .wechatCodeImg {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .wechatCodeDesc {
      margin: 10px 0;
      color: @text-gray-color;
      font-size: 12px;
    }

    .wechatCodeTag {
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: @primary-color;
      font-weight: bold;
      font-size: 12px;

      &:not(:last-child) {
        margin-bottom: 4px;
      }

      div {
        flex: 1 1 auto;
        line-height: 20px;
        text-align: center;
        background: #e9f0ff;
        border-radius: 3px;

        span {
          transform: scale(0.93);
        }

        &:last-child {
          margin-left: 12px;
        }
      }
    }
  }
}
</style>
