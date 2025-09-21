import fs from "fs";
import path from "path";
import Handlebars from "handlebars";
import nodemailer from "nodemailer";

// Interface para dados do template de reset de senha
interface ResetPasswordTemplateData extends Record<string, unknown> {
  userName: string;
  resetUrl: string;
  appName?: string;
  currentYear?: number;
}

// Interface para dados do template de boas-vindas
interface WelcomeTemplateData extends Record<string, unknown> {
  userName: string;
  loginUrl?: string;
  appName?: string;
  currentYear?: number;
}

// Interface para configuração de email
interface EmailConfig {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
}

class EmailService {
  private transporter: nodemailer.Transporter;
  private templatesPath: string;

 constructor() {
    // Configurar transporter do nodemailer para usar Mailtrap (ou qualquer servidor SMTP)
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: Number(process.env.EMAIL_SERVER_PORT), // Convertemos para número
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    });

    // Definir caminho dos templates
    this.templatesPath = path.join(process.cwd(), "src", "templates", "emails");
  }

  // Renderizar template com dados
  private async renderTemplate(
    templateName: string,
    data: Record<string, unknown>
  ): Promise<string> {
    try {
      const templatePath = path.join(this.templatesPath, `${templateName}.hbs`);
      const templateSource = fs.readFileSync(templatePath, "utf-8");

      // Compilar template
      const template = Handlebars.compile(templateSource);

      // Adicionar dados padrão
      const defaultData = {
        appName: "Acessae",
        currentYear: new Date().getFullYear(),
        ...data,
      };

      return template(defaultData);
    } catch (error) {
      console.error("Erro ao renderizar template:", error);
      throw new Error(`Falha ao renderizar template ${templateName}`);
    }
  }

  // Enviar email usando template
  async sendEmail(config: EmailConfig): Promise<void> {
    try {
      const htmlContent = await this.renderTemplate(
        config.template,
        config.data
      );

      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: config.to,
        subject: config.subject,
        html: htmlContent,
      });

      console.log(`Email enviado com sucesso para: ${config.to}`);
    } catch (error) {
      console.error("Erro ao enviar email:", error);
      throw new Error("Falha ao enviar email");
    }
  }

  // Método específico para enviar email de reset de senha
  async sendResetPasswordEmail(
    to: string,
    data: ResetPasswordTemplateData
  ): Promise<void> {
    await this.sendEmail({
      to,
      subject: "Redefinição de Senha - Acessae",
      template: "reset-password",
      data,
    });
  }

  // Método específico para enviar email de boas-vindas
  async sendWelcomeEmail(to: string, data: WelcomeTemplateData): Promise<void> {
    await this.sendEmail({
      to,
      subject: "Bem-vindo ao Acessae! 🎉",
      template: "welcome",
      data: {
        loginUrl: `${process.env.NEXTAUTH_URL}/login`,
        ...data,
      },
    });
  }

  // Testar conexão do email
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log("Conexão com servidor de email estabelecida");
      return true;
    } catch (error) {
      console.error("Erro na conexão com servidor de email:", error);
      return false;
    }
  }
}

// Exportar instância singleton
export const emailService = new EmailService();
export default EmailService;
