import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, In, IsNull, Not, Repository } from 'typeorm';
import * as dayjs from 'dayjs';
import { throwError } from '@/common/utils';
import { IUser } from '@/common/decorators';
import { Document } from '@/document/entities/document.entity';
import { DocumentType } from '@/document/interfaces/document.interface';
import { Folder } from '@/folder/entities/folder.entity';
import { Recycle } from '@/recycle/entities/recycle.entity';
import { RecycleTypeEnum } from '@/recycle/interfaces/recycle.interface';
import { IUserRole } from '@/user/interfaces/user.interface';
import {
  CreateLibraryDto,
  LibraryQueryDto,
  LibraryTreeDto,
  UpdateLibraryDto,
} from './dto/library.dto';
import { Library } from './entities/library.entity';
import { LibraryType } from './interfaces/library.interface';
import { formatTree } from '@/common/utils/tree';

@Injectable()
export class LibraryService {
  constructor(
    @InjectRepository(Library)
    private libraryRepository: Repository<Library>,
    private dataSource: DataSource
  ) {}

  async create(createLibraryDto: CreateLibraryDto, user: IUser) {
    const isCustom = createLibraryDto.type === LibraryType.custom;
    if (isCustom) {
      createLibraryDto.userId = user.id;
    } else if (![IUserRole.admin].includes(user.role)) {
      throw new ForbiddenException();
    }
    if (createLibraryDto.type === LibraryType.custom) {
      const isExist = await this.libraryRepository.findBy({
        userId: user.id,
        type: LibraryType.custom,
      });
      if (isExist) {
        throw new BadRequestException('自定义知识库已存在');
      }
    }
    const { identifiers } = await this.libraryRepository.insert(createLibraryDto);
    return await this.libraryRepository.findOneBy({ id: identifiers[0].id });
  }

  async update(updateLibraryDto: UpdateLibraryDto, user: IUser) {
    const detail = await this.detail(updateLibraryDto.id);
    await this.checkAuth(detail, user);
    await this.libraryRepository.update(updateLibraryDto.id, updateLibraryDto);
    return await this.libraryRepository.findOneBy({ id: updateLibraryDto.id });
  }

  async checkAuth(detail: Library, user: IUser) {
    if (detail.type === LibraryType.custom && detail.userId !== user.id) {
      throw new NotFoundException(`libraryId: ${detail.id} 不存在`);
    } else if (detail.type !== LibraryType.custom && ![IUserRole.admin].includes(user.role)) {
      throw new ForbiddenException();
    }
  }

  async delete(ids: number[], user: IUser) {
    const libraries = await this.libraryRepository.findBy({ id: In(ids) });
    for (const libraryItem of libraries) {
      await this.checkAuth(libraryItem, user);
    }
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    let result;
    try {
      await queryRunner.manager.softDelete(Library, ids);
      // 删除知识库下的文档和文件夹
      const docs = await queryRunner.manager.findBy(Document, { libraryId: In(ids) });
      if (docs.length) {
        await queryRunner.manager.softDelete(Document, docs);
      }
      const folders = await queryRunner.manager.findBy(Folder, { libraryId: In(ids) });
      if (folders.length) {
        await queryRunner.manager.softDelete(Folder, folders);
      }
      const result = formatTree({ libraries, folders, docs });
      const recycleList = [];
      for (const library of result) {
        recycleList.push({
          source: {
            type: RecycleTypeEnum.library,
            id: library.id,
            name: library.name,
            children: library.children,
          },
          userId: user.id,
          expiry: dayjs().add(30, 'days').toDate(),
        });
      }
      await queryRunner.manager.insert(Recycle, recycleList);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      result = error;
    } finally {
      await queryRunner.release();
    }
    throwError(result);
    return true;
  }

  async list(params: LibraryQueryDto, user?: IUser) {
    const query: FindOptionsWhere<Library>[] = [
      { userId: IsNull(), type: Not(LibraryType.custom) },
    ];
    if (user) {
      const result = [];
      if (params.type !== LibraryType.custom) {
        const officialList = await this.libraryRepository.findBy(query);
        const countList = await this.dataSource
          .createQueryBuilder(Document, 'doc')
          .select('doc.library_id', 'id')
          .addSelect('COUNT(*)', 'count')
          .where({ libraryId: In(officialList.map((item) => item.id)) })
          .groupBy('doc.library_id')
          .execute();
        const countMap = countList.reduce(
          (pre, cur) => ({ ...pre, [cur.id]: Number(cur.count) }),
          {}
        );
        result.push(
          ...officialList.map((item) => ({ ...item, documentCount: countMap[item.id] || 0 }))
        );
      }
      if (!params.type || params.type === LibraryType.custom) {
        const customLibrary = await this.dataTree({ noDocument: true }, user);
        result.push(customLibrary);
      }
      return result;
    } else {
      return await this.libraryRepository.findBy(query);
    }
  }

  async detail(id: number, userId?: number) {
    const query: FindOptionsWhere<Library> = { id };
    if (userId) {
      query.userId = userId;
    }
    const library = await this.libraryRepository.findOneBy(query);
    if (!library) {
      throw new NotFoundException(`libraryId: ${id} 不存在`);
    }
    return library;
  }

  async dataTree({ noDocument }: LibraryTreeDto, user: IUser) {
    const libraries = await this.libraryRepository.findBy([
      { userId: user.id, type: LibraryType.custom },
      { userId: IsNull(), type: Not(LibraryType.custom) },
    ]);
    const customLibraries = libraries.filter((item) => item.type === LibraryType.custom);
    const libraryIds = customLibraries.map((item) => item.id);
    const folders = await this.dataSource
      .createQueryBuilder(Folder, 'folder')
      .where({ libraryId: In(libraryIds) })
      .getMany();
    const docs = await this.dataSource
      .createQueryBuilder(Document, 'document')
      .where({ libraryId: In(libraryIds), type: DocumentType.user })
      .getMany();
    const result = formatTree(
      { libraries: customLibraries, folders, docs },
      { detail: true, noDocument }
    );
    result[0].official = libraries.filter((item) => item.type !== LibraryType.custom);
    return result[0];
  }
}
