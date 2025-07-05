import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ConfirmaPagoQrDto } from "./dto/request/confirma-pago-qr.dto";
import { PagosService } from "./pagos.service";

@Controller("pagos")
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}
  @Post("confirma-pago-qr")
  async confirmaPagoQr(@Body() confirmaPagoQrDto: ConfirmaPagoQrDto) {
    return await this.pagosService.confirmaPagoQr(confirmaPagoQrDto);
  }
  @Get("obtener-comprobantes/:alias")
  async liberarReserva(@Param("alias") pAlias: string) {
    return await this.pagosService.obtenerComprobantes(pAlias);
  }
}
