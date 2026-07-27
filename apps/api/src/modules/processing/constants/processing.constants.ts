export const PROCESSING_QUEUE = 'durable-processing';
export const PROCESSING_DEAD_LETTER_QUEUE = 'durable-processing-dead-letter';

export const PROCESSING_JOB_NAMES = [
  'investigation',
  'comparison',
  'simulation',
  'deployment-analysis',
  'telemetry-quality',
] as const;

export type ProcessingJobName = (typeof PROCESSING_JOB_NAMES)[number];
