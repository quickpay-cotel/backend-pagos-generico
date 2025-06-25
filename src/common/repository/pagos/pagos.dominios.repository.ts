import { Injectable, Inject } from '@nestjs/common';
import { IDatabase } from 'pg-promise'; // Usamos pg-promise
@Injectable()
export class PagosDominiosRepository {
  private db: IDatabase<any>;

  constructor(@Inject('DB_CONNECTION') db: IDatabase<any>) {
    this.db = db; // Inyectamos la conexión de pg-promise
  }
  async findByDominio(pDominio:string): Promise<any> {
    const query = ` select * from pagos.dominios d where d.dominio = $1 and estado_id = 1000`;
    const params = [pDominio];
    const result = await this.db.many(query, params);
    return result;
  }

  
}
