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
    let nroFactura =
      await this.pagosComprobanteFacturaRepository.findNroFactura();

    nroFactura = String(nroFactura).split("-")[1];

    //let resFact = await this.generarFacturaILLA(confirmaPagoQrDto.alias, transactionInsert.transaccion_id, vNumeroUnico + "", nroFactura);

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

  private async generarFacturaILLA(
    vAlias: string,
    vTransactionId: number,
    vNumeroUnico: string,
    vNumerofactura: string
  ): Promise<any> {
    const ipServidor = os.hostname();
    const fechaInicio = new Date();
    try {
      // GGENERAR FACTURA
      let productos = await this.apiIllaService.obtenerProductos();
      if (!productos || productos.length == 0) {
        throw new Error(`no se pudo obtener productos de SIAT`);
      }
      let sucursales = await this.apiIllaService.obtenerSucursales();
      if (!sucursales || sucursales.length == 0) {
        throw new Error(`no se pudo obtener sucursales de SIAT`);
      }
      let puntosDeventas = await this.apiIllaService.obtenerPuntosVentas();
      if (!puntosDeventas || puntosDeventas.length == 0) {
        throw new Error(`no se pudo obtener puntos de venats de SIAT`);
      }

      let deudas = await this.pagosDeudasRepository.findByAliasPagado(vAlias);
      let qrGenerado = await this.pagosQrGeneradoRepository.findByAlias(vAlias);

      let tipoDoc = 0;
      if (deudas[0].tipo_documento == "CI") tipoDoc = 1;
      if (deudas[0].tipo_documento == "CEX") tipoDoc = 2;
      if (deudas[0].tipo_documento == "PAS") tipoDoc = 3;
      if (deudas[0].tipo_documento == "OD") tipoDoc = 4;
      if (deudas[0].tipo_documento == "NIT") tipoDoc = 5;

      // preparar datos para geneta factura
      let datosFactura = {
        /*Identificador de la sucursal o punto de venta en la que se realiza la emisión de la
        factura. Si no se emite facturas desde un punto de venta entonces utilizará el
        identificador y codigoSucursal de una de las sucursales, pero en codigoPuntoVenta
        debe ser igual a cero 0.
        Este identificador es obtenido al momento de registrar sucursales o puntos de venta,
        la descripción de los endpoints puede verse en el recurso customers (es posible
        consultar las sucursales y de ella obtener los identificadores requeridos).
        Debe ser almacenado en su sistema para su uso en la emisión.*/
        identificador: puntosDeventas[0].identificador,

        //Código del tipo de envío realizado: 38=Individual, 39=Paquete y 40=Masivo
        tipoEnvioId: 38, //int

        /*
        Código del tipo de documento sector que será emitido.
        1=FACTURA COMPRA VENTA
        2=FACTURA COMPRA VENTA BONIFICACIONE
        */
        codigoDocumentoSector: 22,

        /*
        Código del punto de venta registrado en el SIN. Este valor es asignado por el SIAT cuando se realiza la creación de un punto de venta.
        Este valor debe ser almacenado en su sistema para su uso en la emisión
        */
        codigoPuntoVenta: puntosDeventas[0].codigoPuntoVenta,

        /*
        Código de la sucursal desde al cual se emitirá una factura, este valor es exactamente el utilizado en el padrón de contribuyentes del SIN
        */
        codigoSucursal: puntosDeventas[0].codigoSucursal,

        /*  Texto que determina el lugar de emisión (municipio o departamento) de la factura. Algunos ejemplos:
        - Santa Cruz
        - Montero
        - La Paz-Copacabana
        Queda a criterio de la empresa, tomando en cuenta que este valor se imprime en la
        representación gráfica, en la cabecera parte superior izquierda.
      */
        municipio: "La Paz", //string

        /*
        Número de teléfono que puede ser celular o número de teléfono de la empresa, sucursal o punto de venta. Algunos ejemplos:
      - 591 72452154
      - 70612345
      - 22584983
      - 33352645
        Queda a criterio de la empresa, tomando en cuenta que este valor se imprime en la representación gráfica, en la cabecera parte superior izquierda
        */
        telefono: "64074742", //string // definir

        /*Número de factura con la cual se emitirá la factura, este valor es definido plenamente
        por la empresa, sin embargo, puede contactarse con el equipo para realizar un
        control sobre la secuencia de ser necesario*/
        numeroFactura: parseInt(vNumerofactura), //ricardo dijo q se reinice por año

        /*Nombre o Razón Social de la empresa a la que se emite la factura*/
        nombreRazonSocial: deudas[0].nombre_factura, //string

        /*Código del tipo de Documento de Identidad del cliente beneficiario de la factura. Los
        posibles valores son:
        • 1=Cédula de Identidad (CI)
        • 2=Cédula de Identidad Extranjero (CEX)
        • 3=Pasaporte (PAS)
        • 4=Otros Documentos (OD)
        • 5=Número de Identificación Tributaria (NIT)*/
        codigoTipoDocumentoIdentidad: tipoDoc, //int

        //Número de documento de identidad del cliente beneficiario de la factura.
        numeroDocumento: deudas[0].numero_documento, //string

        /*Código de cliente asociado al beneficiario de la factura. Este código debe ser creado
        por el sistema de clientes de la empresa conforme normativa del SIN. Algunas
        empresas prefieren mantener el mismo número de documento de identidad más el
        complemento para el tema de duplicados. Es definición plena de la empresa*/
        codigoCliente:
          deudas[0].numero_documento + "-" + deudas[0].complemento_documento, //string

        /*Correo electrónico al cual se enviará la representación gráfica del documento fiscal y el archivo XML conforme normativa del SIN*/
        correoElectronico: qrGenerado.correo_para_comprobante, //string

        /*Código del método de pago utilizado en la transacción comercial. Los valores
          comúnmente utilizados son:
          • 1=EFECTIVO
          • 2=TARJETA DEBITO/CREDITO
          • 3=CHEQUE
          • 4=VALE
          • 5=OTROS
          • 6=PAGOS POSTERIOR (CREDITO)
          • 7=TRASNFERENCIA BANCARIA
          • 8=DEPOSITO EN CUENTA
          • 27=GIFTCARD
          • 31=CANAL DE PAGO
          • 32=BILLETERA MOVIL
          • 33=PAGO ONLINE
          Si se requiere combinaciones u otros métodos de pago favor contactarse con soporte
          para que le entreguen el catálogo completo.
        */
        codigoMetodoPago: 1, //int
        /*
        Código de moneda en la que se realizó la transacción comercial. Los valores comunes son:
          • 1=BOLIVIANO
          • 2=DOLARES
          • 7=EURO
          • 9=PESO ARGENTINO
          • 23=REAL BRASILEÑO
          • 33=PESO CHILENO
          • 35=PESO COLOMBIANO
          • 109=NUEVO SOL PERUANO
        Si se requiere otros códigos de moneda por favor contactarse con soporte para que
        le entreguen el catálogo completo.
        */
        codigoMoneda: 1, //int
        /*
        Valor del tipo de cambio que debe ser aplicado cuando el código de moneda es
        diferente a bolivianos. Cuando el código de Moneda es bolivianos entonces debe
        enviarse el valor 1. Acepta hasta 2 decimales
        */
        tipoCambio: 1, //decimal
        /*Monto total o parcial de la transacción comercial que es pagada con GIFT-CARD. Se
        debe tomar en cuenta que este valor será tomado solamente si el código método de
        pago es GIFT CARD o alguna combinación que la involucre. Por defecto pueden
        enviarse valor cero (0).*/
        montoGiftCard: 0, //decimal
        /*
        Monto de descuento global a la transacción comercial. Acepta hasta 2 decimales. Es
        necesario considerar que este monto es independiente y no representa la suma de
        los descuentos de cada ítem de la factura. Por defecto pueden enviarse valor cero
        (0).
        */
        descuentoAdicional: 0, //decimal
        /*
        Código que permite identificar si un NIT observado puede enviado al SIN como
        declaración indicando que es el dato proporcionado por el cliente. Valores posibles
        • True=Declaro que el NIT es lo que indicó y confirmó el cliente
        • False=El NIT debe ser validado en la transacción de emisión
        */
        codigoExcepcion: true, //bool
        /*
        Texto que permite identificar que usuario del sistema de la empresa que emitió el
        documento fiscal. Ejemplos:
        • USER01
        • AGROTEXT001
        • JUANPEREZ
        • JPEREZ
        */
        usuario: "QUICKPAY-ONLINE", //string
        details: [],
      };
      let lstDetalleDeuda: any = [];
      for (var deuda of deudas) {
        let productoSIAT = productos.filter(
          (r) => r.codProductoEmpresa == deuda.codigoServicio
        );

        // si no hay producto en SIAT creamos nuevo
        if (productoSIAT.length == 0) {
          throw new Error(
            `el producto ${deuda.codigoServicio} no existe o esta registrado mas de 1 vez en SIAT`
          );
        } else if (productoSIAT.length > 1) {
          throw new Error(
            `el producto ${deuda.codigoServicio} se ha registrado mas de  1 vez en SIAT`
          );
        }

        const detalleDeuda = {
          /*
              Identificador de un producto registrado en Illasoft, este valor es obtenido al
              momento de registrar los productos de la empresa en el recurso customers, el
              mismo es detallado más adelante
              */
          empresaProductoId: productoSIAT[0].empresaProductoId, //long
          /*Valor numérico que determina la cantidad de productos o servicios que se
              encuentran detallados en el ítem. Para la venta de productos sujetos a peso, puede
              enviarse valores como: 1.25, 2.67
              Para la venta de servicios el valor generalmente es 1*/

          cantidad: 1, //decimal
          //Monto que representa el precio del producto o servicio. Acepta 2 decimales.
          precioUnitario: parseFloat(deuda.monto), //decimal
          /*Monto que representa el descuento aplicado al producto o servicio vendido. Acepta
              2 decimales. Se debe considerar que este valor no llega al Registro de Compras del
              cliente dado que el SIN asume que este tipo de descuentos pueden considerarse
              neteados*/
          montoDescuento: 0, //decimal
        };
        lstDetalleDeuda.push(detalleDeuda);
      }
      if (lstDetalleDeuda.length > 0) {
        datosFactura.details = lstDetalleDeuda;

        // GGENERAR FACTURA
        let resFacturacion =
          await this.apiIllaService.generarFacturaTelcom(datosFactura);
        if (!resFacturacion.status) {
          throw new Error(resFacturacion.message);
        }
        resFacturacion = resFacturacion.result;
        // ALMACENAR XML Y PDF
        const filePathPdf = path.join(
          this.storePath + "/facturas",
          "factura-" + vAlias + "_" + vNumeroUnico + ".pdf"
        );
        const filePathXml = path.join(
          this.storePath + "/facturas",
          "factura-" + vAlias + "_" + vNumeroUnico + ".xml"
        );

        try {
          // Decodificar el string Base64
          const bufferPdf = Buffer.from(resFacturacion.pdf, "base64");
          const bufferXml = Buffer.from(resFacturacion.xml, "base64");
          // Guardar el archivo en la carpeta 'store'
          fs.writeFileSync(filePathPdf, bufferPdf);
          fs.writeFileSync(filePathXml, bufferXml);
          console.log("Archivos (factura XML y PDF) almacenado exitosamente");
        } catch (error) {
          throw new Error(
            `Error al guardar el archivos (XML Y PDF): ${error.message}`
          );
        }

        // REGISTRA FACTURA
        let transaccion =
          await this.pagosTransaccionesRepository.findByAlias(vAlias);
        await this.pagosComprobanteFacturaRepository.create({
          identificador: resFacturacion.identificador,
          transaccion_id: transaccion[0].transaccion_id,
          ruta_xml: filePathXml,
          ruta_pdf: filePathPdf,
          leyenda: resFacturacion.leyenda,
          leyenda_emision: resFacturacion.leyendaEmision,
          cufd: resFacturacion.cufd,
          cuf: resFacturacion.cuf,
          fecha_emision: resFacturacion.fechaEmision,
          estado_id: 1000,
        });
        this.pagosTransaccionesRepository.cambiarEstadoTransactionById(
          vTransactionId,
          1011
        );
        return resFacturacion;
      } else {
        return null;
      }
    } catch (error) {
      // se debe alacenar log del error ....
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

      return null;
    }
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
        const htmlContent = this.renderTemplate(
          this.plantillasPath + "/recibo.html",
          {
            nroRecibo: vAlias.slice(-8) ?? 0,
            nombreCliente: datosDeuda.nombre_completo ?? "",
            //fechaPago: datosDeuda.fechaPago ?? '',
            concepto: datosDeuda.descripcion_servicio,
            fechaPago: FuncionesFechas.obtenerFechaFormato,
            metodoPago: "QR",
            tableRows: `
  <tr>
    <td>${datosDeuda.descripcion_servicio ?? ""}</td>
    <td style="text-align: center;">${datosDeuda.periodo ?? ""}</td>
    <td style="text-align: right;">${parseFloat(datosDeuda.monto).toFixed(2)}</td>
  </tr>
`,
            totalPagado: `${parseFloat(datosDeuda.monto).toFixed(2)}`,
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
}
