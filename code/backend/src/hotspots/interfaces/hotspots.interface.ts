export interface IHotspots {
  [key: string]: unknown;
  companies?: string[]; // 热门公司全称
  alias?: string[]; // 热门公司简称
}