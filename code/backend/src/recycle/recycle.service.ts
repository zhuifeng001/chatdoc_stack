import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { IPage, IUser } from '@/common/decorators';
import { throwError } from '@/common/utils';
import { Folder } from '@/folder/entities/folder.entity';
import { Library } from '@/library/entities/library.entity';
import { Document } from '@/document/entities/document.entity';
import { Recycle } from './entities/recycle.entity';
import { RecycleSortField, RecycleTypeEnum } from './interfaces/recycle.interface';
import { RecycleListQueryDto } from './dot/recycle.dto';

@Injectable()
export class RecycleService {
  constructor(
    @InjectRepository(Recycle)
    private recycleRepository: Repository<Recycle>,
    private dataSource: DataSource
  ) {}

  async recycleList(data: RecycleListQueryDto, { skip, take }: IPage, user: IUser) {
    const queryBuilder = this.recycleRepository
      .createQueryBuilder('recycle')
      .where({ userId: user.id });
    if (data.name) {
      queryBuilder.andWhere('JSON_EXTRACT(recycle.source, "$.name") LIKE :name', {
        name: `%${data.name}%`,
      });
    }
    if (data.type) {
      queryBuilder.andWhere('JSON_EXTRACT(recycle.source, "$.type") = :type', { type: data.type });
    }
    if (data.sort === RecycleSortField.createTime) {
      queryBuilder.orderBy({ create_time: data.sortType || 'DESC' });
    } else if (data.sort === RecycleSortField.name) {
      queryBuilder.orderBy('CAST(recycle.source->>"$.name" AS sort)', data.sortType || 'DESC');
    }
    queryBuilder.offset(skip).limit(take);
    const [list, total] = await Promise.all([queryBuilder.getMany(), queryBuilder.getCount()]);
    return { list, total };
  }

  async recycleRestore(ids: number[], user: IUser) {
    const list = await this.recycleRepository.findBy({ id: In(ids), userId: user.id });
    if (list.length !== ids.length) {
      throw new BadRequestException(`ids contain invalid id`);
    }
    const libraryIds = [];
    const folderIds = [];
    const documentIds = [];
    const loopGetId = (list) => {
      if (!Array.isArray(list)) return;
      for (const item of list) {
        if (item.type === RecycleTypeEnum.library) {
          libraryIds.push(item.id);
        } else if (item.type === RecycleTypeEnum.folder) {
          folderIds.push(item.id);
        } else if (item.type === RecycleTypeEnum.document) {
          documentIds.push(item.id);
        }
        loopGetId(item.children);
      }
    };
    for (const item of list) {
      if (!item.source) continue;
      loopGetId([item.source]);
    }
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    let result;
    try {
      if (libraryIds.length) {
        await queryRunner.manager.restore(Library, libraryIds);
      }
      if (folderIds.length) {
        await queryRunner.manager.restore(Folder, folderIds);
      }
      if (documentIds.length) {
        await queryRunner.manager.restore(Document, documentIds);
      }
      await queryRunner.manager.softDelete(Recycle, ids);
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

  async recycleDelete(ids: number[], user: IUser) {
    const list = await this.recycleRepository.findBy({ id: In(ids), userId: user.id });
    if (list.length !== ids.length) {
      throw new BadRequestException(`ids contain invalid id`);
    }
    await this.recycleRepository.softDelete(ids);
    return true;
  }
}
