import { Injectable, Inject } from "@nestjs/common";
import { IDatabase } from "pg-promise"; // Usamos pg-promise
@Injectable()
export class UsuarioEmpresaConfiguracionRepository {
  private db: IDatabase<any>;

  constructor(@Inject("DB_CONNECTION") db: IDatabase<any>) {
    this.db = db; // Inyectamos la conexión de pg-promise
  }

  async DatosConfiguracionEmpresaBySlug(slug: string): Promise<any> {
    const query = `
select pj.nombre_empresa, pj.nit as nit_empresa,ec.logo_url as logo_filename ,ec.logo_base64, 
ec.color_primario ,ec.color_secundario ,ec.slug_empresa
    from usuario.empresa_configuracion ec 
    inner  join usuario.persona_juridica pj on pj.persona_juridica_id = ec.persona_juridica_id and pj.estado_id = 1000
    where  ec.estado_id = 1000 and ec.slug_empresa = $1 `;
    const params = [slug];
    const result = await this.db.oneOrNone(query, params);
    return result;
  }

  async DatosConfiguracionEmpresaByDeudaId(deudaId: number): Promise<any> {
    const query = `select pj.nombre_empresa, pj.nit as nit_empresa,ec.logo_url as logo_filename ,ec.logo_base64, ec.color_primario ,ec.slug_empresa
from pagos.deudas d 
inner join usuario.persona_juridica pj on pj.persona_juridica_id = d.persona_juridica_id
inner join usuario.empresa_configuracion ec on ec.persona_juridica_id = pj.persona_juridica_id and ec.estado_id = 1000
where  d.estado_id = 1000 and d.deuda_id = $1 `;
    const params = [deudaId];
    const result = await this.db.oneOrNone(query, params);
    return result;
  }

    async DatosConfiguracionEmpresaByAlias(alias:string): Promise<any> {
    const query = `select pj.nombre_empresa, pj.nit as nit_empresa,ec.logo_url as logo_filename ,ec.logo_base64, ec.color_primario ,ec.slug_empresa
from pagos.deudas d 
inner join pagos.cargas_excel ce on ce.carga_id = d.carga_id and ce.estado_id = 1000
inner join usuario.usuarios u on u.usuario_id  = ce.usuario_id and u.estado_id = 1000
inner join usuario.persona_juridica pj on pj.persona_juridica_id = u.persona_juridica_id
inner join usuario.empresa_configuracion ec on ec.persona_juridica_id = pj.persona_juridica_id and ec.estado_id = 1000
inner join pagos.reserva_deuda r on r.deuda_id = d.deuda_id
inner join pagos.qr_generado q on q.qr_generado_id =r.qr_generado_id
where  d.estado_id = 1000 and q.alias = $1  LIMIT 1 `;
    const params = [alias];
    const result = await this.db.oneOrNone(query, params);
    return result;
  }

}
