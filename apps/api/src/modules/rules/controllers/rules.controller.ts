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
  Query,
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
  findAll(
    @Query('businessId', ParseUUIDPipe) businessId: string,
  ): Promise<Rule[]> {
    return this.rulesService.findAll(businessId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a rule by id' })
  @ApiOkResponse({ description: 'Rule found', type: Rule })
  @ApiNotFoundResponse({ description: 'Rule not found' })
  findOne(
    @Query('businessId', ParseUUIDPipe) businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Rule> {
    return this.rulesService.findOne(businessId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a rule' })
  @ApiOkResponse({ description: 'Rule updated', type: Rule })
  @ApiNotFoundResponse({ description: 'Rule not found' })
  update(
    @Query('businessId', ParseUUIDPipe) businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRuleDto: UpdateRuleDto,
  ): Promise<Rule> {
    return this.rulesService.update(businessId, id, updateRuleDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a rule' })
  @ApiNoContentResponse({ description: 'Rule deleted' })
  @ApiNotFoundResponse({ description: 'Rule not found' })
  remove(
    @Query('businessId', ParseUUIDPipe) businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.rulesService.remove(businessId, id);
  }
}
