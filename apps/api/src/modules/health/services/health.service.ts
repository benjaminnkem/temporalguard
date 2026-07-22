import { Injectable } from '@nestjs/common';
import { APP_NAME } from '../../../common/constants';

@Injectable()
export class HealthService {
  check() {
    return {
      status: 'ok',
      service: APP_NAME,
    };
  }
}
