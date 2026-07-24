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
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateViolationDto, UpdateViolationDto } from '../dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import type { User } from '../../users/entities';
import { ViolationsService } from '../services/violations.service';

@ApiTags('violations')
@Controller('violations')
@UseGuards(AccessTokenGuard)
export class ViolationsController {
  constructor(private readonly violationsService: ViolationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a violation' })
  @ApiCreatedResponse({ description: 'Violation created' })
  create(
    @CurrentUser() user: User,
    @Body() createViolationDto: CreateViolationDto,
  ) {
    return this.violationsService.create({
      ...createViolationDto,
      businessId: user.businessId,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List all violations' })
  @ApiOkResponse({ description: 'List of violations' })
  findAll(@CurrentUser() user: User) {
    return this.violationsService.findAll(user.businessId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a violation by id' })
  @ApiOkResponse({ description: 'Violation found' })
  findOne(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.violationsService.findOne(user.businessId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a violation' })
  @ApiOkResponse({ description: 'Violation updated' })
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateViolationDto: UpdateViolationDto,
  ) {
    return this.violationsService.update(
      user.businessId,
      id,
      updateViolationDto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a violation' })
  @ApiNoContentResponse({ description: 'Violation deleted' })
  remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.violationsService.remove(user.businessId, id);
  }
}
