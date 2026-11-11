import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Text } from 'react-native';

import { MockModeScreenLayout } from '@/components/mock-mode-screen-layout';
import { ServicesProvider } from '@/providers/services-provider';
import type { ServiceMode } from '@/services';
import type { LocationService } from '@/services/location/location-service';
import { createMockServices } from '@/services/mocks';

const MOCK_BANNER_LABEL = 'Mock mode. Data is fictional and not connected to Supabase.';

const unusedLocation: LocationService = {
  getPermission: jest.fn(),
  requestPermission: jest.fn(),
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
};

function renderWithMode(mode: ServiceMode, ui: ReactNode) {
  return render(
    <ServicesProvider services={{ ...createMockServices(unusedLocation), mode }}>
      {ui}
    </ServicesProvider>,
  );
}

describe('MockModeScreenLayout', () => {
  it('shows the banner with its accessible explanation above the screen in mock mode', async () => {
    await renderWithMode(
      'mock',
      <MockModeScreenLayout>
        <Text>Screen content</Text>
      </MockModeScreenLayout>,
    );

    expect(screen.getByLabelText(MOCK_BANNER_LABEL)).toBeTruthy();
    expect(screen.getByText('MOCK MODE · Fictional data, not connected to Supabase.')).toBeTruthy();
    expect(screen.getByText('Screen content')).toBeTruthy();
  });

  it('shows the banner in the headerless variant', async () => {
    await renderWithMode(
      'mock',
      <MockModeScreenLayout headerless>
        <Text>Screen content</Text>
      </MockModeScreenLayout>,
    );

    expect(screen.getAllByLabelText(MOCK_BANNER_LABEL)).toHaveLength(1);
  });

  it('renders only the screen in live mode', async () => {
    await renderWithMode(
      'live',
      <MockModeScreenLayout>
        <Text>Screen content</Text>
      </MockModeScreenLayout>,
    );

    expect(screen.queryByLabelText(MOCK_BANNER_LABEL)).toBeNull();
    expect(screen.queryByText(/MOCK MODE/)).toBeNull();
    expect(screen.getByText('Screen content')).toBeTruthy();
  });

  it('shows one banner when layouts are nested', async () => {
    await renderWithMode(
      'mock',
      <MockModeScreenLayout headerless>
        <MockModeScreenLayout>
          <Text>Screen content</Text>
        </MockModeScreenLayout>
      </MockModeScreenLayout>,
    );

    expect(screen.getAllByLabelText(MOCK_BANNER_LABEL)).toHaveLength(1);
    expect(screen.getByText('Screen content')).toBeTruthy();
  });
});
