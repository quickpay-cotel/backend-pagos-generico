import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PagosModule } from "./pagos/pagos.module";
import { EmpresaModule } from "./empresa/empresa.module";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";
import { EmailModule } from "./common/correos/email.module";

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, "..", "store/facturas"),
      serveRoot: "/api/v1/facturas",
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, "..", "store/recibos"),
      serveRoot: "/api/v1/recibos",
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
