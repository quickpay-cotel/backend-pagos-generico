import { Injectable, Inject } from "@nestjs/common";
import { IDatabase } from "pg-promise"; // Usamos pg-promise
@Injectable()
export class PagosComprobanteFacturaRepository {
  private db: IDatabase<any>;

  constructor(@Inject("DB_CONNECTION") db: IDatabase<any>) {
    this.db = db; // Inyectamos la conexión de pg-promise
  }
  async create(data: Record<string, any>, t?: IDatabase<any>): Promise<any> {
    // Extraer los nombres de las columnas y los valores
    const columnas = Object.keys(data);
    const params = Object.values(data);
    // Construir los marcadores de posición ($1, $2, ...)
    const marcadores = columnas.map((_, index) => `$${index + 1}`).join(", ");
    // Crear la consulta SQL dinámica
    const query = `
          INSERT INTO pagos.comprobante_factura (${columnas.join(", ")})
          VALUES (${marcadores}) RETURNING *
        `;
    const result = t
      ? await t.one(query, params)
      : await this.db.one(query, params);
    return result;
  }
  async findNroFactura(): Promise<any> {
    const query = `SELECT pagos.fn_obtener_numero_factura() as numero_factura`;
    const result = await this.db.one(query);

    // Accede directamente a la propiedad numero_factura
    return result.numero_factura;
  }
  async findByAlias(pAlias): Promise<any> {
    const query = `select cf.* from pagos.comprobante_factura cf 
    inner join pagos.transacciones t on t.transaccion_id  = cf.transaccion_id and t.estado_id = 1000
    inner join pagos.datosconfirmado_qr dq on dq.datosconfirmado_qr_id = t.datosconfirmado_qr_id and dq.estado_id = 1000
    inner join pagos.qr_generado qg on qg.qr_generado_id = dq.qr_generado_id and qg.estado_id = 1000
    where cf.estado_id = 1000 and qg.alias = $1`;
    const params = [pAlias];
    const result = await this.db.manyOrNone(query, params);
    return result;
  }
}
