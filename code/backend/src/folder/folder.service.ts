import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Like, MoreThanOrEqual, ObjectLiteral, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import * as dayjs from 'dayjs';
import { IUser } from '@/common/decorators';
import {
  ChildrenQueryDto,
  CreateFolderDto,
  FolderDeleteDto,
  MoveFolderDto,
  UpdateFolderDto,
} from './dto/folder.dto';
import { Folder } from './entities/folder.entity';
import { Document } from '@/document/entities/document.entity';
import { DocumentType } from '@/document/interfaces/document.interface';
import { getValidName, nameRegExp, throwError } from '@/common/utils';
import { Recycle } from '@/recycle/entities/recycle.entity';
import { RecycleTypeEnum } from '@/recycle/interfaces/recycle.interface';
import { formatTree, getChatTimeMap, getSubFolders } from '@/common/utils/tree';
import { Library } from '@/library/entities/library.entity';
import { LibraryType } from '@/library/interfaces/library.interface';
import { MAX_LOOP } from '@/common/constant';
import { Chat } from '@/chat/entities/chat.entity';
import { SortField } from './interfaces/folder.interface';
import { SortEnum } from '@/document/dto/document.dto';
import { User } from '@/user/entities/user.entity';

@Injectable()
export class FolderService {
  constructor(
    @InjectRepository(Folder)
    private folderRepository: Repository<Folder>,

    @InjectRepository(Library)
    private libraryRepository: Repository<Library>,

    private dataSource: DataSource
  ) {}

  async create(createFolder: CreateFolderDto) {
    const { id: libraryId } = await this.getCustomLibrary(createFolder.userId);
    if (createFolder.parentId) {
      const isExist = await this.folderRepository.findBy({
        id: createFolder.parentId,
        userId: createFolder.userId,
        libraryId,
      });
      if (!isExist) {
        throw new BadRequestException('parentId invalid');
      }
    }
    const queryObj = {
      libraryId,
      userId: createFolder.userId,
    };

    const queryRunner = this.dataSource.createQueryRunner();
    const folderCount = await queryRunner.manager.countBy(Folder, {
      userId: createFolder.userId,
      deleteTime: IsNull(),
    });

    const maxFolderCount = Number(process.env.MAX_FOLDER_COUNT) || 20;
    if (folderCount >= maxFolderCount) {
      throw new BadRequestException('文件夹数量已满');
    }

    const sort = await this.getLatestOne({ ...queryObj, folderId: createFolder.parentId });
    const validName = await this.getValidFolderName(createFolder.name, queryObj);
    const { identifiers } = await this.folderRepository.insert({
      ...createFolder,
      libraryId,
      name: validName,
      sort,
    });
    return await this.folderRepository.findOneBy({ id: identifiers[0].id });
  }

  async getCustomLibrary(userId: number): Promise<Library> {
    return await this.dataSource
      .createQueryBuilder(Library, 'library')
      .where({ userId, type: LibraryType.custom })
      .getOne();
  }

  async getLatestOne({
    libraryId,
    userId,
    folderId,
  }: {
    libraryId: number;
    userId: number;
    folderId?: number;
  }) {
    const latestFolder = await this.folderRepository.findOne({
      where: { libraryId, userId, parentId: typeof folderId === 'number' ? folderId : IsNull() },
      order: { sort: 'DESC' },
    });
    const latestDoc = await this.dataSource
      .createQueryBuilder(Document, 'document')
      .where({
        folderId: typeof folderId === 'number' ? folderId : IsNull(),
        type: DocumentType.user,
        updateBy: userId,
      })
      .orderBy({ sort: 'DESC' })
      .getOne();
    const list = [latestFolder?.sort, latestDoc?.sort].filter((item) => typeof item === 'number');
    if (list.length) {
      return Math.max(...list) + 1;
    }
    return 1;
  }

  async getValidFolderName(name: string, queryObj: { libraryId: number; userId: number }) {
    // 截取前50个字符
    const limitName = name.slice(0, 50);
    const pattern = nameRegExp(limitName);
    const sameList = await this.folderRepository
      .createQueryBuilder('folder')
      .where(queryObj)
      .andWhere('folder.name REGEXP :pattern', { pattern })
      .orderBy({ update_time: 'DESC' })
      .getMany();
    return getValidName(sameList, { field: 'name', originName: limitName, pattern });
  }

  async update(updateFolder: UpdateFolderDto, user: IUser) {
    const detail = await this.detail(updateFolder.id, user.id);
    if ('name' in updateFolder && updateFolder.name !== detail.name) {
      updateFolder.name = await this.getValidFolderName(updateFolder.name, {
        libraryId: detail.libraryId,
        userId: user.id,
      });
    }
    await this.folderRepository.update(updateFolder.id, updateFolder);
    return await this.folderRepository.findOneBy({ id: updateFolder.id });
  }

  async move(data: MoveFolderDto[], user: IUser) {
    const folders = await this.folderRepository.findBy({
      id: In(data.map((item) => item.id)),
      userId: user.id,
    });
    if (folders.length !== data.length) {
      throw new BadRequestException(`id invalid`);
    }
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    let result;
    try {
      const customLibrary = await queryRunner.manager
        .createQueryBuilder(Library, 'library')
        .where({ userId: user.id, type: LibraryType.custom })
        .getOne();
      for (const item of data) {
        const latestDocument = await queryRunner.manager.findOne(Document, {
          where: {
            folderId: item.targetId || IsNull(),
            updateBy: user.id,
            type: DocumentType.user,
            libraryId: customLibrary.id,
          },
          order: { sort: 'DESC' },
        });
        const latestFolder = await queryRunner.manager.findOne(Folder, {
          where: { libraryId: customLibrary.id, userId: user.id },
          order: { sort: 'DESC' },
        });
        await queryRunner.manager.update(Folder, item.id, {
          id: item.id,
          parentId: item.targetId || null,
          sort: Math.max(...[latestDocument?.sort, latestFolder?.sort, 0].filter((i) => i)) + 1,
        });
      }
      await queryRunner.commitTransaction();
    } catch (error) {
      result = error;
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
    throwError(result);
    return true;
  }

  async validateFolder(user: IUser) {
    const userLibrary = await this.libraryRepository.findOneBy({
      userId: user.id,
      type: LibraryType.custom,
    });
    const userFolders = await this.folderRepository.findBy({
      userId: user.id,
      libraryId: userLibrary.id,
      deleteTime: IsNull(),
    });
    if (userFolders.length === 1) {
      throw new BadRequestException('文件夹至少存在一个');
    }
  }

  async delete({ ids, deleteDocument }: FolderDeleteDto, user: IUser) {
    await this.validateFolder(user);
    // 删除前校验所有权
    const folderList = await this.folderRepository.findBy({ id: In(ids), deleteTime: IsNull() });
    const errorItem = folderList.find((item) => item.userId !== user.id);
    if (errorItem) {
      throw new BadRequestException(`folderId ${errorItem.id} invalid`);
    }
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    let result;
    try {
      const folders = [...ids].map((id) => ({ id }));
      let loopCount = 0;
      // 递归获取子目录
      const loopSubFolder = async (folderIds: number[]) => {
        loopCount++;
        // 最多递归10次
        if (loopCount > MAX_LOOP) return;
        const subList = await queryRunner.manager.findBy(Folder, { parentId: In(folderIds) });
        if (deleteDocument) {
          folders.push(...subList);
          const subIds = subList.map((item) => item.id);
          await loopSubFolder(subIds);
        } else {
          for (const subFolder of subList) {
            subFolder.parentId = null;
            await queryRunner.manager.update(Folder, subFolder.id, subFolder);
          }
        }
      };
      await loopSubFolder(ids);
      await queryRunner.manager.softDelete(Folder, ids);
      // 目录及子目录下的文档
      const docs = await queryRunner.manager.findBy(Document, {
        folderId: In(ids),
        updateBy: user.id,
      });
      const folderDocMap = {};
      for (const item of docs) {
        const updateData: QueryDeepPartialEntity<Document> = {
          id: item.id,
          updateBy: user.id,
        };
        if (deleteDocument) {
          // 删除文件夹下单文档
          updateData.deleteTime = new Date();
        } else {
          // 移出文件夹
          updateData.folderId = null;
        }
        if (!folderDocMap[item.folderId]) {
          folderDocMap[item.folderId] = [item.id];
        } else {
          folderDocMap[item.folderId].push(item.id);
        }
        await queryRunner.manager.update(Document, item.id, updateData);
      }
      const folderTree = formatTree({ folders, docs });
      const recycleList = [];
      for (const folder of folderList) {
        recycleList.push({
          source: {
            id: folder.id,
            name: folder.name,
            type: RecycleTypeEnum.folder,
            children: folderTree[folder.id]?.children || [],
          },
          expiry: dayjs().add(30, 'days').toDate(),
          userId: user.id,
        });
      }
      await queryRunner.manager.insert(Recycle, recycleList);
      await queryRunner.commitTransaction();
    } catch (error) {
      result = error;
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
    throwError(result);

    // 查询是否有文件夹，没有自动创建一个默认的文件夹
    const customLibrary = await this.libraryRepository.findOneBy({
      userId: user.id,
      type: LibraryType.custom,
    });
    const folders = await this.folderRepository.findBy({
      libraryId: customLibrary.id,
      userId: user.id,
    });
    if (!folders?.length) {
      await this.folderRepository.save({
        name: '默认文件夹',
        libraryId: customLibrary.id,
        userId: user.id,
        sort: 1,
      });
      Logger.log(`用户[${user.id}]创建了默认文件夹`, '文件夹删除');
    }

    return true;
  }

  async detail(id: number, userId: number) {
    if (!id) {
      throw new BadRequestException('folderId invalid');
    }
    const folder = await this.folderRepository.findOneBy({ id });
    if (!folder) {
      throw new NotFoundException(`folder ${id} not found`);
    }
    if (folder.userId !== userId) {
      throw new ForbiddenException(`你没有文件夹 ${id} 的权限`);
    }
    return folder;
  }

  // 查询非知识库根目录的children
  async dataChildren(data: ChildrenQueryDto, user: IUser) {
    const curFolder = await this.folderRepository.findOneBy({ id: data.id });
    const folders = await this.dataSource
      .createQueryBuilder(Folder, 'folder')
      .where({ libraryId: curFolder.libraryId })
      .getMany();
    const folderIds = getSubFolders(folders, curFolder.id);
    const query: ObjectLiteral = {
      folderId: In(folderIds),
      updateBy: user.id,
      type: DocumentType.user,
    };
    if (data.keyword) {
      query.name = Like(`%${data.keyword}%`);
    }
    const docs = await this.dataSource
      .createQueryBuilder(Document, 'document')
      .where(query)
      .getMany();
    const extraInfo = await this.getExtraInfo(folderIds, data, user);
    if (data.keyword) {
      this.setDocSortField(docs, extraInfo);
      return this.sortDataChildren(docs, data);
    }
    const treeMap = formatTree(
      { folders: folders.filter((item) => folderIds.includes(item.id)), docs, extraInfo },
      { detail: true, sort: data.sort, sortType: data.sortType }
    );
    const result = treeMap[data.id]?.children || [];
    if (data.noChildTree) {
      for (const item of result) {
        delete item.children;
      }
    }
    return this.sortDataChildren(result, data);
  }

  // 获取文档的chat时间/更新时间
  async getExtraInfo(folderIds: number[], data: ChildrenQueryDto, user: IUser) {
    let extraInfo;
    if (data.sort == SortField.recentUsed) {
      const chatLogs = await this.dataSource
        .createQueryBuilder(Chat, 'chat')
        .where({
          createTime: MoreThanOrEqual(dayjs().subtract(30, 'days').toDate()),
          userId: user.id,
        })
        .getMany();
      extraInfo = getChatTimeMap(chatLogs);
    } else if (data.sort === SortField.recentUpdate) {
      const deletedDocs = await this.dataSource
        .createQueryBuilder(Document, 'document')
        .select('document.folder_id')
        .addSelect('MAX(document.update_time)', 'max_update_time')
        .where({
          folderId: In(folderIds),
          updateBy: user.id,
          type: DocumentType.user,
          deleteTime: MoreThanOrEqual(dayjs().subtract(30, 'days').toDate()),
        })
        .withDeleted()
        .groupBy('document.folder_id')
        .execute();
      extraInfo = {
        deleteIds: deletedDocs.reduce((pre, cur) => {
          const folderId = cur.folderId || 0;
          const time = new Date(cur.updateTime).getTime();
          if (pre[folderId]) {
            pre[folderId] =
              data.sortType === 'ASC'
                ? Math.min(pre[folderId], time)
                : Math.max(pre[folderId], time);
          } else {
            pre[folderId] = time;
          }
          return pre;
        }, {}),
      };
    }
    return extraInfo;
  }

  async sortDataChildren(list, data: ChildrenQueryDto) {
    let result = list;
    if (data.sort === SortField.recentUsed) {
      result = result.filter((item) => !!item.chatTime);
    } else if (data.sort === SortField.recentUpdate) {
      result = result.filter(
        (item) => dayjs().subtract(30, 'days').toDate() <= new Date(item.updateTime)
      );
    } else if (data.sort === SortField.name) {
      result = result.sort((a, b) =>
        data.sortType === SortEnum.ASC ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      );
    } else if (data.sort === SortField.size) {
      result = result.sort((a, b) => {
        const size1 =
          a.nodeType === RecycleTypeEnum.document ? a.extraData?.documentSize : a.documentSize;
        const size2 =
          b.nodeType === RecycleTypeEnum.document ? b.extraData?.documentSize : b.documentSize;
        return data.sortType === SortEnum.ASC ? size1 - size2 : size2 - size1;
      });
    }
    // 默认时间倒序
    else {
      result = result.sort((a, b) => b.createTime - a.createTime);
    }
    return result;
  }

  async setDocSortField(docList, extraInfo) {
    if (extraInfo?.docs && Object.keys(extraInfo.docs).length) {
      for (const doc of docList) {
        doc.chatTime = extraInfo.docs[doc.id];
      }
    }
  }

  // 查询知识库根目录的children
  async rootDataChildren(data: ChildrenQueryDto, user: IUser) {
    const { id: libraryId } = await this.dataSource
      .createQueryBuilder(Library, 'library')
      .where({ userId: user.id, type: LibraryType.custom })
      .getOne();
    const folders = await this.dataSource
      .createQueryBuilder(Folder, 'folder')
      .where({ userId: user.id, libraryId })
      .getMany();
    const query: ObjectLiteral = { libraryId, updateBy: user.id, type: DocumentType.user };
    if (data.keyword) {
      query.name = Like(`%${data.keyword}%`);
    }
    const docs = await this.dataSource
      .createQueryBuilder(Document, 'document')
      .where(query)
      .getMany();
    const extraInfo = await this.getExtraInfo(
      folders.map((i) => i.id),
      data,
      user
    );
    if (data.keyword) {
      this.setDocSortField(docs, extraInfo);
      return this.sortDataChildren(docs, data);
    }
    const treeData = formatTree(
      { libraries: [{ id: libraryId }], folders, docs, extraInfo },
      { detail: true, sort: data.sort, sortType: data.sortType }
    );
    const result = treeData[0]?.children || [];
    if (data.noChildTree) {
      for (const item of result) {
        delete item.children;
      }
    }
    return this.sortDataChildren(result, data);
  }

  /**
   * 超管删除用户的文件
   * @param ids
   * @param userId
   */
  async deleteByAdmin(userId: number) {
    const user = await this.dataSource
      .createQueryBuilder(User, 'user')
      .where({ id: userId })
      .getOne();
    if (!user) {
      Logger.warn(new Error(`用户[${userId}]不存在`));
      return;
    }
    const customLibrary = await this.libraryRepository.findOneBy({
      userId,
      type: LibraryType.custom,
    });
    if (!customLibrary) {
      Logger.warn(new Error(`用户[${userId}]知识库不存在`));
      return;
    }
    const folders = await this.folderRepository.findBy({
      userId,
      libraryId: customLibrary.id,
      deleteTime: IsNull(),
    });
    if (folders?.length) {
      await this.delete(
        { ids: folders.map((item) => item.id), deleteDocument: false },
        user as unknown as IUser
      );
      Logger.log(`用户[${userId}]删除了${folders.length}个文件夹`, '文件夹删除');
    } else {
      await this.folderRepository.save({
        name: '默认文件夹',
        libraryId: customLibrary.id,
        userId: user.id,
        sort: 1,
      });
      Logger.log(`用户[${user.id}]创建了默认文件夹`, '文件夹删除');
    }
  }
}
