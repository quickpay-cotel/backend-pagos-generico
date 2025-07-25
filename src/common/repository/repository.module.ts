import { Module } from '@nestjs/common';
import { PagosDeudasRepository } from './pagos/pagos.deudas.repository';
import { PagosComprobanteFacturaRepository } from './pagos/pagos.comprobante_factura.repository';


import { PagosErrorLogsRepository } from './pagos/pagos.error_logs.repository';
import { PagosQrGeneradoRepository } from './pagos/pagos.qr_gerenado.repository';
import { PagosReservaDeudaRepository } from './pagos/pagos.reserva.deuda.repository';
import { PagosTransaccionesRepository } from './pagos/pagos.transacciones.repository';
import { PagosComprobanteReciboRepository } from './pagos/pagos.comprobante_recibo.repository';
import { UsuarioEmpresaConfiguracionRepository } from './usuario/usuario.empresa_configuracion.repository';
import { PagosDominiosRepository } from './pagos/pagos.dominios.repository';
import { PagosTransaccionDeudaRepository } from './pagos/pagos.transaccion_deuda.repository';

@Module({
  imports: [], // Importa el ConfigModule para manejar las variables de entorno
  providers: [
    PagosComprobanteReciboRepository,
    PagosDeudasRepository,
    PagosComprobanteFacturaRepository,
    PagosDeudasRepository,
    PagosErrorLogsRepository,
    PagosQrGeneradoRepository,
    PagosReservaDeudaRepository,
    PagosTransaccionesRepository,
    UsuarioEmpresaConfiguracionRepository,
    PagosDominiosRepository,
    PagosTransaccionDeudaRepository
  ],
  exports: [
    UsuarioEmpresaConfiguracionRepository,
    PagosComprobanteReciboRepository,
    PagosDeudasRepository,
    PagosComprobanteFacturaRepository,
    PagosDeudasRepository,
    PagosErrorLogsRepository,
    PagosQrGeneradoRepository,
    PagosReservaDeudaRepository,
    PagosTransaccionesRepository,
    PagosDominiosRepository,
    PagosTransaccionDeudaRepository
  ],
})
export class RepositoryModule {}
