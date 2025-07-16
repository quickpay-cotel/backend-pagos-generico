import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { PagosDeudasRepository } from 'src/common/repository/pagos/pagos.deudas.repository';

import { FuncionesFechas } from 'src/common/utils/funciones.fechas';
import { FuncionesGenerales } from 'src/common/utils/funciones.generales';
import { PagosReservaDeudaRepository } from 'src/common/repository/pagos/pagos.reserva.deuda.repository';
import { v4 as uuidv4 } from 'uuid';
import { ApiSipService } from 'src/common/external-services/api.sip.service';
import * as fs from 'fs';
import * as path from 'path';
import { IDatabase } from 'pg-promise';
import { PagosQrGeneradoRepository } from 'src/common/repository/pagos/pagos.qr_gerenado.repository';
import { DatosClienteResponseDto } from './dto/response/datos-cliente.response.dto';
import { GeneraQrRequestDto } from './dto/request/genera-qr.request.dto';
import { DeudaClienteResponseDto } from './dto/response/deuda-cliente.response.dto';

@Injectable()
export class DeudasService {
  private storePath = path.posix.join(process.cwd(), 'store');

  constructor(
    private readonly pagosDeudasRepository: PagosDeudasRepository,
    private readonly pagosReservaDeudaRepository: PagosReservaDeudaRepository,
    private readonly apiSipService: ApiSipService,
    private readonly pagosQrGeneradoRepository: PagosQrGeneradoRepository,
    @Inject('DB_CONNECTION') private db: IDatabase<any>,
  ) {}

  async buscarDatosCliente(tipoPago: string, parametroBusqueda: string): Promise<DatosClienteResponseDto> {
    try {
      const deudas = await this.pagosDeudasRepository.findByCodClienteOrNumeroDocumento(parametroBusqueda, parseInt(tipoPago));
      return {
        codigoCliente: deudas[0].codigo_cliente,
        nombreCompleto: deudas[0].nombre_completo,
        tipoDocumento: deudas[0].tipo_documento,
        numeroDocumento: deudas[0].numero_documento,
        complementoDocumento: deudas[0].complemento_documento ?? '',
        email: deudas[0].email ?? '',
        telefono: deudas[0].telefono ?? '',
      };
    } catch (error) {
      console.log(error);
      throw new HttpException('No se encontraron registros de cliente.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  async buscarDeudaCliente(tipoPago: string, parametroBusqueda: string): Promise<DeudaClienteResponseDto[]> {
    console.log(tipoPago);
    try {
      const deudas = await this.pagosDeudasRepository.deudasPendientesByCriterioBusqueda(parametroBusqueda, parseInt(tipoPago));
      return deudas.map((obj) => ({
        deudaId: obj.deuda_id,
        codigoProducto: obj.codigo_producto,
        descripcion: obj.descripcion,
        periodo: obj.periodo,
        cantidad: obj.cantidad,
        precioUnitario: obj.precio_unitario,
        montoDescuento: obj.monto_descuento ?? 0,
        montoTotal: parseFloat(obj.precio_unitario) * parseFloat(obj.cantidad ?? 1) - parseFloat(obj.monto_descuento ?? 0),
        email: obj.email,
        telefono: obj.telefono,
        fechaRegistro: obj.fecha_registro,
      }));
    } catch (error) {
      console.log(error);
      throw new HttpException('No se encontraron registros de deuda.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async generaQr(generaQrRequestDto: GeneraQrRequestDto) {
    const idTransaccion = '';
    try {
      const funcionesGenerales = new FuncionesGenerales();
      const resPuedePagar = funcionesGenerales.puedePagar();
      if (!resPuedePagar.permitido) {
        throw new Error(resPuedePagar.mensaje);
      }

      // obtener deudas
      const lstDeudas: any = [];
      for (const deuda_id of generaQrRequestDto.deudaIds) {
        const deuda = await this.pagosDeudasRepository.findById(deuda_id);
        if (!deuda) {
          throw new Error('Deudas no existen registrados en SISTEMA');
        }
        lstDeudas.push(deuda);
      }

      // generar qr con BISA
      //const montoTodal = await lstDeudas.reduce((total, deuda) => total + (parseFloat(deuda.monto) - parseFloat(deuda.monto_descuento ?? 0)), 0);

      const montoTodal = parseFloat(
        lstDeudas
          .reduce((acc, deuda) => {
            const monto = parseFloat(deuda.precio_unitario ?? '0');
            const cantidad = parseFloat(deuda.cantidad ?? '1');
            const montoDescuento = parseFloat(deuda.monto_descuento ?? '0');
            return acc + (monto * cantidad - montoDescuento);
          }, 0)
          .toFixed(2),
      );

      const detalleGlosa = lstDeudas.map((item) => item.deuda_id + ' ' + item.codigo_cliente + ' ' + item.periodo).join(', ');
      const dataGeneraQr = {
        detalleGlosa: detalleGlosa,
        monto: parseFloat(montoTodal.toFixed(2)),
        moneda: 'BOB',
        fechaVencimiento: FuncionesFechas.formatDateToDDMMYYYY(new Date()),
        alias: uuidv4(),
        callback: process.env.SIP_CALLBACK,
        tipoSolicitud: 'API',
        unicoUso: 'true',
      };
      const datosQr = await this.apiSipService.generaQr(dataGeneraQr);
      if (!datosQr.imagenQr) throw new Error('error al generar QR');

      // almacenar  QR en archivo
      await this.almacenarQR(datosQr.imagenQr, dataGeneraQr.alias);

      // registrar en BD  TRANSACTIONAL
      return await this.db.tx(async (t) => {
        // registrar QR generado
        const qrGenerado = await this.pagosQrGeneradoRepository.create(
          {
            alias: dataGeneraQr.alias,
            callback: dataGeneraQr.callback,
            detalle_glosa: dataGeneraQr.detalleGlosa,
            monto: dataGeneraQr.monto,
            moneda: dataGeneraQr.moneda,
            tipo_solicitud: dataGeneraQr.tipoSolicitud,
            unico_uso: dataGeneraQr.unicoUso,
            ruta_qr: this.storePath + '/qr/' + 'qr-' + dataGeneraQr.alias + '.jpg',
            id_qr_sip: datosQr.idQr,
            fecha_vencimiento_sip: datosQr.fechaVencimiento,
            banco_destino_sip: datosQr.bancoDestino,
            cuenta_destino_sip: datosQr.cuentaDestino,
            id_transaccion_sip: datosQr.idTransaccion,
            es_imagen_sip: datosQr.esImagen,
            email: generaQrRequestDto.email, // este correo vendra dela interfaz
            telefono: generaQrRequestDto.telefono,
            estado_id: 1000,
          },
          t,
        );
        if (!qrGenerado) throw new Error('nose pudo registrar QR');

        for (const deuda of lstDeudas) {
          // reserva deuda
          await this.pagosReservaDeudaRepository.create(
            {
              deuda_id: deuda.deuda_id,
              qr_generado_id: qrGenerado.qr_generado_id,
              estado_reserva_id: 1004, // RESERVADO
              fecha_expiracion: new Date(),
              estado_id: 1000,
            },
            t,
          );
        }

        return {
          imagen_qr: 'data:image/png;base64,' + datosQr.imagenQr,
          fecha_vencimiento: datosQr.fechaVencimiento,
          alias: dataGeneraQr.alias,
          id_transaccion_reserva: idTransaccion,
        };
      });
    } catch (error) {
      console.log(error);
      throw new HttpException('Algo Salio Mal', HttpStatus.NOT_FOUND);
    }
  }

  async almacenarQR(imgQRBase64, alias) {
    try {
      // Decodificar el string Base64
      const buffer = Buffer.from(imgQRBase64, 'base64');
      // Ruta completa del archivo
      const filePath = path.join(this.storePath + '/qr', 'qr-' + alias + '.jpg');
      // Guardar el archivo en la carpeta 'store'
      fs.writeFileSync(filePath, buffer);
    } catch (error) {
      console.log(error);
      throw new Error(`Error al guardar el QR: ${error.message}`);
    }
  }
}
