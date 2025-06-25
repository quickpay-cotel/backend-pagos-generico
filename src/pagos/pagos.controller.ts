import { Body, Controller, Post } from '@nestjs/common';
import { ConfirmaPagoQrDto } from './dto/request/confirma-pago-qr.dto';
import { PagosService } from './pagos.service';

@Controller('pagos')
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}
  @Post('confirma-pago-qr')
  async confirmaPagoQr(@Body() confirmaPagoQrDto: ConfirmaPagoQrDto) {
    return await this.pagosService.confirmaPagoQr(confirmaPagoQrDto);
  }
}
