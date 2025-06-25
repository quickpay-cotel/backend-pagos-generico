import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { PagosDeudasRepository } from "src/common/repository/pagos/pagos.deudas.repository";
import { IDatabase } from "pg-promise";
import { PagosDominiosRepository } from "src/common/repository/pagos/pagos.dominios.repository";

@Injectable()
export class DominiosService {
  constructor(
    private readonly pagosDominiosRepository: PagosDominiosRepository,
    @Inject("DB_CONNECTION") private db: IDatabase<any>
  ) {}

  async obtenerDoninioByDominio(dominio: string) {
    try {
      const dominios = await this.pagosDominiosRepository.findByDominio(dominio);
      return dominios.map((d) => ({
        dominioId:d.dominio_id,
        descripcion: d.descripcion,
        abreviatura: d.abreviatura,
      }));
    } catch (error) {
      console.log(error);
      throw new HttpException(
        "No se pudieron obtener las deudas.",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
