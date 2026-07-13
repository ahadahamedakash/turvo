import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';

/**
 * Pipe to disable public registration
 * Returns a deprecation error instead of processing the request
 */
@Injectable()
export class RegistrationDisabledPipe implements PipeTransform {
  transform(): never {
    throw new BadRequestException({
      message:
        'Public registration is disabled. Please use an invitation link to join an organization.',
      error: 'RegistrationDisabled',
    });
  }
}
