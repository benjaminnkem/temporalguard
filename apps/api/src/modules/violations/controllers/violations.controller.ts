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
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateViolationDto, UpdateViolationDto } from '../dto';
import { ViolationsService } from '../services/violations.service';

@ApiTags('violations')
@Controller('violations')
export class ViolationsController {
  constructor(private readonly violationsService: ViolationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a violation' })
  @ApiCreatedResponse({ description: 'Violation created' })
  create(@Body() createViolationDto: CreateViolationDto) {
    return this.violationsService.create(createViolationDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all violations' })
  @ApiOkResponse({ description: 'List of violations' })
  findAll(@Query('businessId', ParseUUIDPipe) businessId: string) {
    return this.violationsService.findAll(businessId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a violation by id' })
  @ApiOkResponse({ description: 'Violation found' })
  findOne(
    @Query('businessId', ParseUUIDPipe) businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.violationsService.findOne(businessId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a violation' })
  @ApiOkResponse({ description: 'Violation updated' })
  update(
    @Query('businessId', ParseUUIDPipe) businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateViolationDto: UpdateViolationDto,
  ) {
    return this.violationsService.update(businessId, id, updateViolationDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a violation' })
  @ApiNoContentResponse({ description: 'Violation deleted' })
  remove(
    @Query('businessId', ParseUUIDPipe) businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.violationsService.remove(businessId, id);
  }
}
