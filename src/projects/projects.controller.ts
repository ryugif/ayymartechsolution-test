import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { type AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { ResponseMessage } from '../decorators/response-message.decorator';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';
import { ApiEnvelope } from '../swagger/api-envelope.decorator';
import { ProjectResponseDto } from './dto/project-response.dto';
import { EmptyReponseDto } from '../swagger/dto/empty-response.dto';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  /**
   * List all projects owned by the current user.
   * @param user - The current authenticated user, injected by the CurrentUser decorator.
   * @returns An array of projects owned by the user, ordered by last update time.
   */
  @Get()
  @ApiEnvelope(ProjectResponseDto, { isArray: true })
  list(@CurrentUser() user: AuthUser) {
    return this.projects.list(user.id);
  }

  /**
   * Create a new project owned by the current user.
   * @param user - The current authenticated user, injected by the CurrentUser decorator.
   * @param dto - The data transfer object containing the project title and optional description.
   * @returns The newly created project.
   */
  @Post()
  @ResponseMessage('Project created')
  @ApiEnvelope(ProjectResponseDto)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProjectDto) {
    return this.projects.create(user.id, dto);
  }

  /**
   * Get a project by id, only if owned by the current user.
   * @param user - The current authenticated user, injected by the CurrentUser decorator.
   * @param id - The ID of the project to retrieve.
   * @returns The project with the specified ID, if owned by the user.
   * @throws ProjectNotFoundException if the project does not exist or is not owned by the user.
   */
  @Get(':id')
  @ApiEnvelope(ProjectResponseDto)
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.projects.getOwned(user.id, id);
  }

  /**
   * Update a project by id, only if owned by the current user.
   * @param user - The current authenticated user, injected by the CurrentUser decorator.
   * @param id - The ID of the project to update.
   * @param dto - The data transfer object containing the updated project title and/or description.
   * @returns The updated project.
   * @throws ProjectNotFoundException if the project does not exist or is not owned by the user.
   */
  @Patch(':id')
  @ResponseMessage('Project updated')
  @ApiEnvelope(ProjectResponseDto)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projects.update(user.id, id, dto);
  }

  /**
   * Remove a project by id, only if owned by the current user.
   * @param user - The current authenticated user, injected by the CurrentUser decorator.
   * @param id - The ID of the project to remove.
   * @returns An empty response indicating the project has been deleted.
   * @throws ProjectNotFoundException if the project does not exist or is not owned by the user.
   */
  @Delete(':id')
  @ResponseMessage('Project deleted')
  @ApiEnvelope(EmptyReponseDto)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.projects.remove(user.id, id);
  }
}
