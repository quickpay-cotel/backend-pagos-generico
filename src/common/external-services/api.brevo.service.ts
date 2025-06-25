import { Injectable, Inject } from "@nestjs/common";
import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { IDatabase } from "pg-promise";

@Injectable()
export class ApiBrevoService {
    private token: any;
    private readonly axiosInstance: AxiosInstance;
    private bd: IDatabase<any>;
    constructor(@Inject("DB_CONNECTION") db: IDatabase<any>) {
        this.bd = db; // Inyectamos la conexión de pg-promise
        // Configuración de Axios
        this.axiosInstance = axios.create({
            baseURL: process.env.BREVO_API,
            timeout: 60000,
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

  
    // ENVIA CORREO
    async enviarCorreo(body: any): Promise<any> {
        try {
            const response = await this.axiosInstance.post("/smtp/email", body, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'api-key': process.env.BREVO_APIKEY
                },
            });
            return response.data; // devuelves solo el cuerpo útil de la respuesta
        } catch (error) {
            // revisa que `error.response` exista para evitar errores al lanzar
            if (error.response && error.response.data) {
                throw error.response.data;
            } else {
                throw error;
            }
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
}
