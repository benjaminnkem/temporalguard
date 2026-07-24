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
import { CreateWorkflowDto, UpdateWorkflowDto } from '../dto';
import { WorkflowsService } from '../services/workflows.service';

@ApiTags('workflows')
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a workflow' })
  @ApiCreatedResponse({ description: 'Workflow created' })
  create(@Body() createWorkflowDto: CreateWorkflowDto) {
    return this.workflowsService.create(createWorkflowDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all workflows' })
  @ApiOkResponse({ description: 'List of workflows' })
  findAll(@Query('businessId', ParseUUIDPipe) businessId: string) {
    return this.workflowsService.findAll(businessId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a workflow by id' })
  @ApiOkResponse({ description: 'Workflow found' })
  findOne(
    @Query('businessId', ParseUUIDPipe) businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.workflowsService.findOne(businessId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a workflow' })
  @ApiOkResponse({ description: 'Workflow updated' })
  update(
    @Query('businessId', ParseUUIDPipe) businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateWorkflowDto: UpdateWorkflowDto,
  ) {
    return this.workflowsService.update(businessId, id, updateWorkflowDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a workflow' })
  @ApiNoContentResponse({ description: 'Workflow deleted' })
  remove(
    @Query('businessId', ParseUUIDPipe) businessId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.workflowsService.remove(businessId, id);
  }
}
