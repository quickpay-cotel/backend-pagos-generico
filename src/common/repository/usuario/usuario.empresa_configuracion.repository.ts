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
select pj.nombre_empresa, pj.nit as nit_empresa,ec.logo_url as logo_filename ,ec.logo_base64, ec.color_primario ,ec.slug_empresa
    from usuario.empresa_configuracion ec 
    inner  join usuario.persona_juridica pj on pj.persona_juridica_id = ec.persona_juridica_id and pj.estado_id = 1000
    where  ec.estado_id = 1000 and ec.slug_empresa = $1 `;
    const params = [slug];
    const result = await this.db.oneOrNone(query, params);
    return result;
  }
}
