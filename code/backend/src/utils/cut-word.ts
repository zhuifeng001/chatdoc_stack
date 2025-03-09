import { Logger } from '@nestjs/common';
import axios from 'axios';
import { cut, add_word } from 'jieba-wasm';

export const keywordRuleListSet = [
  ['半年报', '半年度报告'],
  ['年报', '年度报告'],
  [
    'q1',
    'Q1',
    '1季报',
    '一季报',
    '第1季报',
    '第一季报',
    '1季度报告',
    '一季度报告',
    '第1季度报告',
    '第一季度报告',
  ],
  [
    'q3',
    'Q3',
    '3季报',
    '三季报',
    '第3季报',
    '第三季报',
    '3季度报告',
    '三季度报告',
    '第3季度报告',
    '第三季度报告',
  ],
  ['季报', '季度报告'],
  ['招股书', '招股说明书'],
];

for (const keywords of keywordRuleListSet) {
  for (const key of keywords) {
    add_word(key);
  }
}

const companyNameSet = ['科大讯飞', '东方财富'];
for (const key of companyNameSet) {
  add_word(key);
}

/**
 * https://npmjs.com/package/jieba-wasm
 * @param keyword 中文分词
 * @returns
 */
export const cutWord = (keyword: string) => {
  return cut(keyword, true);
};

/**
 * 调用问题解析接口，得到公司、年份、关键词的列表
 * @param keyword
 * @returns
 */
export const analystKeyword = async (
  keyword: string
): Promise<
  { companies: string[]; years: string[]; keywords: string[]; finance_types: string[] } | undefined
> => {
  const url = process.env.CHATDOC_PROXY_URL + '/analyst/query';
  const startTime = new Date();
  const res = await axios.post(url, { input: keyword });
  Logger.log(keyword + ' >>> ' + JSON.stringify(res.data), 'AnalystKeyword');
  Logger.log(`Elapsed time ${new Date().getTime() - startTime.getTime()}ms`, 'AnalystKeyword');
  return res.data;
};

export const filterWords = [
  '信息',
  '科技',
  '有限',
  '公司',
  '股份',
  '电气',
  '电器',
  '保险',
  '控股',
  '集团',
  '制药',
  '智能',
  '证券',
  '有限公司',
  '科技股份',
  '网络',
  '网络科技',
  '数据',
  '报告',
  'pdf',
];

if (require.main === module) {
  // const st = +new Date();
  console.log('tokenize_words', cutWord('中航一'));
  // console.log('Elapsed time', +new Date() - st);
  // analystKeyword('这两年腾讯的季报');
}
