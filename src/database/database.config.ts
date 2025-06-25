import * as pgPromise from 'pg-promise';
import { IDatabase, IMain } from 'pg-promise';

const pgp: IMain = pgPromise({
  query(e: any) {
    // Mostrar la consulta SQL y los valores en la consola
    console.log('Executing query:', e.query);
    if (e.params) {
      console.log('With Values:', e.params);
    }
  },
});

export class DatabaseConfig {
  private static db: IDatabase<any>;

  static getDb(): IDatabase<any> {
    if (!this.db) {
      this.db = pgp({
        user: process.env.DB_USER, // Reemplaza con tu usuario de PostgreSQL
        host: process.env.DB_HOST, // Dirección del servidor de PostgreSQL
        database: process.env.DB_NAME, // Nombre de tu base de datos
        password: process.env.DB_PASSWORD, // Contraseña de tu usuario
        port: Number(process.env.DB_PORT),
      });
    }

    return this.db;
  }

  static async closeDb() {
    if (this.db) {
      await this.db.$pool.end();
    }
  }
}
