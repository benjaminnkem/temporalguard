import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRuleDto, UpdateRuleDto } from '../dto';
import { Rule } from '../entities';

@Injectable()
export class RulesService {
  constructor(
    @InjectRepository(Rule)
    private readonly rulesRepository: Repository<Rule>,
  ) {}

  async create(_createRuleDto: CreateRuleDto): Promise<Rule> {
    const rule = this.rulesRepository.create();
    return this.rulesRepository.save(rule);
  }

  async findAll(): Promise<Rule[]> {
    return this.rulesRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Rule> {
    const rule = await this.rulesRepository.findOne({ where: { id } });

    if (!rule) {
      throw new NotFoundException(`Rule with id "${id}" not found`);
    }

    return rule;
  }

  async update(id: string, _updateRuleDto: UpdateRuleDto): Promise<Rule> {
    const rule = await this.findOne(id);
    return this.rulesRepository.save(rule);
  }

  async remove(id: string): Promise<void> {
    const rule = await this.findOne(id);
    await this.rulesRepository.remove(rule);
  }
}
