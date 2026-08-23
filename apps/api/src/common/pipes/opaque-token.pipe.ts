import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class OpaqueTokenPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!/^[A-Za-z0-9_-]{43}$/.test(value)) {
      throw new BadRequestException('Invalid invitation token');
    }
    return value;
  }
}
