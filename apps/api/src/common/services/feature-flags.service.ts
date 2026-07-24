import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const FEATURE_FLAGS = [
  'investigations',
  'comparisons',
  'ruleSimulation',
  'deploymentAnalysis',
  'telemetryQuality',
  'signozAssetProvisioning',
  'demoSystem',
] as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[number];

@Injectable()
export class FeatureFlagsService {
  constructor(private readonly config: ConfigService) {}

  isEnabled(flag: FeatureFlag): boolean {
    return this.config.get<boolean>(`features.${flag}`) ?? false;
  }

  snapshot(): Readonly<Record<FeatureFlag, boolean>> {
    return Object.freeze(
      Object.fromEntries(
        FEATURE_FLAGS.map((flag) => [flag, this.isEnabled(flag)]),
      ) as Record<FeatureFlag, boolean>,
    );
  }
}
