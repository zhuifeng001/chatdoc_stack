import * as _ from 'lodash';
import { Document } from '@/document/entities/document.entity';
import { RecycleTypeEnum } from '@/recycle/interfaces/recycle.interface';
import { Folder } from '@/folder/entities/folder.entity';
import { Library } from '@/library/entities/library.entity';
import { SortEnum } from '@/document/dto/document.dto';
import { SortField } from '@/folder/interfaces/folder.interface';

const getTargetSubFromTree = (node, targetId): number[] => {
  if (Array.isArray(targetId) ? targetId.includes(node.id) : node.id === targetId) {
    return [
      node.id,
      ...node.children.reduce((pre, item) => [...pre, ...getTargetSubFromTree(item, item.id)], []),
    ];
  }
  return [];
};

export const getSubFolders = (folders, targetId): number[] => {
  const treeMap = {};
  for (const folderItem of folders) {
    if (!treeMap[folderItem.id]) {
      treeMap[folderItem.id] = { id: folderItem.id, children: [] };
    }
    if (folderItem.parentId) {
      if (!treeMap[folderItem.parentId]) {
        treeMap[folderItem.parentId] = { id: folderItem.parentId, children: [] };
      }
      treeMap[folderItem.parentId].children.push(treeMap[folderItem.id]);
    }
  }
  return Object.values(treeMap).reduce(
    (pre: number[], node) => [...pre, ...getTargetSubFromTree(node, targetId)],
    []
  ) as number[];
};

export const getChatTimeMap = (chatLogs) => {
  const extraInfo = { docs: {}, folders: {} };
  for (const chatRow of chatLogs) {
    if (Array.isArray(chatRow.context?.ids)) {
      for (const id of chatRow.context.ids) {
        const old = extraInfo.docs[id] ? [extraInfo.docs[id]] : [];
        extraInfo.docs[id] = Math.max(...old, new Date(chatRow.createTime).getTime());
      }
    }
    if (Array.isArray(chatRow.context?.folders)) {
      for (const id of chatRow.context.folders) {
        const old = extraInfo.folders[id] ? [extraInfo.folders[id]] : [];
        extraInfo.folders[id] = Math.max(...old, new Date(chatRow.createTime).getTime());
      }
    }
  }
  return extraInfo;
};

// 文档和目录组成树形结构
export const formatTree = (
  {
    libraries,
    folders,
    docs,
    extraInfo,
  }: {
    libraries?: Partial<Library>[];
    folders: Partial<Folder>[];
    docs: Partial<Document>[];
    extraInfo?: {
      docs?: Record<string, number>;
      folders: Record<string, number>;
      deleteIds: Record<string, number>;
    };
  },
  {
    detail,
    noDocument,
    returnAll,
    sort,
    sortType = SortEnum.DESC,
  }: {
    detail?: boolean;
    noDocument?: boolean;
    returnAll?: boolean;
    sort?: SortField;
    sortType?: SortEnum;
  } = {}
) => {
  const docFolderMap = {}; // 文件夹下的文档
  const docLibraryMap = {}; // 知识库根目录的文档
  const libraryCountMap = {}; // 知识库所有的文档
  const resetDocs = []; // 文件夹不在当前folders中的文档
  const existFolders = folders.reduce((pre, cur) => ({ ...pre, [cur.id]: true }), {});
  docs.forEach((cur) => {
    const row: Record<string, string | number> = { nodeType: RecycleTypeEnum.document, id: cur.id };
    if (detail) {
      Object.assign(row, _.omit(cur, ['id']));
    }
    if (sort) {
      row.chatTime = extraInfo?.docs?.[row.id];
    }
    if (cur.folderId) {
      if (docFolderMap[cur.folderId]) {
        docFolderMap[cur.folderId].push(row);
      } else if (existFolders[cur.folderId]) {
        docFolderMap[cur.folderId] = [row];
      } else {
        resetDocs.push(cur);
      }
    } else {
      if (docLibraryMap[cur.libraryId]) {
        docLibraryMap[cur.libraryId].push(row);
      } else {
        docLibraryMap[cur.libraryId] = [row];
      }
    }
    if (!libraryCountMap[cur.libraryId]) {
      libraryCountMap[cur.libraryId] = [];
    }
    libraryCountMap[cur.libraryId].push(cur.id);
  }, {});
  const sortHandle = (children) => {
    if (!Array.isArray(children)) return [];
    if (sort === SortField.recentUpdate) {
      return children.sort((a, b) =>
        sortType === SortEnum.ASC
          ? new Date(a.updateTime).getTime() - new Date(b.updateTime).getTime()
          : new Date(b.updateTime).getTime() - new Date(a.updateTime).getTime()
      );
    } else if (sort === SortField.recentUsed) {
      return children.sort((a, b) =>
        sortType === SortEnum.ASC
          ? new Date(a.chatTime || 0).getTime() - new Date(b.chatTime || 0).getTime()
          : new Date(b.chatTime || 0).getTime() - new Date(a.chatTime || 0).getTime()
      );
    }
    return children.sort((a, b) => (sortType === SortEnum.ASC ? a.sort - b.sort : b.sort - a.sort));
  };
  // 递归统计文件夹中的文件数量
  const cacheKey = {};
  const setFolderDocCount = (
    list: {
      id: number;
      children?: unknown[];
      nodeType: RecycleTypeEnum;
      documentCount?: number;
      [key: string]: unknown;
    }[]
  ) => {
    let total = 0;
    const chatTime = [];
    const updateTime = [];
    let documentSize = 0;
    if (Array.isArray(list)) {
      for (const item of list) {
        if (item.nodeType === RecycleTypeEnum.folder) {
          const curFolderDocs = docFolderMap[item.id] || [];
          let count = curFolderDocs.length; // 当前目录中的文件数
          let folderDocSize = curFolderDocs.reduce(
            (pre, cur) => pre + (cur.extraData?.documentSize || 0),
            0
          ); // 目录中文件size总和
          let subData;
          if (cacheKey[item.id]) {
            subData = cacheKey[item.id];
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            subData = setFolderDocCount(item.children as any);
            cacheKey[item.id] = subData;
          }
          count += subData.total; // 加 子目录中的文件数
          total += count;
          item.documentCount = count;

          folderDocSize += subData.documentSize;
          documentSize += folderDocSize;
          item.documentSize = folderDocSize;

          // 最近chat时间/最近更新时间
          const curChatTime = [];
          const curUpdateTime = [];
          curUpdateTime.push(...curFolderDocs.map((doc) => doc.updateTime));
          curUpdateTime.push(item.updateTime);
          if (extraInfo?.docs) {
            curChatTime.push(...curFolderDocs.map((doc) => extraInfo.docs[doc.id]));
          }
          if (extraInfo?.folders) {
            curChatTime.push(extraInfo.folders[item.id]);
          }
          if (extraInfo?.deleteIds) {
            curUpdateTime.push(extraInfo?.deleteIds[item.id]);
          }
          curChatTime.push(...subData.chatTime);
          curUpdateTime.push(...subData.updateTime);

          const chatTimeList = curChatTime.filter((item) => item);
          // 最近使用时间
          item.chatTime = chatTimeList.length
            ? new Date(Math.max(...chatTimeList.map((item) => new Date(item).getTime())))
            : undefined;
          const updateTimeList = curUpdateTime.filter((item) => item);
          // 最近更新时间
          item.updateTime = updateTimeList.length
            ? new Date(Math.max(...updateTimeList.map((item) => new Date(item).getTime())))
            : undefined;

          // 排序
          item.children = sortHandle(item.children);
        }
      }
    }
    return { total, chatTime, updateTime, documentSize };
  };
  // 是否隐藏文档
  const getDoc = (list: Partial<Document>) => {
    if (noDocument || !Array.isArray(list)) return [];
    return [...list];
  };
  const folderTree = {}; // 文件夹树形结构数据
  const levelOneFolder = {}; // 根目录文件夹
  for (const folderItem of folders) {
    if (!folderTree[folderItem.id]) {
      folderTree[folderItem.id] = {
        id: folderItem.id,
        nodeType: RecycleTypeEnum.folder,
        children: getDoc(docFolderMap[folderItem.id]),
      };
    }
    if (detail) {
      Object.assign(folderTree[folderItem.id], _.omit(folderItem, ['id', 'children']));
    }
    if (folderItem.parentId) {
      if (!folderTree[folderItem.parentId]) {
        folderTree[folderItem.parentId] = {
          id: folderItem.parentId,
          nodeType: RecycleTypeEnum.folder,
          children: [],
        };
        folderTree[folderItem.parentId].children.push(...getDoc(docFolderMap[folderItem.parentId]));
      }
      folderTree[folderItem.parentId].children.push(folderTree[folderItem.id]);
    } else if (folderItem.libraryId) {
      if (!levelOneFolder[folderItem.libraryId]) {
        levelOneFolder[folderItem.libraryId] = [];
      }
      levelOneFolder[folderItem.libraryId].push(folderTree[folderItem.id]);
    }
  }
  let result;
  if (Array.isArray(libraries)) {
    result = [];
    for (const library of libraries) {
      const children = sortHandle([
        ...(levelOneFolder[library.id] || []),
        ...getDoc(docLibraryMap[library.id]),
      ]);
      setFolderDocCount(children);
      const row = { nodeType: RecycleTypeEnum.library, id: library.id };
      if (detail) {
        Object.assign(row, _.omit(library, ['id']));
      }
      result.push({ ...row, children, documentCount: libraryCountMap[library.id]?.length || 0 });
    }
  } else {
    if (detail) {
      for (const key in folderTree) {
        setFolderDocCount([folderTree[key]]);
      }
    }
    if (returnAll) {
      result = Object.values(folderTree);
    } else {
      result = folderTree;
    }
  }
  if (returnAll) {
    result = sortHandle([...result, ...resetDocs, ...Object.values(docLibraryMap).flat()]);
  }
  return result;
};
