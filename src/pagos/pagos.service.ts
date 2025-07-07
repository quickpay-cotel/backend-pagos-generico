import { UsuarioEmpresaConfiguracionRepository } from "./../common/repository/usuario/usuario.empresa_configuracion.repository";
import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";

import { FuncionesFechas } from "src/common/utils/funciones.fechas";
import { IDatabase } from "pg-promise";

import { PagosQrGeneradoRepository } from "src/common/repository/pagos/pagos.qr_gerenado.repository";
import { ConfirmaPagoQrDto } from "./dto/request/confirma-pago-qr.dto";
import { NotificationsGateway } from "src/notificaciones/notifications.gateway";

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
//import * as puppeteer from 'puppeteer';
import puppeteer from "puppeteer";

import { PagosTransaccionesRepository } from "src/common/repository/pagos/pagos.transacciones.repository";
import { PagosReservaDeudaRepository } from "src/common/repository/pagos/pagos.reserva.deuda.repository";
import { PagosDatosConfirmadoQrRepository } from "src/common/repository/pagos/pagos.datosconfirmado_qr.repository";
import { PagosErrorLogsRepository } from "src/common/repository/pagos/pagos.error_logs.repository";
import { PagosComprobanteFacturaRepository } from "src/common/repository/pagos/pagos.comprobante_factura.repository";
import { PagosDeudasRepository } from "src/common/repository/pagos/pagos.deudas.repository";

import { PagosComprobanteReciboRepository } from "src/common/repository/pagos/pagos.comprobante_recibo.repository";
import { ApiIllaService } from "src/common/external-services/api.illa.service";
import { IsipassGraphqlService } from "src/common/external-services/isipass.graphql.service";
import { FuncionesGenerales } from "src/common/utils/funciones.generales";

@Injectable()
export class PagosService {
  //private storePath = path.join(process.cwd(), 'store'); // Ruta de la carpeta 'store'

  private storePath = path.posix.join(process.cwd(), "store");
  private plantillasPath = path.posix.join(process.cwd(), "plantillas");
  constructor(
    private readonly pagosReservaDeudaRepository: PagosReservaDeudaRepository,
    private readonly pagosQrGeneradoRepository: PagosQrGeneradoRepository,
    private readonly pagosDatosConfirmadoQrRepository: PagosDatosConfirmadoQrRepository,
    private readonly pagosTransaccionesRepository: PagosTransaccionesRepository,
    private readonly pagosComprobanteFacturaRepository: PagosComprobanteFacturaRepository,
    private readonly pagosComprobanteReciboRepository: PagosComprobanteReciboRepository,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly pagosDeudasRepository: PagosDeudasRepository,
    private readonly pagosErrorLogsRepository: PagosErrorLogsRepository,
    private readonly apiIllaService: ApiIllaService,
    private readonly usuarioEmpresaConfiguracionRepository: UsuarioEmpresaConfiguracionRepository,
    private readonly isipassGraphqlService: IsipassGraphqlService,
    @Inject("DB_CONNECTION") private db: IDatabase<any>
  ) {}

  async confirmaPagoQr(confirmaPagoQrDto: ConfirmaPagoQrDto) {
    const ipServidor = os.hostname();
    const fechaInicio = new Date();
    let correoCliente = "sinemailcotel@quickpay.com.bo";
    let transactionInsert: any;
    try {
      // REGISTRAR CONFIRMACIÓN DE PAGO
      const qrGenerado = await this.pagosQrGeneradoRepository.findByAlias(
        confirmaPagoQrDto.alias
      );
      if (!qrGenerado) throw new Error("QR no generado por QUICKPAY");

      correoCliente = qrGenerado.email;
      if (qrGenerado.monto != confirmaPagoQrDto.monto)
        throw new Error("Monto no es igual al QR generado");

      const deudasReservados =
        await this.pagosReservaDeudaRepository.findByQrGeneradoId(
          qrGenerado.qr_generado_id
        );
      if (!deudasReservados.length)
        throw new Error("No existe pagos reservados");

      const transaccion = await this.pagosTransaccionesRepository.findByAlias(
        confirmaPagoQrDto.alias
      );
      if (transaccion.length > 0)
        throw new Error("Transacción ya se encuentra Registrado en QUICKPAY");

      await this.notificationsGateway.sendNotification("notification", {
        alias: confirmaPagoQrDto.alias,
        mensaje: "PROCESANDO PAGO",
      });

      await this.db.tx(async (t) => {
        const insertConfirmQr =
          await this.pagosDatosConfirmadoQrRepository.create({
            qr_generado_id: qrGenerado.qr_generado_id,
            alias_sip: confirmaPagoQrDto.alias,
            numero_orden_originante_sip:
              confirmaPagoQrDto.numeroOrdenOriginante,
            monto_sip: confirmaPagoQrDto.monto,
            id_qr_sip: confirmaPagoQrDto.idQr,
            moneda_sip: confirmaPagoQrDto.moneda,
            fecha_proceso_sip: confirmaPagoQrDto.fechaproceso,
            cuenta_cliente_sip: confirmaPagoQrDto.cuentaCliente,
            nombre_cliente_sip: confirmaPagoQrDto.nombreCliente,
            documento_cliente_sip: confirmaPagoQrDto.documentoCliente,
            json_sip: confirmaPagoQrDto,
            estado_id: 1000,
          });
        // registra transaccion realizado
        transactionInsert = await this.pagosTransaccionesRepository.create({
          datosconfirmado_qr_id: insertConfirmQr.datosconfirmado_qr_id,
          metodo_pago_id: 1008,
          monto_pagado: confirmaPagoQrDto.monto,
          moneda: confirmaPagoQrDto.moneda,
          estado_transaccion_id: 1010,
          estado_id: 1000,
        });
        // cambair estado de deudas reservados a PAGADO
        for (const deudaReservado of deudasReservados) {
          await this.pagosReservaDeudaRepository.cambiarEstadoReservaByDeudaId(
            deudaReservado.deuda_id,
            1005
          );
        }
      });
    } catch (error) {
      await this.pagosErrorLogsRepository.create({
        alias: confirmaPagoQrDto.alias,
        metodo: this.getMethodName() + " - recibir pago",
        mensaje: error.message,
        stack_trace: error.stack,
        ip_servidor: ipServidor,
        fecha_inicio: fechaInicio,
        fecha_fin: new Date(),
        parametros: confirmaPagoQrDto,
      });
      throw new HttpException(
        error.message || "Error interno del servidor",
        HttpStatus.NOT_FOUND
      );
    }

    // ============================

    const vNumeroUnico = FuncionesFechas.generarNumeroUnico();

    // GENERAR FACTURA
    //let nroFactura = await this.pagosComprobanteFacturaRepository.findNroFactura();

    //nroFactura = String(nroFactura).split("-")[1];

    await this.generarFacturaISIPASS(
      confirmaPagoQrDto.alias,
      transactionInsert.transaccion_id,
      vNumeroUnico + ""
    );

    // GENERAR RECIBOS
    await this.generarRecibo(
      confirmaPagoQrDto.alias,
      transactionInsert.transaccion_id,
      vNumeroUnico + ""
    );

    // NOTIFICAR POR SOCKET AL FRONTEND
    const datosPago = {
      nombreCliente: confirmaPagoQrDto.nombreCliente,
      monto: confirmaPagoQrDto.monto,
      moneda: confirmaPagoQrDto.moneda,
      idQr: confirmaPagoQrDto.idQr,
      fechaproceso: confirmaPagoQrDto.fechaproceso,
      documentoCliente: confirmaPagoQrDto.documentoCliente,
    };
    datosPago.fechaproceso = this.formatearFechaProcesadoDeSIP(
      datosPago.fechaproceso
    );
    await this.notificationsGateway.sendNotification("notification", {
      alias: confirmaPagoQrDto.alias,
      datosPago: datosPago,
      mensaje: "PAGO REALIZADO",
    });
    // confirmar pagooo
    this.pagosTransaccionesRepository.cambiarEstadoTransactionById(
      transactionInsert.transaccion_id,
      1009
    );
  }

  // Función para reemplazar los marcadores en la plantilla
  private renderTemplate(templatePath: string, data: any): string {
    let template = fs.readFileSync(templatePath, "utf8");
    Object.keys(data).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      template = template.replace(regex, data[key]);
    });
    return template;
  }
  private formatearFechaProcesadoDeSIP(dateString: string) {
    // Convertir la cadena en un objeto Date
    const date = new Date(dateString);

    // Obtener los componentes de la fecha
    const day = String(date.getDate()).padStart(2, "0"); // Día con 2 dígitos
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Mes con 2 dígitos
    const year = date.getFullYear(); // Año
    const hours = String(date.getHours()).padStart(2, "0"); // Horas con 2 dígitos
    const minutes = String(date.getMinutes()).padStart(2, "0"); // Minutos con 2 dígitos

    // Formato final: dd/MM/yyyy HH:mm
    const formattedDate = `${day}/${month}/${year} ${hours}:${minutes}`;

    return formattedDate;
  }
  private async generarRecibo(
    vAlias: string,
    vTransactionId: number,
    vNumeroUnico: string
  ): Promise<any> {
    const ipServidor = os.hostname();
    const fechaInicio = new Date();
    try {
      // Generar contenido HTML dinámico para RECIBO

      const transaccion =
        await this.pagosTransaccionesRepository.findByAlias(vAlias);
      const datosDeuda = await this.pagosDeudasRepository.findByAlias(vAlias);

      if (datosDeuda.length > 0) {
        const datosConfiguracion =
          await this.usuarioEmpresaConfiguracionRepository.DatosConfiguracionEmpresaByDeudaId(
            parseInt(datosDeuda[0].deuda_id)
          );
        // Construir las filas de la tabla para todos los items de datosDeuda
        const tableRows = datosDeuda
          .map(
            (item) => `
            <tr>
              <td>${item.descripcion_servicio ?? ""}</td>
              <td style="text-align: center;">${item.periodo ?? ""}</td>
              <td style="text-align: center;">${item.monto ?? "0"}</td>
              <td style="text-align: center;">${item.monto_descuento ?? "0"}</td>
              <td style="text-align: right;">
                ${(
                  (parseFloat(item.monto ?? 0) || 0) -
                  (parseFloat(item.monto_descuento ?? 0) || 0)
                ).toFixed(2)}
            </td>
          </tr>
          `
          )
          .join("");

        const totalPagado = datosDeuda
          .reduce(
            (acc, item) =>
              acc +
              (parseFloat(item.monto ?? "0") -
                parseFloat(item.monto_descuento ?? "0") || 0),
            0
          )
          .toFixed(2);

        const htmlContent = this.renderTemplate(
          this.plantillasPath + "/recibo.html",
          {
            nroRecibo: vAlias.slice(-8) ?? 0,
            nombreCliente: datosDeuda[0].nombre_completo ?? "",
            logo: datosConfiguracion.logo_base64 ?? "",
            concepto: datosDeuda[0].tipo_pago,
            fechaPago: FuncionesFechas.obtenerFechaFormato,
            metodoPago: "QR",
            tableRows,
            totalPagado,
          }
        );
        // modo ROOT  no es recomendable, pero pide el almalinux
        const browser = await puppeteer.launch({
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: "load" });
        const pdfBuffer = Buffer.from(await page.pdf({ format: "A4" }));
        await browser.close();
        // Guardar el buffer como un archivo PDF
        fs.writeFileSync(
          this.storePath +
            "/recibos/" +
            "recibo-" +
            vAlias +
            "_" +
            vNumeroUnico +
            ".pdf",
          pdfBuffer
        );
        await this.pagosComprobanteReciboRepository.create({
          identificador: 0,
          transaccion_id: transaccion[0].transaccion_id,
          ruta_pdf:
            this.storePath +
            "/recibos/" +
            "recibo-" +
            vAlias +
            "_" +
            vNumeroUnico +
            ".pdf",
          fecha_emision: new Date(),
          estado_id: 1000,
        });
      }
      this.pagosTransaccionesRepository.cambiarEstadoTransactionById(
        vTransactionId,
        1012
      ); // PAGO GENERA RECIBO
    } catch (error) {
      this.pagosTransaccionesRepository.cambiarEstadoTransactionById(
        vTransactionId,
        1013
      ); // PAGO FALLADO
      await this.pagosErrorLogsRepository.create({
        alias: vAlias,
        metodo: this.getMethodName() + " - generar recibo",
        mensaje: error.message,
        stack_trace: error.stack,
        ip_servidor: ipServidor,
        fecha_inicio: fechaInicio,
        fecha_fin: new Date(),
        parametros: { alias: vAlias, transactin_id: vTransactionId },
      });
    }
  }
  private getMethodName(): string {
    const stack = new Error().stack;
    if (!stack) return "UnknownMethod";

    const stackLines = stack.split("\n");
    if (stackLines.length < 3) return "UnknownMethod";

    return stackLines[2].trim().split(" ")[1]; // Extrae el nombre del método
  }
  async obtenerComprobantes(pAlias: string) {
    let nombres: string[] = [];
    try {
      // verificar estado de la transaccion
      let recibos =
        await this.pagosComprobanteReciboRepository.findByAlias(pAlias);
      for (var recibo of recibos) {
        nombres.push(path.basename(recibo.ruta_pdf));
      }
      let facturas =
        await this.pagosComprobanteFacturaRepository.findByAlias(pAlias);
      for (var factura of facturas) {
        nombres.push(path.basename(factura.ruta_pdf));
      }
      return nombres;
      //return nombres;
    } catch (error) {
      console.log(error);
      throw new HttpException(error, HttpStatus.NOT_FOUND);
    }
  }
  private async generarFacturaISIPASS(
    vAlias: string,
    vTransactionId: number,
    vNumeroUnico: string
  ): Promise<any> {
    const ipServidor = os.hostname();
    const fechaInicio = new Date();
    try {
      const datosDeuda = await this.pagosDeudasRepository.findByAlias(vAlias);
      if (datosDeuda.length == 0) {
        throw new Error("No se encontraron deudas para generar la factura");
      }
      const qrGenerado =
        await this.pagosQrGeneradoRepository.findByAlias(vAlias);
      if (!qrGenerado) {
        throw new Error("QR no generado por QUICKPAY al generar factura");
      }
      const resFacGenerado = await this.isipassGraphqlService.crearFactura(
        datosDeuda,
        qrGenerado
      );

      const facturaCompraVentaCreate =
        resFacGenerado?.data?.facturaCompraVentaCreate || {};

      const { representacionGrafica, sucursal, puntoVenta } =
        facturaCompraVentaCreate;

      const pdfUrl = representacionGrafica?.pdf;
      const xmlUrl = representacionGrafica?.xml;

      if (!pdfUrl || !xmlUrl) {
        throw new Error(
          "No se recibieron URLs de PDF o XML desde crearFactura"
        );
      }

      let pdfBase64: string;
      let xmlBase64: string;
      let filePathPdf: string;
      let filePathXml: string;

      try {
        const funcionesGenerales = new FuncionesGenerales();
        pdfBase64 = await funcionesGenerales.downloadFileAsBase64(pdfUrl);
        xmlBase64 = await funcionesGenerales.downloadFileAsBase64(xmlUrl);

        filePathPdf = path.join(
          this.storePath,
          "facturas",
          `factura-${vAlias}_${vNumeroUnico}.pdf`
        );
        filePathXml = path.join(
          this.storePath,
          "facturas",
          `factura-${vAlias}_${vNumeroUnico}.xml`
        );

        fs.writeFileSync(filePathPdf, Buffer.from(pdfBase64, "base64"));
        fs.writeFileSync(filePathXml, Buffer.from(xmlBase64, "base64"));
        console.log(
          "Archivos (factura XML y PDF) descargados y almacenados exitosamente"
        );
      } catch (error) {
        throw new Error(
          `Error al descargar o guardar los archivos (XML y PDF): ${error.message}`
        );
      }

      // REGISTRA FACTURA
      let transaccion =
        await this.pagosTransaccionesRepository.findByAlias(vAlias);
      await this.pagosComprobanteFacturaRepository.create({
        transaccion_id: transaccion[0].transaccion_id,

        // Datos que retorna ISIPASS
        codigo_cliente: facturaCompraVentaCreate?.cliente?.codigoCliente,
        numero_documento: facturaCompraVentaCreate?.cliente?.numeroDocumento,
        razon_social: facturaCompraVentaCreate?.cliente?.razonSocial,
        complemento: facturaCompraVentaCreate?.cliente?.complemento,
        email: facturaCompraVentaCreate?.cliente?.email,

        cuf: facturaCompraVentaCreate?.cuf,
        numero_factura: facturaCompraVentaCreate?.numeroFactura,
        estado: facturaCompraVentaCreate?.state,

        url_pdf: representacionGrafica?.pdf,
        url_xml: representacionGrafica?.xml,
        url_sin: representacionGrafica?.sin,
        url_rollo: representacionGrafica?.rollo,

        sucursal_codigo: sucursal?.codigo,
        punto_venta_codigo: puntoVenta?.codigo,

        // otros campos
        ruta_xml: filePathXml,
        ruta_pdf: filePathPdf,

        estado_id: 1000,
      });
      this.pagosTransaccionesRepository.cambiarEstadoTransactionById(
        vTransactionId,
        1011
      );
    } catch (error) {
      this.pagosTransaccionesRepository.cambiarEstadoTransactionById(
        vTransactionId,
        1013
      );
      await this.pagosErrorLogsRepository.create({
        alias: vAlias,
        metodo: this.getMethodName() + " - generar factura",
        mensaje: error.message,
        stack_trace: error.stack,
        ip_servidor: ipServidor,
        fecha_inicio: fechaInicio,
        fecha_fin: new Date(),
        parametros: { alias: vAlias, transactin_id: vTransactionId },
      });
    }
  }
}
