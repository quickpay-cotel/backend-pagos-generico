import { Body, Controller, Post } from '@nestjs/common';
import { DeudasService } from './deudas.service';
import { ConsultaDeudaRequestDto } from './dto/request/deuda-cliente.request.dto';
import { GeneraQrRequestDto } from './dto/request/genera-qr.request.dto';


@Controller('deudas')
export class DeudasController {
  constructor(private readonly deudasService: DeudasService) {}
  @Post('datos-cliente')
  async DatosCliente(@Body() body: ConsultaDeudaRequestDto) {
    const { tipoPago, parametroBusqueda } = body;
    return this.deudasService.buscarDatosCliente(tipoPago, parametroBusqueda);
  }
  @Post('cobros-pendiente')
  async DeudaCliente(@Body() body: ConsultaDeudaRequestDto) {
    const { tipoPago, parametroBusqueda } = body;
    return this.deudasService.cobrosPendientesByCriterioBusqueda(tipoPago, parametroBusqueda);
  }
  @Post('generar-qr')
  async generarQr(@Body() generaQrRequestDto: GeneraQrRequestDto) {
    return await this.deudasService.generaQr(generaQrRequestDto);
  }
}
