import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@/test-utils/renderWithTheme';
import SupportScreen from '@/scenes/profile/Support';

describe('<SupportScreen />', () => {
  it('renders the current support copy', () => {
    render(<SupportScreen />);

    expect(screen.getByText('Dukungan')).not.toBeNull();
    expect(screen.getByText('Untuk pertanyaan atau bantuan, hubungi kami:')).not.toBeNull();
    expect(screen.getByText('Email: support@apotek.com')).not.toBeNull();
    expect(screen.getByText('Telepon: (021) 1234-5678')).not.toBeNull();
  });
});
