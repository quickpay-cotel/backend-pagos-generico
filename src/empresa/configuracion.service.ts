import { UsuarioEmpresaConfiguracionRepository } from "./../common/repository/usuario/usuario.empresa_configuracion.repository";
import { Inject, Injectable } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { IDatabase } from "pg-promise";

@Injectable()
export class ConfiguracionService {
  constructor(
    private readonly usuarioEmpresaConfiguracionRepository: UsuarioEmpresaConfiguracionRepository
  ) {}

  async obtenerConfiguracionEmpresaBySlug(slug: string) {
    try {
      let datosConfiguracion: any =await this.usuarioEmpresaConfiguracionRepository.DatosConfiguracionEmpresaBySlug(slug);
      if (datosConfiguracion) {
        return {
          nombreEmpresa: datosConfiguracion.nombre_empresa,
          nitEmpresa: datosConfiguracion.nit_empresa,
          logoFilename: datosConfiguracion.logo_filename,
          logoBase64: datosConfiguracion.logo_base64,
          colorPrimario: datosConfiguracion.color_primario,
          colorSecundario: datosConfiguracion.color_secundario,
          slugEmpresa: datosConfiguracion.slug_empresa,
        };
      }
    } catch (error) {
      console.log(error);
      throw new Error(`Error al guardar el QR: ${error.message}`);
    }
  }
}
