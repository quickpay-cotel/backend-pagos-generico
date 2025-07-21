import { Module } from "@nestjs/common";
import { ConfigModule,ConfigService } from "@nestjs/config";
import { PagosModule } from "./pagos/pagos.module";
import { EmpresaModule } from "./empresa/empresa.module";
import { ServeStaticModule, ServeStaticModuleOptions } from "@nestjs/serve-static";
import { join } from "path";
import { EmailModule } from "./common/correos/email.module";

@Module({
  imports: [

    
    ServeStaticModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): ServeStaticModuleOptions[] => {
        return [
          {
            rootPath: configService.get<string>('STATIC_FILES_PATH'),
            serveRoot: '/api/v1/recursos',
          },
        ];
      },
    }),

    PagosModule,
    EmpresaModule,
    ConfigModule.forRoot({
      isGlobal: true, // hace que esté disponible en todos los módulos
      envFilePath: ".env", // opcional si tu archivo se llama .env y está en la raíz
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
