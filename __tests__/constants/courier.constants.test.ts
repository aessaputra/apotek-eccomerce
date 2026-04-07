import {
  formatCourierServiceName,
  getCourierName,
  getServiceName,
} from '@/constants/courier.constants';

describe('courier.constants', () => {
  describe('formatCourierServiceName', () => {
    it('should format JNE Reguler correctly', () => {
      expect(formatCourierServiceName('jne', 'reg')).toBe('JNE Reguler');
    });

    it('should format SiCepat BEST correctly', () => {
      expect(formatCourierServiceName('sicepat', 'best')).toBe('SiCepat BEST');
    });

    it('should format J&T Express EZ correctly', () => {
      expect(formatCourierServiceName('jnt', 'ez')).toBe('J&T Express EZ');
    });

    it('should format Gojek Instant correctly', () => {
      expect(formatCourierServiceName('gojek', 'instant')).toBe('Gojek Instant');
    });

    it('should handle uppercase courier codes', () => {
      expect(formatCourierServiceName('JNE', 'REG')).toBe('JNE Reguler');
    });

    it('should handle mixed case codes', () => {
      expect(formatCourierServiceName('Jne', 'Reg')).toBe('JNE Reguler');
    });

    it('should return fallback when both codes are null', () => {
      expect(formatCourierServiceName(null, null)).toBe('Metode Pengiriman');
      expect(formatCourierServiceName(undefined, undefined)).toBe('Metode Pengiriman');
    });

    it('should return courier name when service code is null', () => {
      expect(formatCourierServiceName('jne', null)).toBe('JNE');
      expect(formatCourierServiceName('sicepat', undefined)).toBe('SiCepat');
    });

    it('should return service name when courier code is null', () => {
      expect(formatCourierServiceName(null, 'reg')).toBe('Reguler');
      expect(formatCourierServiceName(undefined, 'best')).toBe('BEST');
    });

    it('should handle unknown courier codes', () => {
      expect(formatCourierServiceName('unknown_courier', 'reg')).toBe('UNKNOWN_COURIER Reguler');
    });

    it('should handle unknown service codes', () => {
      expect(formatCourierServiceName('jne', 'unknown_service')).toBe('JNE UNKNOWN_SERVICE');
    });

    it('should handle empty strings', () => {
      expect(formatCourierServiceName('', '')).toBe('Metode Pengiriman');
      expect(formatCourierServiceName('jne', '')).toBe('JNE');
      expect(formatCourierServiceName('', 'reg')).toBe('Reguler');
    });
  });

  describe('getCourierName', () => {
    it('should return correct courier names', () => {
      expect(getCourierName('jne')).toBe('JNE');
      expect(getCourierName('jnt')).toBe('J&T Express');
      expect(getCourierName('sicepat')).toBe('SiCepat');
      expect(getCourierName('gojek')).toBe('Gojek');
    });

    it('should handle uppercase codes', () => {
      expect(getCourierName('JNE')).toBe('JNE');
    });

    it('should return fallback for null/undefined', () => {
      expect(getCourierName(null)).toBe('Kurir');
      expect(getCourierName(undefined)).toBe('Kurir');
    });

    it('should uppercase unknown codes', () => {
      expect(getCourierName('unknown')).toBe('UNKNOWN');
    });
  });

  describe('getServiceName', () => {
    it('should return correct service names', () => {
      expect(getServiceName('reg')).toBe('Reguler');
      expect(getServiceName('best')).toBe('BEST');
      expect(getServiceName('instant')).toBe('Instant');
    });

    it('should handle uppercase codes', () => {
      expect(getServiceName('REG')).toBe('Reguler');
    });

    it('should return empty string for null/undefined', () => {
      expect(getServiceName(null)).toBe('');
      expect(getServiceName(undefined)).toBe('');
    });

    it('should uppercase unknown codes', () => {
      expect(getServiceName('unknown')).toBe('UNKNOWN');
    });
  });
});
