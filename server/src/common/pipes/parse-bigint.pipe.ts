import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParseBigIntPipe implements PipeTransform<string, bigint> {
  transform(value: string): bigint {
    if (typeof value !== 'string' || !/^\d+$/.test(value)) {
      throw new BadRequestException('Expected a numeric id');
    }
    return BigInt(value);
  }
}
