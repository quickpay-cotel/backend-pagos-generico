import { Injectable, Inject } from '@nestjs/common';
import { IDatabase } from 'pg-promise'; // Usamos pg-promise
@Injectable()
export class PagosTransaccionDeudaRepository {
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
          INSERT INTO pagos.transaccion_deuda (${columnas.join(', ')})
          VALUES (${marcadores}) RETURNING *
        `;
    const result = t
      ? await t.one(query, params)
      : await this.db.one(query, params);
    return result;
  }
  async update(
    id: number,
    data: Record<string, any>,
    t?: IDatabase<any>,
  ): Promise<any> {
    const columnas = Object.keys(data);
    const valores = Object.values(data);

    if (columnas.length === 0) {
      throw new Error('No hay campos para actualizar');
    }

    // Construir SET dinámicamente: "col1 = $1, col2 = $2, ..."
    const setClause = columnas
      .map((col, index) => `${col} = $${index + 1}`)
      .join(', ');

    // Último parámetro es el ID
    const query = `
    UPDATE pagos.transaccion_deuda
    SET ${setClause}
    WHERE transaccion_deuda_id = $${columnas.length + 1}
    RETURNING *
  `;

    const params = [...valores, id];

    const result = t
      ? await t.one(query, params)
      : await this.db.one(query, params);

    return result;
  }

  async findByFilters(
    filters: Record<string, any>,
    t?: IDatabase<any>,
  ): Promise<any[]> {
    const keys = Object.keys(filters);
    const values = Object.values(filters);

    // Si no hay filtros, devolver todo
    let whereClause = '';
    if (keys.length > 0) {
      const conditions = keys.map((key, index) => `${key} = $${index + 1}`);
      whereClause = `WHERE ${conditions.join(' AND ')}`;
    }

    const query = `
    SELECT * FROM pagos.transaccion_deuda
    ${whereClause}
  `;

    const result = t
      ? await t.any(query, values)
      : await this.db.any(query, values);

    return result;
  }

}
