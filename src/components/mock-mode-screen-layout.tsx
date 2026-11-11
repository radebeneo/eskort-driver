import { createContext, useContext, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { MockModeBanner } from '@/components/mock-mode-banner';
import { useTheme } from '@/components/ui/use-theme';
import { useServices } from '@/providers/services-provider';

const HEADER_EDGES: Edge[] = ['left', 'right'];
const HEADERLESS_EDGES: Edge[] = ['top', 'left', 'right'];

/** True below a layout that already shows the banner, so nested navigators do not repeat it. */
const MockBannerShownContext = createContext(false);

export type MockModeScreenLayoutProps = {
  children: ReactNode;
  /**
   * Set for navigators without a header. The banner is then the top of the
   * screen and clears the status bar itself.
   */
  headerless?: boolean;
};

/**
 * Navigator `screenLayout` wrapper that keeps `MockModeBanner` fixed above every
 * screen and state while mock services are active. In live mode it renders the
 * screen unchanged.
 *
 * The screen is a direct sibling of the banner, so `KeyboardAvoidingView` and
 * safe-area insets inside the screen measure from their real position.
 */
export function MockModeScreenLayout({ children, headerless = false }: MockModeScreenLayoutProps) {
  const { mode } = useServices();
  const isBannerShown = useContext(MockBannerShownContext);
  const { colors, spacing } = useTheme();

  if (mode !== 'mock' || isBannerShown) return children;

  return (
    <MockBannerShownContext.Provider value={true}>
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <SafeAreaView edges={headerless ? HEADERLESS_EDGES : HEADER_EDGES}>
          <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
            <MockModeBanner />
          </View>
        </SafeAreaView>
        {children}
      </View>
    </MockBannerShownContext.Provider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
