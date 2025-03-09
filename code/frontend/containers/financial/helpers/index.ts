// 生成行业过滤数组
const industries = [
  '信息技术',
  '金融',
  '医药生物',
  '电子设备',
  '文化传媒',
  '建筑建材',
  '电气设备',
  '基础化工',
  '食品饮料',
  '机械设备',
  '交通运输',
  '公共事业',
  '房地产',
  '商贸零售',
  '轻工制造',
  '化石能源',
  '有色金属',
  '交运设备',
  '农林牧鱼',
  '家用电器',
  '休闲服务',
  '纺织服装',
  '钢铁',
  '国防军工',
  '电气设备'
]

// 生成报告类型数组
const reportTypes = ['季报', '中报', '年报']

export const hotKeywords = ['科大讯飞', '东方财富', '茅台', '森马', '红星美凯龙']

// 生成包含name和id的对象数组
export const industriesData = industries.map(industry => {
  return {
    name: industry,
    id: Math.floor(Math.random() * 1000) + 1
  }
})

export const reportTypesData = reportTypes.map(type => {
  return {
    name: type,
    id: Math.floor(Math.random() * 1000) + 1
  }
})

export enum FixedDateEnums {
  THREE_MONTH = 'THREE_MONTH', // 最近三个月
  SIX_MONTH = 'SIX_MONTH', // 最近半年
  ONE_YEAR = 'ONE_YEAR', // 最近一年
  TWO_YEAR = 'TWO_YEAR', // 最近两年
  CUSTOM = 'CUSTOM', // 自定义
  ALL = '' // 自定义
}
