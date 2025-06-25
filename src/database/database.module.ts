import { Module, Global } from '@nestjs/common';
import { DatabaseConfig } from './database.config';

@Global() // Hace que el módulo sea globalmente accesible
@Module({
  providers: [
    {
      provide: 'DB_CONNECTION',
      useFactory: () => DatabaseConfig.getDb(),
    },
  ],
  exports: ['DB_CONNECTION'], // Exporta para ser usado en otros módulos
})
export class DatabaseModule {}
