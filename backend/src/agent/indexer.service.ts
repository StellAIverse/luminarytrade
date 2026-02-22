import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, ILike, Between, In } from "typeorm";
import { Agent } from "./entities/agent.entity";
import { CreateAgentDto } from "./dto/create-agent.dto";
import { SpecificationExecutor } from "./specification/specification.executor";
import { AgentQuerySpecification } from "./specification/agent-query.specification";
import { SearchAgentsDto } from "./dto/search-agent.dto";
import { HighPerformerSpec } from "./specification/high-performer.specification";
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

@Injectable()
export class IndexerService {
  private readonly specificationExecutor: SpecificationExecutor<Agent>;

  constructor(
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
  ) {
    this.specificationExecutor = new SpecificationExecutor(
      this.agentRepository,
    );
  }

  async create(createAgentDto: CreateAgentDto): Promise<Agent> {
    const agent = this.agentRepository.create(createAgentDto);
    return await this.agentRepository.save(agent);
  }

  async search(searchDto: SearchAgentsDto): Promise<PaginatedResponse<Agent>> {
    const spec = new AgentQuerySpecification(searchDto);

    const queryBuilder = this.specificationExecutor.execute(spec, "agent");

    const [data, total] = await queryBuilder.getManyAndCount();

    const { page, limit } = searchDto;

    return {
      data,
      meta: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Agent> {
    const agent = await this.agentRepository.findOne({ where: { id } });
    if (!agent) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }
    return agent;
  }

  async updatePerformanceMetrics(
    id: string,
    metrics: Partial<Agent["performance_metrics"]>,
  ): Promise<Agent> {
    const agent = await this.findOne(id);
    agent.performance_metrics = { ...agent.performance_metrics, ...metrics };
    return await this.agentRepository.save(agent);
  }

  async getTopPerformers(limit: number = 10): Promise<Agent[]> {
    const spec = new HighPerformerSpec(limit);

    const queryBuilder = this.specificationExecutor.execute(spec, "agent");

    return await queryBuilder.getMany();
  }
}
