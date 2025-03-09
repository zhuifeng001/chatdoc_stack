import {
  Injectable,
} from '@nestjs/common';
import { InjectRepository} from '@nestjs/typeorm';
import { Not, IsNull,Repository } from 'typeorm';
import { Hotspots } from './entities/hotspots.entity';

@Injectable()
export class HotspotsService {
  constructor(
    @InjectRepository(Hotspots)
    private hotspotsRepository: Repository<Hotspots>,
  ) {}

  async getLatestOne() {
    return await this.hotspotsRepository.findOne({
      where: {
        spots: Not(IsNull()),
      },
      order: {
        updateTime: 'DESC'
      }
    });
  }

}