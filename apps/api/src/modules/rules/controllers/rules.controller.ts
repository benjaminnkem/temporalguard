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
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreateRuleDto,
  SetRuleEnabledDto,
  TestRuleDto,
  UpdateRuleDto,
} from '../dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import type { User } from '../../users/entities';
import { Rule } from '../entities';
import { RulesService } from '../services/rules.service';

@ApiTags('rules')
@Controller('rules')
@UseGuards(AccessTokenGuard)
export class RulesController {
  constructor(private readonly rulesService: RulesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a rule' })
  @ApiCreatedResponse({ description: 'Rule created', type: Rule })
  create(
    @CurrentUser() user: User,
    @Body() createRuleDto: CreateRuleDto,
  ): Promise<Rule> {
    return this.rulesService.create(user.businessId, createRuleDto);
  }

  @Post('test')
  @ApiOperation({ summary: 'Evaluate a draft rule against workspace history' })
  @ApiOkResponse({ description: 'Historical draft evaluation' })
  test(@CurrentUser() user: User, @Body() input: TestRuleDto) {
    return this.rulesService.testDraft(user.businessId, input);
  }

  @Get()
  @ApiOperation({ summary: 'List all rules' })
  @ApiOkResponse({ description: 'List of rules', type: [Rule] })
  findAll(@CurrentUser() user: User): Promise<Rule[]> {
    return this.rulesService.findAll(user.businessId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a rule by id' })
  @ApiOkResponse({ description: 'Rule found', type: Rule })
  @ApiNotFoundResponse({ description: 'Rule not found' })
  findOne(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Rule> {
    return this.rulesService.findOne(user.businessId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a rule' })
  @ApiOkResponse({ description: 'Rule updated', type: Rule })
  @ApiNotFoundResponse({ description: 'Rule not found' })
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRuleDto: UpdateRuleDto,
  ): Promise<Rule> {
    return this.rulesService.update(user.businessId, id, updateRuleDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Enable or disable a rule' })
  @ApiOkResponse({ description: 'Rule status updated', type: Rule })
  @ApiNotFoundResponse({ description: 'Rule not found' })
  setEnabled(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: SetRuleEnabledDto,
  ): Promise<Rule> {
    return this.rulesService.setEnabled(user.businessId, id, input.enabled);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete and disable a rule' })
  @ApiNoContentResponse({ description: 'Rule soft deleted' })
  @ApiNotFoundResponse({ description: 'Rule not found' })
  remove(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.rulesService.remove(user.businessId, id);
  }
}
