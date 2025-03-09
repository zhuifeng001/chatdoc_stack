// 获取用户浏览器的User Agent字符串
const userAgent = globalThis.navigator?.userAgent;

// 判断是否是Windows
export const isWindows = /Windows/.test(userAgent);

// 判断是否是Mac
export const isMac = /Macintosh/.test(userAgent);

export const isMobile = () => {
  if (globalThis.navigator?.userAgent.toLowerCase().match(/ipad|tablet/)) {
    return false;
  }
  if (
    globalThis.navigator?.userAgent
      .toLowerCase()
      .match(
        /android|iphone|mobile|blackberry|configuration\/cldc|hp |hp-|htc |htc_|htc-|kindle|midp|mmp|motorola|nokia|opera mini|opera |YahooSeeker\/M1A1-R2D2|ipod|mobi|palm|palmos|pocket|portalmmm|ppc;|smartphone|sonyericsson|sqh|spv|symbian|treo|up.browser|up.link|vodafone|windows ce|xda |xda_/i
      )
  ) {
    return true;
  }
  return false;
};
