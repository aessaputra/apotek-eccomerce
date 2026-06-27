import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@/test-utils/renderWithTheme';
import SupportScreen from '@/scenes/profile/Support';

describe('<SupportScreen />', () => {
  it('renders the current support copy', () => {
    render(<SupportScreen />);

    expect(screen.getByText('Pusat Bantuan & Feedback Pelanggan')).not.toBeNull();
    expect(screen.getByText('Kirim Feedback')).not.toBeNull();
    expect(screen.getByText('support@sinarfarma.biz.id')).not.toBeNull();
  });
});
