import { Injectable } from '@nestjs/common';
import { format, parseISO } from 'date-fns';
export class FuncionesFechas {
  static formatDateToDDMMYYYY(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0'); // Día con dos dígitos
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Mes con dos dígitos
    const year = date.getFullYear(); // Año completo
    return `${day}/${month}/${year}`;
  }
  /**
   * Formatea una fecha proporcionada a un formato específico.
   * @param date - Fecha a formatear (puede ser un objeto Date o un string ISO).
   * @param formatString - El formato deseado para la fecha (opcional, por defecto 'yyyy-MM-dd').
   * @returns La fecha formateada como string.
   */
  static formatDate(
    date: Date | string,
    formatString: string = 'yyyy-MM-dd',
  ): string {
    return format(new Date(date), formatString);
  }
  static obtenerHoraActual() {
    const now = new Date(); // Obtener la fecha y hora actual

    // Obtener las horas, minutos y segundos
    const horas = now.getHours();
    const minutos = now.getMinutes();
    const segundos = now.getSeconds();

    // Devolver la hora en el formato "HH:mm:ss"
    return `${horas < 10 ? '0' + horas : horas}:${minutos < 10 ? '0' + minutos : minutos}:${segundos < 10 ? '0' + segundos : segundos}`;
  }
  static obtenerFechaFormato() {
    const ahora = new Date();
    const dia = ahora.getDate().toString().padStart(2, '0');
    const mes = (ahora.getMonth() + 1).toString().padStart(2, '0'); // Meses van de 0 a 11
    const anio = ahora.getFullYear();
    const horas = ahora.getHours().toString().padStart(2, '0');
    const minutos = ahora.getMinutes().toString().padStart(2, '0');
    const segundos = ahora.getSeconds().toString().padStart(2, '0'); // Agregado

    return `${dia}/${mes}/${anio} ${horas}:${minutos}:${segundos}`;
  }
  static generarNumeroUnico() {
    // Obtener la fecha y hora actual
    const now = new Date();

    // Obtener los componentes de la fecha
    const year = now.getFullYear(); // Año (4 dígitos)
    const month = now.getMonth() + 1; // Mes (de 1 a 12, se le suma 1 porque los meses empiezan en 0)
    const day = now.getDate(); // Día del mes (de 1 a 31)

    // Obtener la hora, minutos y segundos
    const hours = now.getHours(); // Hora (de 0 a 23)
    const minutes = now.getMinutes(); // Minutos (de 0 a 59)
    const seconds = now.getSeconds(); // Segundos (de 0 a 59)

    // Crear un número único concatenando los valores
    const uniqueNumber = parseInt(
      `${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}${hours.toString().padStart(2, '0')}${minutes.toString().padStart(2, '0')}${seconds.toString().padStart(2, '0')}`,
      10,
    );

    return uniqueNumber;
  }
}
