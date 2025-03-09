<template>
  <div id="PageFooter" :class="$style['page-footer']">
    <div :class="$style['footer_wrapper']">
      <div :class="$style['footer_content']">
        <div :class="$style['footer_bottom']">
          <div :class="$style['company-info']">
            <div :class="$style['company-certificate']">
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style lang="less" module>
.page-footer {
  width: 100%;
  background: #f2f5fa;
}
.footer_wrapper {
  margin: 0 auto;
  display: flex;
  justify-content: center;
  padding: 16px 50px 12px;
  max-width: var(--max-width);
  font-size: 12px;
  :global {
    span,
    div {
      font-size: 12px;
    }
  }

  .footer_content {
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-width: 100%;

    .footer-title {
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      .kb-name {
        margin-left: 10px;
        font-size: 18px;
        font-weight: 600;
        color: #000;
        line-height: 18px;
      }
    }

    .footer_top,
    .footer_center,
    .footer_bottom {
      position: relative;
      display: flex;
    }
    .footer_top {
      margin-bottom: 60px;
      .desc_title {
        margin-bottom: 30px;
        color: #030a1a;
        font-weight: bold;
      }
      .desc_container {
        display: flex;
        flex-direction: column;
        color: #858c99;
        font-size: 12px;
        cursor: pointer;
        .link_item a {
          display: block;
          color: #858c99;
        }
        & .link_item:hover a {
          color: #1a66ff;
        }
        :global {
          .text_fix_width {
            width: 121px;
          }
        }
      }
    }
    .foot_center {
      color: #858c99;
      font-size: 12px;
      // cursor: pointer;
      .iconphone {
        width: 20px;
        height: 20px;
        margin-right: 10px;
      }
      .phone {
        color: #030a1a;
        font-size: 12px;
        line-height: 22px;
      }
      .working-time {
        margin-left: 20px;
        line-height: 22px;
      }
    }
    .left {
      position: relative;
      width: 570px;
      img {
        cursor: pointer;
      }
    }
    .right {
      display: flex;
      flex: 1;
      justify-content: flex-end;
    }
    .footer_logo {
      width: 186px;
      height: 100px;
    }
  }
  .company-info {
    color: #666;
    font-weight: 400;
    font-size: 12px;
    a {
      color: #858c99;
      text-decoration: underline;
      font-size: 12px;
    }
    a:hover {
      text-decoration: underline;
      cursor: pointer;
      color: #1a66ff;
    }
  }
  .company-certificate {
    position: absolute;
    right: 0;
    bottom: -0;
  }
  .leftFontBox {
    width: 182px;
    height: 70px;
    margin-top: 13px;
    padding: 12px 20px;
    background: #dcdfe5;
    border-radius: 4px;
    cursor: pointer;
    opacity: 0.7;
  }
  .leftBtm {
    position: absolute;
    top: 77px;
    left: 20px;
    cursor: pointer;
    p {
      margin: 0;
    }
  }
  .leftTitle {
    width: 142px;
    height: 22px;
    margin-bottom: 4px;
    color: #030a1a;
    font-weight: bold;
    font-size: 16px;
    line-height: 22px;
    text-align: justify;
    opacity: 1 !important;

    &::after {
      display: inline-block;
      padding-left: 99%;
      content: '';
    }
  }
  .leftContent {
    width: 142px;
    height: 20px;
    color: #858c99;
    font-weight: 400;
    font-size: 12px;
    line-height: 20px;
    text-align: justify;

    &::after {
      display: inline-block;
      padding-left: 99%;
      content: '';
    }
  }
  .linkText {
    height: 20px;
    color: #858c99;
    font-weight: 400;
    font-size: 12px;
    line-height: 20px;
  }
  .linkText:hover {
    color: #1a66ff;
  }
}

.footerToolTip {
  max-width: 100% !important;
  :global {
    .ant-tooltip-inner,
    .ant-tooltip-arrow-content {
      background-color: #fff;
    }
  }
}
.footer-dark {
  background: #030a1a;
  .desc_title,
  .phone,
  .leftTitle {
    color: #fff !important;
  }
  .leftFontBox {
    opacity: 0.2 !important;
  }
  :global {
    .ant-divider {
      opacity: 0.3;
    }
  }
}
</style>
