import { IsArray, ArrayNotEmpty, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class GeneraQrRequestDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true }) // Valida que cada elemento sea entero
  @Type(() => Number)     // Transforma cada elemento del array a Number
  deudaIds: number[];
  email:string;
  telefono:string;
}
