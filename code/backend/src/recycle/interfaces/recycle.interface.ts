export interface IRecycleSourcePosition {
  type: RecycleTypeEnum;
  id: number;
}

export enum RecycleTypeEnum {
  'library' = 1,
  'folder' = 2,
  'document' = 3,
}

export interface IRecycleSource {
  id: number;
  name: string;
  type: RecycleTypeEnum;
  children?: IRecycleSourcePosition[];
}

export enum RecycleSortField {
  'createTime' = 'createTime',
  'name' = 'name',
}
