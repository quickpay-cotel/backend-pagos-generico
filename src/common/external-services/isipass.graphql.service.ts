import { Injectable } from "@nestjs/common";
import axios from "axios";

@Injectable()
export class IsipassGraphqlService {
  private readonly graphqlUrl: any = process.env.ISIPASS_GRAPHQL_URL;
  private readonly token: any = process.env.ISIPASS_GRAPHQL_TOKEN; // Reemplaza por tu token válido

  async crearFactura(lstDeudas: any, qrGenerado: any): Promise<any> {
    let tipoDoc = 0;
    if (lstDeudas[0].tipo_documento == "CI") tipoDoc = 1;
    if (lstDeudas[0].tipo_documento == "CEX") tipoDoc = 2;
    if (lstDeudas[0].tipo_documento == "PAS") tipoDoc = 3;
    if (lstDeudas[0].tipo_documento == "OD") tipoDoc = 4;
    if (lstDeudas[0].tipo_documento == "NIT") tipoDoc = 5;

    const detalleItems = lstDeudas.map((item) => {
        const precioUnitario = item.precio_unitario ?? 0;
        const montoDescuento = item.monto_descuento ?? 0;
        
        return `
          {
            codigoProductoSin: "${item.codigo_producto_sin}",
            codigoProducto: "${item.codigo_producto}",
            descripcion: "${item.descripcion}",
            cantidad: ${item.cantidad},
            unidadMedida: 58,
            precioUnitario: ${Number(precioUnitario).toFixed(2)},
            montoDescuento: ${Number(montoDescuento).toFixed(2)}
          }
        `;
      })
      .join(",");

    const mutation = `
    mutation {
      facturaCompraVentaCreate(
        notificacion: true,
        entidad: {
          codigoSucursal: 0,
          codigoPuntoVenta: 0
        },
        input: {
          cliente: {
            codigoCliente: "${lstDeudas[0].codigo_cliente}",
            razonSocial: "${lstDeudas[0].nombre_completo}",
            numeroDocumento: "${lstDeudas[0].numero_documento}",
            complemento: ${lstDeudas[0].complemento_documento ? `"${lstDeudas[0].complemento_documento}"` : null},
            email: "${qrGenerado.correo_notificacion}",
            codigoTipoDocumentoIdentidad: ${tipoDoc}
          },
          codigoExcepcion: 1,
          actividadEconomica: "930000",
          codigoMetodoPago: 1,
          descuentoAdicional: 0,
          codigoMoneda: 1,
          detalleExtraFooter: "",
          detalle: [${detalleItems}]
        }
      ) {
        cuf
        state
        numeroFactura
        cliente {
          codigoCliente
          numeroDocumento
          razonSocial
          complemento
          email
        }
        representacionGrafica {
          pdf
          xml
          sin
          rollo
        }
        sucursal {
          codigo
        }
        puntoVenta {
          codigo
        }
        eventoSignificativo
        log
      }
    }
  `;

    try {
      const response = await axios.post(
        this.graphqlUrl, // Asegúrate que sea: 'https://api.quickpay.com.bo/api'
        { query: mutation },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: this.token,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error(
        "Error al enviar la factura:",
        error.response?.data || error.message
      );
      throw error;
    }
  }
}
