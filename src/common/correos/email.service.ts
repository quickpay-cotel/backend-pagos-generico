import { Injectable } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { FuncionesFechas } from "../utils/funciones.fechas";
import { MailtrapClient } from "mailtrap";

@Injectable()
export class EmailService {
  async sendMailNotifyPaymentAndAttachmentsMailtrap(
    to: string,
    subject: string,
    paymentData: any,
    reciboPath: string,
    facturaPathPdf: string,
    facturaPathXml: string
  ) {
    const TOKEN: any = process.env.MAILTRAP_TOKEN;
    const SENDER_EMAIL = process.env.MAILTRAP_SENDER_EMAIL;

    const client = new MailtrapClient({ token: TOKEN });
    const sender: any = {
      name: "Quickpay Notificaciones",
      email: SENDER_EMAIL,
    };

    try {
      const templateEmail = path.join(
        process.cwd(),
        "plantillas",
        `correo_notificacion_pago.html`
      );
      const emailTemplate = fs.readFileSync(templateEmail).toString();

      const emailHtml = emailTemplate
        .replace("{{nombre_cliente}}", paymentData.nombreCliente)
        .replace(
          "{{numero_transaccion}}",
          paymentData.numeroTransaccion.slice(-8)
        )
        .replace("{{monto}}", paymentData.monto)
        .replace("{{moneda}}", paymentData.moneda)
        .replace("{{fecha}}", FuncionesFechas.obtenerFechaFormato)
        .replace("{{nombre_empresa}}", paymentData.nombreEmpresa)
        .replace("{{anio_actual}}", new Date().getFullYear().toString());

      const attachments: any[] = [];

      const addAttachmentIfExists = (filePath: string, mimeType: string) => {
        if (filePath && fs.existsSync(filePath)) {
          attachments.push({
            filename: path.basename(filePath),
            content: fs.readFileSync(filePath, { encoding: "base64" }),
            type: mimeType,
            disposition: "attachment",
          });
        }
      };

      addAttachmentIfExists(reciboPath, "application/pdf");
      addAttachmentIfExists(facturaPathPdf, "application/pdf");
      addAttachmentIfExists(facturaPathXml, "application/xml");

      const response = await client.send({
        from: sender,
        to: [{ email: to, name: paymentData.nombreCliente }],
        subject,
        html: emailHtml,
        attachments,
      });

      console.log("Correo enviado con éxito:", response);

      return true;
    } catch (error) {
      console.error("Error enviando correo:", error);
      //throw error;
      return false;
    }
  }
}
