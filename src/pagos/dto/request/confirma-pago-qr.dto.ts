import { Transform } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsDateString,
  IsUUID,
  IsNotEmpty,
} from 'class-validator';

import * as moment from 'moment-timezone';

export class ConfirmaPagoQrDto {
  @IsUUID()
  alias: string;

  @IsString()
  numeroOrdenOriginante: string;

  @IsNumber()
  monto: number;

  @IsString()
  idQr: string;

  @IsString()
  moneda: string;

  /*@IsString()
  fechaproceso: string;*/

  @Transform(({ value }) => {
    const fecha = new Date(value);

    // Convertir la fecha a la zona horaria de Bolivia (UTC-4) con moment-timezone
    const fechaBolivia = moment(fecha)
      .tz('America/La_Paz')
      .format('YYYY-MM-DD HH:mm:ss');

    return fechaBolivia;
  })
  @IsString()
  fechaproceso: string;

  @IsString()
  cuentaCliente: string;

  @IsString()
  nombreCliente: string;

  @IsString()
  documentoCliente: string;
}
