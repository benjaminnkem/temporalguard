import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateBusinessEventDto, UpdateBusinessEventDto } from '../dto';
import { BusinessEvent } from '../entities';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(BusinessEvent)
    private readonly eventsRepository: Repository<BusinessEvent>,
  ) {}

  async createOrReuse(dto: CreateBusinessEventDto): Promise<BusinessEvent> {
    const existing = await this.findByName(dto.businessId, dto.name);
    if (existing) return existing;

    try {
      return await this.eventsRepository.save(
        this.eventsRepository.create(dto),
      );
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        const concurrentlyCreated = await this.findByName(
          dto.businessId,
          dto.name,
        );
        if (concurrentlyCreated) return concurrentlyCreated;
      }
      throw error;
    }
  }

  findAll(businessId: string): Promise<BusinessEvent[]> {
    return this.eventsRepository.find({
      where: { businessId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(businessId: string, id: string): Promise<BusinessEvent> {
    const event = await this.eventsRepository.findOne({
      where: { id, businessId },
    });
    if (!event) {
      throw new NotFoundException(`Business event with id "${id}" not found`);
    }
    return event;
  }

  findByName(businessId: string, name: string): Promise<BusinessEvent | null> {
    return this.eventsRepository.findOne({ where: { businessId, name } });
  }

  async findOrCreateByName(
    businessId: string,
    name: string,
  ): Promise<BusinessEvent> {
    return this.createOrReuse({ businessId, name });
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdateBusinessEventDto,
  ): Promise<BusinessEvent> {
    const event = await this.findOne(businessId, id);
    Object.assign(event, dto, { businessId });
    try {
      return await this.eventsRepository.save(event);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException(
          `Business event with name "${dto.name}" already exists`,
        );
      }
      throw error;
    }
  }

  async remove(businessId: string, id: string): Promise<void> {
    const event = await this.findOne(businessId, id);
    try {
      await this.eventsRepository.remove(event);
    } catch (error) {
      if ((error as { code?: string }).code === '23503') {
        throw new ConflictException(
          'Business event is referenced by a rule or event log',
        );
      }
      throw error;
    }
  }
}
