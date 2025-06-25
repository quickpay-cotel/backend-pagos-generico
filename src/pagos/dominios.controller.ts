import { Body, Controller, Post } from '@nestjs/common';
import { DominiosService } from './dominios.service';

@Controller('dominio')
export class DominiosController {
  constructor(private readonly dominiosService: DominiosService) {}
  @Post('por-dominio')
  async porDominio(@Body() body: { dominio: string }) {
    return await this.dominiosService.obtenerDoninioByDominio(body.dominio);
  }
}
