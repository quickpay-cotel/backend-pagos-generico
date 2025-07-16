import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { Pool } from "pg"; // Asegúrate de que el tipo Pool esté importado
import { FuncionesGenerales } from "../utils/funciones.generales";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(@Inject("DB_CONNECTION") private readonly pool: Pool) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url, params, query, body, ip } = request;
    const funcionesGenerales = new FuncionesGenerales();
    return next.handle().pipe(
      tap(
        async (data) => {
          let responseBody = { respuesta: "[Error serializing response]" };
          try {
            responseBody = JSON.parse(JSON.stringify(data));
          } catch (error) {}
          const statusCode = response.statusCode;
          await this.pool.query(
            ` INSERT INTO pagos.http_logs (method, endpoint, status_code, client_ip, request_params, request_body, response_body) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              method,
              url,
              statusCode,
              ip,
              JSON.stringify({ ...params, ...query }),
              JSON.stringify(body),
              responseBody,
            ],
          );
        },
        async (error) => {
          let responseBody = {};
          if (!funcionesGenerales.esJSON(error)) {
            responseBody = { respuesta: error };
          } else {
            responseBody = JSON.parse(JSON.stringify(error));
          }
          const statusCode = error?.status || 500;
          await this.pool.query(
            ` INSERT INTO pagos.http_logs (method, endpoint, status_code, client_ip, request_params, request_body, response_body) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              method,
              url,
              statusCode,
              ip,
              JSON.stringify({ ...params, ...query }),
              JSON.stringify(body),
              responseBody,
            ],
          );
        },
      ),
    );
  }
}
