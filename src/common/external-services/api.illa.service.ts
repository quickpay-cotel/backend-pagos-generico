import { Inject, Injectable } from "@nestjs/common";
import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

import { IDatabase } from "pg-promise";
@Injectable()
export class ApiIllaService {
  private token: any;
  private readonly axiosInstance: AxiosInstance;
  private bd: IDatabase<any>;
  constructor(@Inject("DB_CONNECTION") db: IDatabase<any>
  ) {
    this.bd = db; // Inyectamos la conexión de pg-promise
    // Configuración de Axios
    this.axiosInstance = axios.create({
      baseURL: process.env.ILLA_API,
      timeout: 120000,
    });

    // Configuración del interceptor de solicitud
    this.axiosInstance.interceptors.request.use(config => {
      const fullUrl = `${config.baseURL}${config.url}`;
      const logData = {
        method: config.method,
        url: fullUrl,
        request_headers: config.headers,
        request_data: config.data,
      };
      // Guardamos los datos de la solicitud, lo haremos después con la respuesta.
      config['logData'] = logData;
      return config;
    }, error => {
      console.error('Error en la solicitud:', error);
      return Promise.reject(error);
    });

    // Configuración del interceptor de respuesta
    this.axiosInstance.interceptors.response.use(response => {
      const logData = response.config['logData'];
      const logEntry = {
        ...logData,
        response_status: response.status,
        response_data: response.data,
      };
      // Guardamos la solicitud y respuesta en la base de datos
      this.saveLogToDatabase(logEntry);

      console.log(`Respuesta de ${response.config.url}:`, response.status);
      return response;
    }, error => {

      const logData = error.config ? error.config['logData'] : {};
      const logEntry = {
        ...logData,
        response_status: error.response ? error.response.status : 'NO_RESPONSE',
        response_data: error.response ? error.response.data : 'NO_RESPONSE_DATA',
      };
      // Guardamos la solicitud y respuesta en la base de datos
      this.saveLogToDatabase(logEntry);

      console.error('Error en la respuesta:', error);
      return Promise.reject(error);
    });
  }

  async generarToken(): Promise<any> {
    try {
      const response = await this.axiosInstance.post("api/v1/authentications/signin",
        {
          email: process.env.ILLA_EMAIL,
          password: process.env.ILLA_PASSWORD,
        }
      );
      if (response.data) {
        this.token = response.data;
      } else {
        this.token = "";
      }
    } catch (error) {
      throw error;
    }
  }

  async generarFacturaTelcom(body: any) {


    try {
      await this.generarToken();
      const response = await this.axiosInstance.post("/api/v1/telecoms", body, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });
      return response.data; // Devuelve el payload en caso de éxito
    } catch (error) {
      // Capturar el payload del error si existe
      if (error.response) {
        return error.response.data; // Devuelve el body de la respuesta con error (400, 404, etc.)
      } else {
        throw new Error("Error desconocido al generar Factura Telecomunicaciones");
      }
    }

  }
  async generarFacturaAlquiler(body: any) {
    try {
      await this.generarToken();
      const response = await this.axiosInstance.post("/api/v1/generalbills", body, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });
      return response.data; // Devuelve el payload en caso de éxito
    } catch (error) {
      // Capturar el payload del error si existe
      if (error.response) {
        return error.response.data; // Devuelve el body de la respuesta con error (400, 404, etc.)
      } else {
        throw new Error("Error desconocido al generar Factura Alquiler");
      }
    }
  }
  async obtenerProductos() {
    try {
      await this.generarToken();
      const response = await this.axiosInstance.get(`/api/v1/customers/${process.env.ILLA_NIT}/products/${process.env.ILLA_CODIGO_EMPRESA}`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });
      if (response.data.status) {
        return response.data.productos;
      } else {
        throw "Error al obtener productos";
      }
    } catch (error) {
      throw "Error al obtener productos";
    }
  }
  async crearProductos(objProductoEmpresa: any) {
    try {
      let nuevoProducto = [{
        "empresaProductoId": 0, //Identificador generado por Illasoft cuando un producto es creado. Este valor es el requerido para la emisión de la factura
        "empresaId": 155, //Identificador asignado por Illasoft a la empresa. Valor válido 33
        "estadoProductoId": 34, //Identificador del estado del producto en el sistema Illasoft. Valores posibles: 32=NUEVO, 33=HISTORICO y 34=PARA VENTA.
        "estadoProductoDescripcion": "PARA VENTA", //Descripción del estado del producto en el sistema Illasoft. Valores posibles: 32=NUEVO, 33=HISTORICO y 34=PARA VENTA
        /*Código de la actividad económica a la cual pertenece el producto. Se aclara que existe un paso previo de
        sincronización con el SIN, el cual retorna los códigos de Actividad Económica de su empresa. Este listado
        fue remitido en archivo Excel para el trabajo de homologación de productos.*/
        "actividadEconomica": "610000", // NOS VA DAR COTEL...
        "codProductoSin": "99100", //Código producto asignado por el SIN. // CONSULTAR CON RJOVE
        "codProductoEmpresa": objProductoEmpresa.codigo_item,  //Código producto asignado por su empresa // ESTA EN LA API DE CONSULTA DE DEUDAS DE COTEL
        "descripcion": objProductoEmpresa.descripcion_item,//Descripción del producto registrado // ESTA EN API
        "precioUnitario": objProductoEmpresa.monto_unitario , //Precio referencial que puede poseer un producto. Se aclara que en la emisión e la factura este valor es modificable en el request // ESTA EN API
        "precioPorMayor": 0,
        "descuentoPrecioUnitario": 0,
        "descuentoPrecioPorMayor": 0,
        "cantidadInicial": 0, //Valor que indica la cantidad que se tiene del producto (aplicable cuando se lleva control de inventarios). Por defecto presentará un valor 0 o 1 // COTEL API
        "codUnidadMedida": 2, //Código de la unidad de medida definida por el SIN. En el proceso de homologación se define la unidad de medida. // PREGUNTAR CON RJOVE
        "unidadMedida": "SERVICIO" //Descripción de la unidad de medida vinculada al código de unidad de medida. // PREGUNTAR CON RJOVE
      }]
      await this.generarToken();
      
      const response = await this.axiosInstance.post(`/api/v1/customers/${process.env.ILLA_NIT}/products/${process.env.ILLA_CODIGO_EMPRESA}`,nuevoProducto, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });
      if (!response.data.status) {
        throw "Error al registrar producto "+objProductoEmpresa.codigo_item;
      } 
    } catch (error) {
      throw "Error al registrar productos "+objProductoEmpresa.codigo_item+" : "+error;
    }
  }
  async activarProductos() {
    try {
      await this.generarToken();
      await this.axiosInstance.post(`/api/v1/customers/${process.env.ILLA_NIT}/products/${process.env.ILLA_CODIGO_EMPRESA}/activated`,{}, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });
    } catch (error) {
      console.error(error);
    }
  }

  async obtenerPuntosVentas() {
    try {
      await this.generarToken();
      const response = await this.axiosInstance.get(`/api/v1/customers/${process.env.ILLA_NIT}/pointsofsale/${process.env.ILLA_CODIGO_EMPRESA}`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });
      if (response.data.status) {
        return response.data.pointsOfSale;
      } else {
        throw "Error al obtener puntos de ventas";
      }
    } catch (error) {
      throw "Error al obtener puntos de ventas";
    }
  }
  async obtenerSucursales() {
    try {
      await this.generarToken();
      const response = await this.axiosInstance.get(`/api/v1/customers/${process.env.ILLA_NIT}/offices/${process.env.ILLA_CODIGO_EMPRESA}`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });
      if (response.data.status) {
        return response.data.offices;
      } else {
        throw "Error al obtener sucursales";
      }
    } catch (error) {
      throw "Error al obtener sucursales";
    }
  }

  private async saveLogToDatabase(logEntry: any) {
    try {
      await this.bd.query(
        'INSERT INTO cotel.api_logs (method, url, request_headers, request_data, response_status, response_data) ' +
        'VALUES (${method}, ${url}, ${request_headers}, ${request_data}, ${response_status}, ${response_data})',
        logEntry
      );
      console.log('Log guardado exitosamente en la base de datos');
    } catch (error) {
      console.error('Error al guardar el log en la base de datos:', error);
    }
  }


  async notaConciliacion(body: any) {
    try {
      await this.generarToken();
      const response = await this.axiosInstance.post("/api/v1/adjustments/conciliations", body, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });
      return response.data; // Devuelve el payload en caso de éxito
    } catch (error) {
      // Capturar el payload del error si existe
      if (error.response) {
        return error.response.data; // Devuelve el body de la respuesta con error (400, 404, etc.)
      } else {
        throw new Error("Error desconocido al generar Nota Conciliación");
      }
    }
  }
  async notaCreditoDebito(body: any) {
    try {
      await this.generarToken();
      const response = await this.axiosInstance.post("/api/v1/adjustments", body, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });
      return response.data; // Devuelve el payload en caso de éxito
    } catch (error) {
      // Capturar el payload del error si existe
      if (error.response) {
        return error.response.data; // Devuelve el body de la respuesta con error (400, 404, etc.)
      } else {
        throw new Error("Error desconocido al generar Nota Credito Debito");
      }
    }

  }
  async notaAnulacion(body: any) {
    try {
      await this.generarToken();
      const response = await this.axiosInstance.delete("/api/v1/adjustments", {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        data: body, // Pasamos el body correctamente
      });

      return response.data; // Devuelve el payload en caso de éxito
    } catch (error) {
      // Capturar el payload del error si existe
      if (error.response) {
        return error.response.data; // Devuelve el body de la respuesta con error (400, 404, etc.)
      } else {
        throw new Error("Error desconocido al anular NOTA");
      }
    }
  }
  async facturaAlquilerAnulacion(body: any) {
    try {
      await this.generarToken();
      const response = await this.axiosInstance.delete("/api/v1/generalbills", {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        data: body, // Pasamos el body correctamente
      });

      return response.data; // Devuelve el payload en caso de éxito
    } catch (error) {
      // Capturar el payload del error si existe
      if (error.response) {
        return error.response.data; // Devuelve el body de la respuesta con error (400, 404, etc.)
      } else {
        throw new Error("Error desconocido al anular FACTURA ALQUILER");
      }
    }
  }
  async facturaTelcomAnulacion(body: any) {
    try {
      await this.generarToken();
      const response = await this.axiosInstance.delete("/api/v1/telecoms", {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        data: body, // Pasamos el body correctamente
      });

      return response.data; // Devuelve el payload en caso de éxito
    } catch (error) {
      // Capturar el payload del error si existe
      if (error.response) {
        return error.response.data; // Devuelve el body de la respuesta con error (400, 404, etc.)
      } else {
        throw new Error("Error desconocido al anular FACTURA TELCOM");
      }
    }
  }

}