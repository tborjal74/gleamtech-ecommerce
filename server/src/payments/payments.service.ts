import { HttpStatus, Injectable } from '@nestjs/common';
import { OrderStatus, PaymentStatus, type Order } from '@prisma/client';

import { ApiError } from '../common/api-error.js';
import { PrismaService } from '../database/prisma.service.js';
import type { PaymentSubmissionDto } from './dto/payment-submission.dto.js';
import { validatePaymentProof, type PaymentProofFile } from './payment-proof.util.js';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  pendingPayment(order: Pick<Order, 'id' | 'paymentStatus' | 'paymentMethod' | 'totalMinor'>) {
    return {
      status: order.paymentStatus,
      provider: 'manual',
      method: order.paymentMethod,
      requiresReference: true,
      requiresProof: true,
      message: 'Submit the transfer reference and payment proof for administrator verification.',
    };
  }

  async submit(userId: string, orderId: string, dto: PaymentSubmissionDto, file?: PaymentProofFile) {
    validatePaymentProof(file);
    const reference = dto.reference.trim();

    return this.prisma.$transaction(async tx => {
      const order = await tx.order.findFirst({ where: { id: orderId, userId } });
      if (!order) {
        throw new ApiError(HttpStatus.NOT_FOUND, 'ORDER_NOT_FOUND', 'Order was not found.');
      }
      if (order.status === OrderStatus.CANCELLED || order.paymentStatus === PaymentStatus.PAID || order.paymentStatus === PaymentStatus.REFUNDED) {
        throw new ApiError(HttpStatus.CONFLICT, 'PAYMENT_SUBMISSION_NOT_ALLOWED', 'This order is not open for payment submission.');
      }

      const submission = await tx.paymentSubmission.upsert({
        where: { orderId },
        update: {
          method: dto.method,
          reference,
          proof: file.buffer,
          proofMimeType: file.mimetype,
          proofSizeBytes: file.size,
          proofOriginalName: file.originalname.slice(0, 255),
          submittedAt: new Date(),
        },
        create: {
          orderId,
          method: dto.method,
          reference,
          proof: file.buffer,
          proofMimeType: file.mimetype,
          proofSizeBytes: file.size,
          proofOriginalName: file.originalname.slice(0, 255),
        },
        select: {
          method: true,
          reference: true,
          proofMimeType: true,
          proofSizeBytes: true,
          submittedAt: true,
        },
      });
      await tx.order.update({
        where: { id: orderId },
        data: { paymentMethod: dto.method, paymentStatus: PaymentStatus.SUBMITTED },
      });

      return {
        submission: {
          ...submission,
          submittedAt: submission.submittedAt.toISOString(),
          hasProof: true,
        },
      };
    });
  }

  async proofForAdmin(orderId: string) {
    const submission = await this.prisma.paymentSubmission.findUnique({
      where: { orderId },
      select: { proof: true, proofMimeType: true, proofOriginalName: true },
    });
    if (!submission) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'PAYMENT_PROOF_NOT_FOUND', 'Payment proof was not found.');
    }
    return submission;
  }
}
