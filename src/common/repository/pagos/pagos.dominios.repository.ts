import { Injectable, Inject } from '@nestjs/common';
import { IDatabase } from 'pg-promise'; // Usamos pg-promise
@Injectable()
export class PagosDominiosRepository {
  private db: IDatabase<any>;

  constructor(@Inject('DB_CONNECTION') db: IDatabase<any>) {
    this.db = db; // Inyectamos la conexión de pg-promise
  }
   async findByDominio(pDominio: string) {
    const query = `select d.dominio_id,d.dominio,d.descripcion,d.abreviatura
from pagos.dominios d where d.estado_id = 1000 and d.dominio = $1;
    `;
    const params = [pDominio];
    const result = await this.db.manyOrNone(query, params);
    return result;
  }
  async findById(pDominioId: number) {
    const query = `select d.dominio_id,d.dominio,d.descripcion,d.abreviatura
from pagos.dominios d where d.estado_id = 1000 and d.dominio_id = $1;
    `;
    const params = [pDominioId];
    const result = await this.db.oneOrNone(query, params);
    return result;
  }


}
