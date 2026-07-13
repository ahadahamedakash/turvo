import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASSWORD'),
      },
    });
  }

  /**
   * Send an invitation email to a user
   * @param to Recipient email address
   * @param invitationToken Unique token for invitation acceptance
   * @param inviterName Name of the person sending the invitation
   * @param tenantName Name of the tenant/organization
   * @param roleName Name of the role being invited for
   */
  async sendInvitationEmail(
    to: string,
    invitationToken: string,
    inviterName: string,
    tenantName: string,
    roleName: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const acceptanceUrl = `${frontendUrl}/invitations/accept?token=${invitationToken}`;
    const fromName = this.configService.get<string>('MAIL_FROM_NAME', 'Turvo');
    const fromEmail = this.configService.get<string>(
      'MAIL_FROM',
      'ahadahamedakash@gmail.com',
    );

    const mailOptions = {
      from: `${fromName} <${fromEmail}>`,
      to,
      subject: `You're invited to join ${tenantName} on Turvo`,
      html: this.getInvitationTemplate(
        inviterName,
        tenantName,
        roleName,
        acceptanceUrl,
      ),
      text: this.getInvitationTextTemplate(
        inviterName,
        tenantName,
        roleName,
        acceptanceUrl,
      ),
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Failed to send invitation email:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to send invitation email: ${errorMessage}`);
    }
  }

  /**
   * HTML email template for invitations
   */
  private getInvitationTemplate(
    inviterName: string,
    tenantName: string,
    roleName: string,
    acceptanceUrl: string,
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to Join Turvo</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      background-color: #2563eb;
      color: #ffffff;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 20px;
    }
    .message {
      margin-bottom: 30px;
      color: #555;
    }
    .details {
      background-color: #f8f9fa;
      padding: 20px;
      border-radius: 6px;
      margin-bottom: 30px;
    }
    .detail-row {
      display: flex;
      margin-bottom: 10px;
    }
    .detail-label {
      font-weight: 600;
      min-width: 120px;
      color: #333;
    }
    .detail-value {
      color: #555;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background-color: #2563eb;
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
    }
    .button:hover {
      background-color: #1d4ed8;
    }
    .expiry {
      text-align: center;
      color: #777;
      font-size: 14px;
      margin-top: 20px;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px 30px;
      text-align: center;
      font-size: 14px;
      color: #777;
    }
    .footer a {
      color: #2563eb;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Turvo</h1>
    </div>
    <div class="content">
      <p class="greeting">Hello,</p>
      <p class="message">
        <strong>${inviterName}</strong> has invited you to join
        <strong>${tenantName}</strong> on Turvo with the role of
        <strong>${roleName}</strong>.
      </p>
      <div class="details">
        <div class="detail-row">
          <span class="detail-label">Organization:</span>
          <span class="detail-value">${tenantName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Role:</span>
          <span class="detail-value">${roleName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Invited by:</span>
          <span class="detail-value">${inviterName}</span>
        </div>
      </div>
      <div class="button-container">
        <a href="${acceptanceUrl}" class="button">Accept Invitation</a>
      </div>
      <p class="expiry">
        This invitation will expire in 7 days. If you don't have a Turvo account yet,
        you'll be able to create one when you accept the invitation.
      </p>
    </div>
    <div class="footer">
      <p>If you didn't expect this invitation, you can safely ignore this email.</p>
      <p>© ${new Date().getFullYear()} Turvo. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Plain text fallback email template for invitations
   */
  private getInvitationTextTemplate(
    inviterName: string,
    tenantName: string,
    roleName: string,
    acceptanceUrl: string,
  ): string {
    return `
You're invited to join ${tenantName} on Turvo

${inviterName} has invited you to join ${tenantName} with the role of ${roleName}.

To accept this invitation, please visit:
${acceptanceUrl}

This invitation will expire in 7 days.

If you don't have a Turvo account yet, you'll be able to create one when you accept the invitation.

If you didn't expect this invitation, you can safely ignore this email.

© ${new Date().getFullYear()} Turvo. All rights reserved.
    `.trim();
  }

  /**
   * Verify email configuration by sending a test email
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email configuration verification failed:', error);
      return false;
    }
  }
}
