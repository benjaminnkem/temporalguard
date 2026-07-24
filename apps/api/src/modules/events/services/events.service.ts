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
    const existing = await this.findByName(dto.name);
    if (existing) return existing;

    try {
      return await this.eventsRepository.save(
        this.eventsRepository.create(dto),
      );
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        const concurrentlyCreated = await this.findByName(dto.name);
        if (concurrentlyCreated) return concurrentlyCreated;
      }
      throw error;
    }
  }

  findAll(): Promise<BusinessEvent[]> {
    return this.eventsRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<BusinessEvent> {
    const event = await this.eventsRepository.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundException(`Business event with id "${id}" not found`);
    }
    return event;
  }

  findByName(name: string): Promise<BusinessEvent | null> {
    return this.eventsRepository.findOne({ where: { name } });
  }

  async findOrCreateByName(name: string): Promise<BusinessEvent> {
    return this.createOrReuse({ name });
  }

  async update(
    id: string,
    dto: UpdateBusinessEventDto,
  ): Promise<BusinessEvent> {
    const event = await this.findOne(id);
    Object.assign(event, dto);
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

  async remove(id: string): Promise<void> {
    const event = await this.findOne(id);
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
