// deuda.dto.ts
export class DeudaClienteResponseDto {
  deudaId: number;
  codigoServicio: string;
  descripcionServicio: string;
  periodo: string;
  monto: number;
  montoDescuento: number;
  montoTotal: number;
  email: string;
  telefono: string;
  fechaRegistro: Date;
}
