import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PagosModule } from './pagos/pagos.module';
import { EmpresaModule } from './empresa/empresa.module';

@Module({
  imports: [
    PagosModule,EmpresaModule,
    ConfigModule.forRoot({
      isGlobal: true, // hace que esté disponible en todos los módulos
      envFilePath: '.env', // opcional si tu archivo se llama .env y está en la raíz
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
