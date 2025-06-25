import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
export class FuncionesGenerales {
  public async checkFileExistence(filePath: string): Promise<boolean> {
    const access = promisify(fs.access);
    try {
      await access(filePath, fs.constants.F_OK);
      return true;
    } catch (error) {
      return false;
    }
  }
  public convertToBase64(filePath: string) {
    // Lee el archivo de la ruta especificada
    const fileBuffer = fs.readFileSync(filePath);
    // Convierte el archivo a Base64
    const base64File = fileBuffer.toString('base64');
    // Determina el tipo MIME basado en la extensión del archivo
    const nombreArchivoConExt = path.basename(filePath);
    const mimeType = this.getMimeType(nombreArchivoConExt);
    // Retorna la imagen como una cadena Base64 en el formato adecuado
    return `data:${mimeType};base64,${base64File}`;
  }

  public puedePagar() {
    const horaLimite = Number(process.env.HORA_CORTE_PAGO) || 17;

    const ahora = new Date().toLocaleString('en-US', {
      timeZone: 'America/La_Paz',
    });
    const fechaBolivia = new Date(ahora);

    const dia = fechaBolivia.getDate();
    const mes = fechaBolivia.getMonth();
    const anio = fechaBolivia.getFullYear();

    const hora = fechaBolivia.getHours();
    const minutos = fechaBolivia.getMinutes();
    const segundos = fechaBolivia.getSeconds();

    const horaDecimal = hora + minutos / 60 + segundos / 3600;

    const ultimoDiaDelMes = new Date(anio, mes + 1, 0).getDate();
    const esUltimoDia = dia === ultimoDiaDelMes;

    // Solo se bloquea si es último día del mes Y la hora es 17:00 o más
    const restriccionActiva = esUltimoDia && horaDecimal >= horaLimite;

    const mensaje = restriccionActiva
      ? `No se puede generar QR: Sistema en mantenimiento.`
      : `El pago está permitido.`;

    return {
      permitido: !restriccionActiva,
      mensaje,
    };
  }

  // Método para obtener el tipo MIME del archivo basado en su extensión
  private getMimeType(fileName: string): string {
    const extname = path.extname(fileName).toLowerCase();
    switch (extname) {
      case '.png':
        return 'image/png';
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.gif':
        return 'image/gif';
      case '.bmp':
        return 'image/bmp';
      case '.webp':
        return 'image/webp';
      case '.svg':
        return 'image/svg+xml';
      default:
        return 'application/octet-stream';
    }
  }
  public esJSON(str) {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  }
}
