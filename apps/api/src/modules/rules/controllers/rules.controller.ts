import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateRuleDto, UpdateRuleDto } from '../dto';
import { Rule } from '../entities';
import { RulesService } from '../services/rules.service';

@ApiTags('rules')
@Controller('rules')
export class RulesController {
  constructor(private readonly rulesService: RulesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a rule' })
  @ApiCreatedResponse({ description: 'Rule created', type: Rule })
  create(@Body() createRuleDto: CreateRuleDto): Promise<Rule> {
    return this.rulesService.create(createRuleDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all rules' })
  @ApiOkResponse({ description: 'List of rules', type: [Rule] })
  findAll(): Promise<Rule[]> {
    return this.rulesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a rule by id' })
  @ApiOkResponse({ description: 'Rule found', type: Rule })
  @ApiNotFoundResponse({ description: 'Rule not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Rule> {
    return this.rulesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a rule' })
  @ApiOkResponse({ description: 'Rule updated', type: Rule })
  @ApiNotFoundResponse({ description: 'Rule not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRuleDto: UpdateRuleDto,
  ): Promise<Rule> {
    return this.rulesService.update(id, updateRuleDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a rule' })
  @ApiNoContentResponse({ description: 'Rule deleted' })
  @ApiNotFoundResponse({ description: 'Rule not found' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.rulesService.remove(id);
  }
}
