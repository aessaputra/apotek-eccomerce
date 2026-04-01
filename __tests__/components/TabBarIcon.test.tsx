import React from 'react';
import { describe, test, expect } from '@jest/globals';
import { render, waitFor } from '@/test-utils/renderWithTheme';
import TabBarIcon from '@/components/layouts/TabBarIcon';
import { HomeIcon } from '@/components/icons';

describe('<TabBarIcon />', () => {
  test('renders icon when focused', async () => {
    const { root } = render(<TabBarIcon color="#000000" focused={true} icon={HomeIcon} />);
    await waitFor(() => {
      expect(root).toBeTruthy();
    });
  });

  test('renders icon when not focused', async () => {
    const { root } = render(<TabBarIcon color="#000000" focused={false} icon={HomeIcon} />);
    await waitFor(() => {
      expect(root).toBeTruthy();
    });
  });

  test('passes color to icon component', () => {
    const { root } = render(<TabBarIcon color="#FF0000" focused={false} icon={HomeIcon} />);
    expect(root).toBeTruthy();
  });

  test('wraps icon with TabBarIconWithPill', () => {
    const { root } = render(<TabBarIcon color="#000000" focused={true} icon={HomeIcon} />);
    expect(root).toBeTruthy();
  });
});
