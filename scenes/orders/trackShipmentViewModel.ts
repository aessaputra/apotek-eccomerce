import type { OrderStatusVariant } from '@/services';
import type { TrackingEvent, TrackingResult } from '@/types/shipping';

export interface TrackingHeroCopy {
  title: string;
  description: string;
  tone: '$successSoft' | '$warningSoft' | '$dangerSoft' | '$primarySoft';
}

export interface TrackingTimelineItem extends TrackingEvent {
  timelineKey: string;
  showConnector: boolean;
}

export function formatTrackingStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    confirmed: 'Pesanan Dikonfirmasi',
    allocated: 'Kurir Dialokasikan',
    picking_up: 'Kurir Menuju Penjemputan',
    pickingUp: 'Kurir Menuju Penjemputan',
    picked: 'Paket Sudah Dijemput',
    picked_up: 'Paket Sudah Dijemput',
    dropping_off: 'Sedang Dikirim',
    droppingOff: 'Sedang Dikirim',
    delivering: 'Sedang Dikirim',
    in_transit: 'Sedang Dikirim',
    on_hold: 'Tertahan',
    onHold: 'Tertahan',
    delivered: 'Terkirim',
    rejected: 'Pengiriman Ditolak',
    courier_not_found: 'Kurir Belum Ditemukan',
    courierNotFound: 'Kurir Belum Ditemukan',
    return_in_transit: 'Dalam Proses Pengembalian',
    returnInTransit: 'Dalam Proses Pengembalian',
    returned: 'Dikembalikan',
    cancelled: 'Dibatalkan',
    disposed: 'Dibuang',
  };

  return labels[status] || status.replace(/_/g, ' ');
}

export function getTrackingStatusVariant(status: string): OrderStatusVariant {
  if (status === 'delivered') return 'success';
  if (['rejected', 'disposed', 'courier_not_found', 'courierNotFound'].includes(status)) {
    return 'danger';
  }
  if (
    ['on_hold', 'onHold', 'cancelled', 'returned', 'return_in_transit', 'returnInTransit'].includes(
      status,
    )
  ) {
    return 'warning';
  }
  return 'primary';
}

export function getTrackingHeroCopy(status: string): TrackingHeroCopy {
  if (status === 'delivered') {
    return {
      title: 'Pesanan Sudah Terkirim',
      description: 'Kurir telah menyelesaikan pengantaran. Silakan cek detail riwayat di bawah.',
      tone: '$successSoft',
    };
  }

  if (['rejected', 'disposed', 'courier_not_found', 'courierNotFound'].includes(status)) {
    return {
      title: 'Pengiriman Perlu Perhatian',
      description: 'Status pengiriman berubah dan memerlukan pengecekan lebih lanjut.',
      tone: '$dangerSoft',
    };
  }

  if (
    ['on_hold', 'onHold', 'cancelled', 'returned', 'return_in_transit', 'returnInTransit'].includes(
      status,
    )
  ) {
    return {
      title: 'Pengiriman Sedang Tertahan',
      description:
        'Ada pembaruan status yang perlu diperhatikan sebelum pesanan melanjutkan perjalanan.',
      tone: '$warningSoft',
    };
  }

  return {
    title: 'Perjalanan Paket Anda',
    description: 'Lihat status terbaru, resi, dan riwayat perpindahan paket Anda di satu layar.',
    tone: '$primarySoft',
  };
}

export function formatTrackingDate(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isSafeExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function buildTrackingTimeline(
  tracking: TrackingResult | null | undefined,
  updatedAtFallback?: string | null,
  createdAtFallback?: string | null,
): TrackingTimelineItem[] {
  if (!tracking) {
    return [];
  }

  if (tracking.history.length > 0) {
    return tracking.history.map((event, index, history) => ({
      ...event,
      timelineKey: `${event.updated_at}-${event.status}-${event.note}`,
      showConnector: index < history.length - 1,
    }));
  }

  return [
    {
      note: 'Status pengiriman belum memiliki riwayat detail.',
      status: tracking.status,
      updated_at: updatedAtFallback ?? createdAtFallback ?? '',
      timelineKey: `fallback-${tracking.id}`,
      showConnector: false,
    },
  ];
}
