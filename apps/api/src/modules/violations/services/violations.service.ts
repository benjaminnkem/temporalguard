import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateViolationDto, UpdateViolationDto } from '../dto';
import { Violation } from '../entities';

@Injectable()
export class ViolationsService {
  constructor(
    @InjectRepository(Violation)
    private readonly violationsRepository: Repository<Violation>,
  ) {}

  async create(_createViolationDto: CreateViolationDto): Promise<Violation> {
    const violation = this.violationsRepository.create();
    return this.violationsRepository.save(violation);
  }

  async findAll(): Promise<Violation[]> {
    return this.violationsRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Violation> {
    const violation = await this.violationsRepository.findOne({
      where: { id },
    });

    if (!violation) {
      throw new NotFoundException(`Violation with id "${id}" not found`);
    }

    return violation;
  }

  async update(
    id: string,
    _updateViolationDto: UpdateViolationDto,
  ): Promise<Violation> {
    const violation = await this.findOne(id);
    return this.violationsRepository.save(violation);
  }

  async remove(id: string): Promise<void> {
    const violation = await this.findOne(id);
    await this.violationsRepository.remove(violation);
  }
}
