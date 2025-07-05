import { Controller, Get, Res, Query, Param } from '@nestjs/common';
import { Response } from 'express';

import * as path from 'path'; // Asegúrate de tener esta importación


@Controller('reportes')
export class ReportesController {

  constructor(
  ) { }

 /* @Get('descargar-factura/:comprobante')
  async descargarFactura(@Param('comprobante') comprobante: string, @Res() res: Response): Promise<void> {
    // Construir la ruta completa del archivo PDF usando el alias
    const pdfPath = path.join(process.cwd(), 'store/facturas', `${comprobante}.pdf`);

    // Configurar la respuesta HTTP para descargar el PDF
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${comprobante}.pdf"`,
    });

    // Enviar el archivo PDF al cliente
    res.sendFile(pdfPath, (err) => {
      if (err) {
        console.error('Error al enviar el archivo:', err.message);
        res.status(500).send('Error al descargar el archivo');
      }
    });
  }*/
  @Get('descargar-recibo/:comprobante')
  async descargarRecibo(@Param('comprobante') comprobante: string, @Res() res: Response): Promise<void> {
    // Construir la ruta completa del archivo PDF usando el alias
    const pdfPath = path.join(process.cwd(), 'store/recibos', `${comprobante}.pdf`);

    // Configurar la respuesta HTTP para descargar el PDF
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${comprobante}.pdf"`,
    });

    // Enviar el archivo PDF al cliente
    res.sendFile(pdfPath, (err) => {
      if (err) {
        console.error('Error al enviar el archivo:', err.message);
        res.status(500).send('Error al descargar el archivo');
      }
    });
  }
}