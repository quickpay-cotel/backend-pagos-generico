import { Injectable, Inject } from '@nestjs/common';
import { IDatabase } from 'pg-promise'; // Usamos pg-promise
@Injectable()
export class PagosDatosConfirmadoQrRepository {
  private db: IDatabase<any>;

  constructor(@Inject('DB_CONNECTION') db: IDatabase<any>) {
    this.db = db; // Inyectamos la conexión de pg-promise
  }

  async create(data: Record<string, any>, t?: IDatabase<any>): Promise<any> {
    // Extraer los nombres de las columnas y los valores
    const columnas = Object.keys(data);
    const params = Object.values(data);
    // Construir los marcadores de posición ($1, $2, ...)
    const marcadores = columnas.map((_, index) => `$${index + 1}`).join(', ');
    // Crear la consulta SQL dinámica
    const query = `
          INSERT INTO pagos.datosconfirmado_qr (${columnas.join(', ')})
          VALUES (${marcadores}) RETURNING *
        `;
    const result = t
      ? await t.one(query, params)
      : await this.db.one(query, params);
    return result;
  }

  async findByQrGeneradoId(pQrGeneradoId): Promise<any> {
    const query = `select * from pagos.reserva_deuda where estado_reserva_id  = 1004 and estado_id = 1000 and qr_generado_id = $1 and estado_id = 1000`;
    const params = [pQrGeneradoId];
    const result = await this.db.manyOrNone(query, params);
    return result;
  }
}
