import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sendgrid from '@sendgrid/mail';

import { ApiError } from '../common/api-error.js';
import { minorToAmount } from '../common/money.js';

export type PaymentConfirmationEmailOrder = {
  orderNumber: string;
  totalMinor: number;
  shippingName: string;
  shippingLine1: string;
  shippingLine2?: string | null;
  shippingCity: string;
  shippingRegion: string;
  shippingPostal: string;
  shippingCountry: string;
  user: {
    email: string;
    firstName: string;
    lastName: string;
  };
  items: Array<{
    productName: string;
    productSku: string;
    unitPriceMinor: number;
    quantity: number;
    lineTotalMinor: number;
  }>;
};

const DELIVERY_INSTRUCTIONS = [
  'Your order is now being prepared by the Gleamtech team.',
  'Please keep your phone available for delivery coordination.',
  'Our team may contact you if we need help locating your address.',
  'Prepare a valid ID or order number if requested during delivery.',
];

@Injectable()
export class EmailService {
  private sendgridConfigured = false;

  constructor(private readonly config: ConfigService) {}

  async sendPaymentConfirmationEmail(order: PaymentConfirmationEmailOrder) {
    this.configureSendGrid();
    const from = this.requiredConfig('EMAIL_FROM');
    const replyTo = this.config.get<string>('EMAIL_REPLY_TO') || undefined;
    const customerName = `${order.user.firstName} ${order.user.lastName}`.trim();
    const subject = `Payment confirmed - Order ${order.orderNumber}`;
    const text = this.paymentConfirmationText(order, customerName);
    const html = this.paymentConfirmationHtml(order, customerName);

    await sendgrid.send({
      to: order.user.email,
      from,
      ...(replyTo ? { replyTo } : {}),
      subject,
      text,
      html,
      trackingSettings: this.transactionalTrackingSettings(),
    });
  }

  async sendPasswordResetEmail(to: string, resetUrl: string) {
    this.configureSendGrid();
    const from = this.requiredConfig('EMAIL_FROM');
    const replyTo = this.config.get<string>('EMAIL_REPLY_TO') || undefined;
    await sendgrid.send({
      to,
      from,
      ...(replyTo ? { replyTo } : {}),
      subject: 'Reset your Gleamtech password',
      text: [
        'We received a request to reset your Gleamtech password.',
        '',
        `Reset your password: ${resetUrl}`,
        '',
        'This link expires in 30 minutes. If you did not request this, you can ignore this email.',
      ].join('\n'),
      html: `
        <div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.5;max-width:560px;margin:0 auto;padding:24px;">
          <h1 style="color:#0f5132;font-size:24px;margin:0 0 12px;">Reset your password</h1>
          <p>We received a request to reset your Gleamtech password.</p>
          <p><a href="${this.escape(resetUrl)}" style="display:inline-block;background:#4bb33f;color:#fff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:700;">Reset password</a></p>
          <p style="color:#64748b;font-size:13px;">This link expires in 30 minutes. If you did not request this, you can ignore this email.</p>
        </div>
      `,
      trackingSettings: this.transactionalTrackingSettings(),
    });
  }

  private configureSendGrid() {
    if (this.sendgridConfigured) return;
    const apiKey = this.requiredConfig('SENDGRID_API_KEY', 'SEND_GRID_API_KEY');
    sendgrid.setApiKey(apiKey);
    this.sendgridConfigured = true;
  }

  private requiredConfig(...keys: string[]): string {
    const value = keys.map(key => this.config.get<string>(key)?.trim()).find(Boolean);
    if (!value) {
      throw new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, 'CONFIGURATION_ERROR', `${keys[0]} is not configured.`);
    }
    return value;
  }

  private transactionalTrackingSettings() {
    return {
      clickTracking: {
        enable: false,
        enableText: false,
      },
    };
  }

  private paymentConfirmationText(order: PaymentConfirmationEmailOrder, customerName: string) {
    const itemLines = order.items
      .map(item => `- ${item.productName} (${item.productSku}) x ${item.quantity}: ${this.money(item.lineTotalMinor)}`)
      .join('\n');
    return [
      `Hi ${customerName || 'Gleamtech Customer'},`,
      '',
      `We have confirmed your payment for order ${order.orderNumber}.`,
      `Total paid: ${this.money(order.totalMinor)}`,
      '',
      'Ordered items:',
      itemLines,
      '',
      'Shipping address:',
      this.shippingAddressText(order),
      '',
      'Delivery instructions:',
      ...DELIVERY_INSTRUCTIONS.map(line => `- ${line}`),
      '',
      'Thank you for shopping with Gleamtech.',
    ].join('\n');
  }

  private paymentConfirmationHtml(order: PaymentConfirmationEmailOrder, customerName: string) {
    const itemRows = order.items
      .map(
        item => `
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;">
              <strong>${this.escape(item.productName)}</strong><br>
              <span style="color:#64748b;font-size:13px;">${this.escape(item.productSku)}</span>
            </td>
            <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
            <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;">${this.money(item.lineTotalMinor)}</td>
          </tr>
        `,
      )
      .join('');

    return `
      <div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.5;max-width:640px;margin:0 auto;padding:24px;">
        <h1 style="color:#0f5132;font-size:24px;margin:0 0 12px;">Payment confirmed</h1>
        <p>Hi ${this.escape(customerName || 'Gleamtech Customer')},</p>
        <p>We have confirmed your payment for <strong>Order ${this.escape(order.orderNumber)}</strong>.</p>
        <div style="background:#ecfdf3;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:18px 0;">
          <div style="font-size:13px;color:#64748b;">Total paid</div>
          <div style="font-size:24px;font-weight:700;color:#0f5132;">${this.money(order.totalMinor)}</div>
        </div>
        <h2 style="font-size:18px;margin-top:24px;">Ordered items</h2>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="text-align:left;color:#64748b;font-size:12px;text-transform:uppercase;padding-bottom:8px;">Product</th>
              <th style="text-align:center;color:#64748b;font-size:12px;text-transform:uppercase;padding-bottom:8px;">Qty</th>
              <th style="text-align:right;color:#64748b;font-size:12px;text-transform:uppercase;padding-bottom:8px;">Total</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
        <h2 style="font-size:18px;margin-top:24px;">Shipping address</h2>
        <p style="background:#f8fafc;border-radius:12px;padding:14px;">${this.shippingAddressHtml(order)}</p>
        <h2 style="font-size:18px;margin-top:24px;">Delivery instructions</h2>
        <ul>${DELIVERY_INSTRUCTIONS.map(line => `<li>${this.escape(line)}</li>`).join('')}</ul>
        <p style="margin-top:24px;">Thank you for shopping with Gleamtech.</p>
      </div>
    `;
  }

  private shippingAddressText(order: PaymentConfirmationEmailOrder) {
    return [
      order.shippingName,
      order.shippingLine1,
      order.shippingLine2,
      `${order.shippingCity}, ${order.shippingRegion} ${order.shippingPostal}`.trim(),
      order.shippingCountry,
    ]
      .filter(Boolean)
      .join('\n');
  }

  private shippingAddressHtml(order: PaymentConfirmationEmailOrder) {
    return this.shippingAddressText(order)
      .split('\n')
      .map(line => this.escape(line))
      .join('<br>');
  }

  private money(minor: number) {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      maximumFractionDigits: Number.isInteger(minorToAmount(minor)) ? 0 : 2,
    }).format(minorToAmount(minor));
  }

  private escape(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
