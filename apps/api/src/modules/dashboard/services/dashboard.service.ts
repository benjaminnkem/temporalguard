import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { EventLog } from '../../events/entities';
import { Rule } from '../../rules/entities';
import { Violation } from '../../violations/entities';
import { ViolationSeverity } from '../../violations/enums/violation-severity.enum';
import { Workflow } from '../../workflows/entities';
import { WorkflowStatus } from '../../workflows/enums/workflow-status.enum';

type Metric = {
  id: string;
  label: string;
  value: string;
  delta: number;
  favorable: 'up' | 'down';
  description: string;
};

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Workflow)
    private readonly workflows: Repository<Workflow>,
    @InjectRepository(Violation)
    private readonly violations: Repository<Violation>,
    @InjectRepository(Rule)
    private readonly rules: Repository<Rule>,
    @InjectRepository(EventLog)
    private readonly eventLogs: Repository<EventLog>,
  ) {}

  async getOverview(businessId: string) {
    const now = new Date();
    const currentStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const previousStart = new Date(
      currentStart.getTime() - 24 * 60 * 60 * 1000,
    );
    const [current, previous, recentViolations, totalRules, totalEvents] =
      await Promise.all([
        this.workflows.find({
          where: { businessId, createdAt: Between(currentStart, now) },
          withDeleted: true,
          relations: { rule: true },
          order: { createdAt: 'ASC' },
        }),
        this.workflows.find({
          where: {
            businessId,
            createdAt: Between(previousStart, currentStart),
          },
        }),
        this.violations.find({
          where: { businessId },
          withDeleted: true,
          relations: { workflow: true, rule: true },
          order: { occurredAt: 'DESC' },
          take: 8,
        }),
        this.rules.count({ where: { businessId } }),
        this.eventLogs.count({ where: { businessId } }),
      ]);

    const completed = current.filter(
      (workflow) => workflow.status === WorkflowStatus.COMPLETED,
    );
    const waiting = current.filter(
      (workflow) => workflow.status === WorkflowStatus.WAITING,
    );
    const overdue = current.filter(
      (workflow) => workflow.status === WorkflowStatus.OVERDUE,
    );
    const nearDeadline = waiting.filter(
      (workflow) =>
        workflow.deadline.getTime() > now.getTime() &&
        workflow.deadline.getTime() - now.getTime() <= 15 * 60 * 1000,
    );
    const durations = completed
      .map(
        (workflow) =>
          workflow.updatedAt.getTime() - workflow.createdAt.getTime(),
      )
      .sort((left, right) => left - right);
    const previousCompleted = previous.filter(
      (workflow) => workflow.status === WorkflowStatus.COMPLETED,
    ).length;
    const previousOverdue = previous.filter(
      (workflow) => workflow.status === WorkflowStatus.OVERDUE,
    ).length;
    const completionRate =
      current.length === 0 ? 0 : (completed.length / current.length) * 100;
    const previousCompletionRate =
      previous.length === 0 ? 0 : (previousCompleted / previous.length) * 100;
    const medianMs = this.percentile(durations, 0.5);

    const metrics: Metric[] = [
      this.metric(
        'completion-rate',
        'Completion rate',
        `${completionRate.toFixed(1)}%`,
        completionRate,
        previousCompletionRate,
        'up',
        'Workflows completed inside the selected period.',
      ),
      this.metric(
        'active',
        'Active workflows',
        String(waiting.length),
        waiting.length,
        previous.filter(
          (workflow) => workflow.status === WorkflowStatus.WAITING,
        ).length,
        'down',
        'Workflows currently waiting for an expected outcome.',
      ),
      this.metric(
        'near-deadline',
        'Near deadline',
        String(nearDeadline.length),
        nearDeadline.length,
        0,
        'down',
        'Active workflows with fifteen minutes or less remaining.',
      ),
      this.metric(
        'overdue',
        'Overdue',
        String(overdue.length),
        overdue.length,
        previousOverdue,
        'down',
        'Workflows whose expected outcome missed its deadline.',
      ),
      this.metric(
        'violations',
        'Violations',
        String(recentViolations.length),
        recentViolations.length,
        previousOverdue,
        'down',
        'Rule violations observed for this workspace.',
      ),
      this.metric(
        'median-duration',
        'Median duration',
        this.duration(medianMs),
        medianMs,
        0,
        'down',
        'Median completion time for completed workflows.',
      ),
    ];

    return {
      health:
        overdue.length > 0
          ? 'critical'
          : nearDeadline.length > 0
            ? 'degraded'
            : 'healthy',
      metrics,
      reliabilitySeries: this.series(current, currentStart),
      deadlineBuckets: this.deadlineBuckets(waiting, now),
      recentViolations: recentViolations.map((violation) =>
        this.violationSummary(violation),
      ),
      appliedFilters: { range: 'last_24_hours' },
      dataFreshnessAt: now.toISOString(),
      totals: { totalRules, totalEvents },
    };
  }

  async getWorkflows(businessId: string) {
    return this.workflows.find({
      where: { businessId },
      withDeleted: true,
      relations: { rule: true },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async getViolations(businessId: string) {
    const violations = await this.violations.find({
      where: { businessId },
      withDeleted: true,
      relations: { workflow: true, rule: true },
      order: { occurredAt: 'DESC' },
      take: 100,
    });
    return violations.map((violation) => this.violationSummary(violation));
  }

  private metric(
    id: string,
    label: string,
    value: string,
    current: number,
    previous: number,
    favorable: 'up' | 'down',
    description: string,
  ): Metric {
    const delta =
      previous === 0
        ? current === 0
          ? 0
          : 100
        : ((current - previous) / previous) * 100;
    return {
      id,
      label,
      value,
      delta: Number(delta.toFixed(1)),
      favorable,
      description,
    };
  }

  private series(workflows: Workflow[], start: Date) {
    const bucketMs = 2 * 60 * 60 * 1000;
    return Array.from({ length: 12 }, (_, index) => {
      const bucketStart = new Date(start.getTime() + index * bucketMs);
      const bucketEnd = new Date(bucketStart.getTime() + bucketMs);
      const items = workflows.filter(
        (workflow) =>
          workflow.createdAt >= bucketStart && workflow.createdAt < bucketEnd,
      );
      const completed = items.filter(
        (workflow) => workflow.status === WorkflowStatus.COMPLETED,
      );
      const violated = items.filter(
        (workflow) => workflow.status === WorkflowStatus.OVERDUE,
      );
      const durations = completed.map(
        (workflow) =>
          workflow.updatedAt.getTime() - workflow.createdAt.getTime(),
      );
      return {
        timestamp: bucketStart.toISOString(),
        volume: items.length,
        completionRate:
          items.length === 0 ? 0 : (completed.length / items.length) * 100,
        violations: violated.length,
        duration: this.percentile(durations, 0.95),
      };
    });
  }

  private deadlineBuckets(workflows: Workflow[], now: Date) {
    const buckets = [
      { bucket: '< 5m', count: 0 },
      { bucket: '5–15m', count: 0 },
      { bucket: '15–60m', count: 0 },
      { bucket: 'Overdue', count: 0 },
    ];
    for (const workflow of workflows) {
      const remaining = workflow.deadline.getTime() - now.getTime();
      if (remaining <= 0) buckets[3].count += 1;
      else if (remaining < 5 * 60 * 1000) buckets[0].count += 1;
      else if (remaining < 15 * 60 * 1000) buckets[1].count += 1;
      else buckets[2].count += 1;
    }
    return buckets;
  }

  private violationSummary(violation: Violation) {
    const details = violation.details ?? {};
    return {
      id: violation.id,
      workflowId: violation.workflowId,
      ruleId: violation.ruleId,
      ruleName: violation.rule?.name ?? 'Unknown rule',
      type:
        typeof details.type === 'string' ? details.type : 'deadline_exceeded',
      severity:
        violation.severity === ViolationSeverity.HIGH ||
        violation.severity === ViolationSeverity.CRITICAL
          ? 'critical'
          : violation.severity === ViolationSeverity.LOW
            ? 'info'
            : 'warning',
      status: 'open',
      explanation: violation.reason,
      triggerEventName: violation.rule?.triggerEvent ?? 'Unknown trigger',
      affectedEventNames: violation.rule?.expectedEvents ?? [],
      occurredAt: violation.occurredAt.toISOString(),
      overdueMs: Math.max(
        0,
        violation.occurredAt.getTime() -
          (violation.workflow?.deadline.getTime() ??
            violation.occurredAt.getTime()),
      ),
      environment:
        typeof violation.workflow?.metadata?.environment === 'string'
          ? violation.workflow.metadata.environment
          : 'production',
    };
  }

  private percentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((left, right) => left - right);
    return sorted[
      Math.min(sorted.length - 1, Math.floor(sorted.length * percentile))
    ];
  }

  private duration(milliseconds: number): string {
    if (milliseconds < 60_000) return `${Math.round(milliseconds / 1000)}s`;
    if (milliseconds < 3_600_000)
      return `${Math.round(milliseconds / 60_000)}m`;
    return `${(milliseconds / 3_600_000).toFixed(1)}h`;
  }
}
