import { Injectable, Inject } from '@nestjs/common';
import { IDatabase } from 'pg-promise'; // Usamos pg-promise
@Injectable()
export class PagosDeudasRepository {
  private db: IDatabase<any>;

  constructor(@Inject('DB_CONNECTION') db: IDatabase<any>) {
    this.db = db; // Inyectamos la conexión de pg-promise
  }
  async findByAlias(pAlias): Promise<any> {
    const query = `     select d.deuda_id,d.carga_id,d.codigo_cliente,d.nombre_completo,d.tipo_documento,d.numero_documento,
d.complemento_documento ,d.tipo_pago_id,tipoPago.descripcion tipo_pago ,d.codigo_producto,d.codigo_producto_sin ,d.descripcion ,d.periodo,d.cantidad ,d.precio_unitario ,d.monto_descuento ,
d.email ,d.telefono ,d.fecha_registro 
from pagos.reserva_deuda rd 
inner join pagos.qr_generado qg on qg.qr_generado_id = rd.qr_generado_id and qg.estado_id = 1000
inner join pagos.deudas d on d.deuda_id  = rd.deuda_id and d.estado_id = 1000
inner join pagos.dominios tipoPago on tipoPago.dominio_id = d.tipo_pago_id 
where  rd.estado_id = 1000 and rd.estado_reserva_id = 1004
and qg.alias = $1 and rd.estado_id = 1000 and rd.estado_reserva_id = 1004`;
    const params = [pAlias];
    const result = await this.db.many(query, params);
    return result;
  }

  async datosClienteByCriterioBusqueda(parametroBusqueda: string, tipoPago: number): Promise<any> {
    const query = ` 
    select d.* from pagos.deudas d where (d.codigo_cliente ILIKE  $1 or d.numero_documento ILIKE  $1 or d.nombre_completo ILIKE  $1) 
    and d.estado_id = 1000 and d.tipo_pago_id = $2 order by d.periodo desc;
    `;
    const params = [`%${parametroBusqueda}%`, tipoPago];
    const result = await this.db.many(query, params);
    return result;
  }

  // me todo que pemrmite buscar cobros pendinetes en funcion a COD CLIENTE Y NRO DOCUMENTO
  async cobrosPendientesByCriterioBusqueda(parametroBusqueda: string, tipoPago: number): Promise<any> {
    const query = ` 

  select d.deuda_id,d.carga_id,d.codigo_cliente,d.nombre_completo,d.tipo_documento,d.numero_documento,d.complemento_documento,d.tipo_pago_id,	
  d.periodo,d.codigo_producto,d.codigo_producto_sin,d.descripcion,d.cantidad,d.precio_unitario,d.monto_descuento, (d.cantidad*d.precio_unitario-d.monto_descuento) as monto_total,
  d.email,d.telefono,d.fecha_registro
       from pagos.deudas d 
   where (d.codigo_cliente ILIKE  $1 or d.numero_documento ILIKE  $1 or d.nombre_completo ILIKE  $1) 
    and d.estado_id = 1000 and d.tipo_pago_id = $2 
    and not exists(
      select * from pagos.reserva_deuda rd
	 inner join pagos.datosconfirmado_qr dc on dc.qr_generado_id = rd.qr_generado_id and rd.estado_id = 1000
	 inner join pagos.transacciones t on t.datosconfirmado_qr_id  = dc.datosconfirmado_qr_id and t.estado_id = 1000
	 where  rd.deuda_id = d.deuda_id and rd.estado_id = 1000
    ) 
  and not exists(
      select * from pagos.transaccion_deuda td
	 inner join pagos.transacciones t on t.transaccion_id  = td.transaccion_id and t.estado_id = 1000
	 where  td.deuda_id = d.deuda_id and td.estado_id = 1000
    ) 
    order by d.periodo desc;
    `;
    const params = [`%${parametroBusqueda}%`, tipoPago];
    const result = await this.db.many(query, params);
    return result;
  }

  async findById(Id): Promise<any> {
    const query = ` select d.* from pagos.deudas d where d.deuda_id = $1 and d.estado_id = 1000;`;
    const params = [Id];
    const result = await this.db.oneOrNone(query, params);
    return result;
  }

  async findByAliasPagado(pAlias): Promise<any> {
    const query = `select d.* from cotel.reserva_deuda rd 
inner join cotel.qr_generado qg on  qg.qr_generado_id = rd.qr_generado_id and qg.estado_id = 1000
inner join cotel.deudas d on d.deuda_id  = rd.deuda_id and d.estado_id = 1000
where qg.alias = $1 and rd.estado_id = 1000 and rd.estado_reserva_id = 1005`;
    const params = [pAlias];
    const result = await this.db.many(query, params);
    return result;
  }

  async cobrosRealizadosByDeudasIds(deudasIds: number[]): Promise<any> {
    const query = `
    SELECT 
      t.transaccion_id,
      t.datosconfirmado_qr_id,
      t.metodo_pago_id,
      t.medio_pago_id,
      t.monto_pagado,
      t.moneda,
      t.estado_transaccion_id,
      t.correo_enviado,
      t.fecha_transaccion,
      t.fecha_registro
    FROM pagos.transacciones t 
    INNER JOIN pagos.datosconfirmado_qr d 
      ON d.datosconfirmado_qr_id = t.datosconfirmado_qr_id 
      AND d.estado_id = 1000
    INNER JOIN pagos.reserva_deuda r  
      ON r.qr_generado_id = d.qr_generado_id 
      AND r.estado_id = 1000
    WHERE r.deuda_id IN ($1:csv) 
      AND t.estado_id = 1000
  `;
    const result = await this.db.manyOrNone(query, [deudasIds]);
    return result;
  }
  async cobrosPendientesByDeudasIds(deudasIds: number[]): Promise<any> {
    const query = `
    select d.deuda_id,d.carga_id,d.codigo_cliente,d.nombre_completo,d.tipo_documento,d.numero_documento,d.complemento_documento,d.tipo_pago_id,	
  d.periodo,d.codigo_producto,d.codigo_producto_sin,d.descripcion,d.cantidad,d.precio_unitario,d.monto_descuento, (d.cantidad*d.precio_unitario-d.monto_descuento) as monto_total,
  d.email,d.telefono,d.fecha_registro
       from pagos.deudas d 
   where d.deuda_id in ($1) and d.estado_id = 1000  and not exists(
      select * from pagos.reserva_deuda rd
	 inner join pagos.datosconfirmado_qr dc on dc.qr_generado_id = rd.qr_generado_id and rd.estado_id = 1000
	 inner join pagos.transacciones t on t.datosconfirmado_qr_id  = dc.datosconfirmado_qr_id and t.estado_id = 1000
	 where  rd.deuda_id = d.deuda_id and rd.estado_id = 1000
    ) order by d.periodo desc;
  `;
    const result = await this.db.manyOrNone(query, [deudasIds]);
    return result;
  }
}
