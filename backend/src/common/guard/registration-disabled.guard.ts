import {
  Injectable,
  CanActivate,
  BadRequestException,
} from '@nestjs/common';

/**
 * Guard to disable public registration
 * All requests through this guard will be rejected with a deprecation error
 */
@Injectable()
export class RegistrationDisabledGuard implements CanActivate {
  canActivate(): never {
    throw new BadRequestException({
      message: 'Public registration is disabled. Please use an invitation link to join an organization.',
      error: 'RegistrationDisabled',
    });
  }
}
