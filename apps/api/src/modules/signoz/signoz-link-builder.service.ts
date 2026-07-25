import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SigNozSignal } from './signoz.types';

@Injectable()
export class SigNozLinkBuilder {
  constructor(private readonly config: ConfigService) {}

  build(input: {
    signal: SigNozSignal;
    traceId?: string;
    from: Date;
    to: Date;
  }): string | undefined {
    const configured = this.config.get<string>('signoz.uiUrl');
    if (!configured) return undefined;
    const base = new URL(configured);
    if (!['http:', 'https:'].includes(base.protocol)) return undefined;
    base.username = '';
    base.password = '';
    if (
      input.signal === 'traces' &&
      input.traceId &&
      /^[a-fA-F0-9]{16,32}$/.test(input.traceId)
    ) {
      base.pathname = `/trace/${encodeURIComponent(input.traceId)}`;
    } else {
      base.pathname =
        input.signal === 'traces'
          ? '/traces-explorer'
          : input.signal === 'logs'
            ? '/logs-explorer'
            : '/metrics-explorer';
    }
    base.searchParams.set('startTime', String(input.from.getTime()));
    base.searchParams.set('endTime', String(input.to.getTime()));
    return base.toString();
  }
}
