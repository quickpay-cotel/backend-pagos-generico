import {  Controller, Get, Query } from "@nestjs/common";
import { ConfiguracionService } from "./configuracion.service";

@Controller("configuracion")
export class ConfiguracionController {
  constructor(private readonly configuracionService: ConfiguracionService) {}
  
  @Get("obtener-configuracion-empresa")
  async obtenerConfiguracion(@Query("slug") slug: string) {
    return await this.configuracionService.obtenerConfiguracionEmpresaBySlug(slug);
  }
}
