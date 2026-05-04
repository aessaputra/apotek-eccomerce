import React from 'react';
import BottomActionBar from '@/components/layouts/BottomActionBar';

interface OrderDetailActionsProps {
  paymentStatus: string;
  isOrderExpired: boolean;
  canResumePayment: boolean;
  isLoading: boolean;
  isConfirming: boolean;
  shouldShowTracking: boolean;
  isAwaitingCustomerConfirmation: boolean;
  waybillNumber?: string | null;
  onResumePayment: () => void;
  onTrackShipment: () => void;
  onConfirmReceived: () => void;
}

export default function OrderDetailActions({
  paymentStatus,
  isOrderExpired,
  canResumePayment,
  isLoading,
  isConfirming,
  shouldShowTracking,
  isAwaitingCustomerConfirmation,
  waybillNumber,
  onResumePayment,
  onTrackShipment,
  onConfirmReceived,
}: OrderDetailActionsProps) {
  if (paymentStatus === 'pending') {
    return (
      <BottomActionBar
        buttonTitle={isOrderExpired ? 'Pembayaran Kadaluarsa' : 'Bayar Sekarang'}
        onPress={onResumePayment}
        isLoading={isLoading}
        disabled={!canResumePayment}
        aria-label="Bayar pesanan"
        aria-describedby="Tombol untuk melanjutkan pembayaran"
      />
    );
  }

  if (shouldShowTracking) {
    return (
      <BottomActionBar
        buttonTitle="Lacak Pengiriman"
        onPress={onTrackShipment}
        isLoading={isLoading}
        disabled={!waybillNumber}
        aria-label="Lacak pengiriman pesanan"
        aria-describedby="Tombol untuk membuka layar tracking pengiriman"
      />
    );
  }

  if (isAwaitingCustomerConfirmation) {
    return (
      <BottomActionBar
        buttonTitle="Pesanan Diterima"
        onPress={onConfirmReceived}
        isLoading={isConfirming}
        disabled={isConfirming}
        aria-label="Konfirmasi pesanan diterima"
        aria-describedby="Tombol untuk mengonfirmasi bahwa pesanan sudah diterima"
      />
    );
  }

  return null;
}
