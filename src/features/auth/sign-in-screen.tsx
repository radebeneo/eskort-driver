import { useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import type { Edge } from 'react-native-safe-area-context';

import { Button, Screen, Text, TextField, useTheme } from '@/components/ui';
import { toAppError } from '@/lib/errors';
import { useAuth } from '@/providers/auth-provider';

import { hasErrors, validateSignIn, type SignInFieldErrors } from './validate-sign-in';

const ALL_EDGES: Edge[] = ['top', 'bottom', 'left', 'right'];

export function SignInScreen() {
  const { signIn } = useAuth();
  const { spacing } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<SignInFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

  async function handleSubmit() {
    if (isSubmitting) return;
    const errors = validateSignIn({ email, password });
    setFieldErrors(errors);
    setFormError(null);
    if (hasErrors(errors)) return;

    setIsSubmitting(true);
    try {
      await signIn(email.trim(), password);
      // On success the root navigator's protected-route guard shows the app.
    } catch (error) {
      setFormError(toAppError(error, 'Sign-in failed. Please try again.').message);
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}>
      <Screen scroll edges={ALL_EDGES} contentStyle={styles.content}>
        <View style={{ gap: spacing.xs }}>
          <Text variant="title">Driver sign-in</Text>
          <Text tone="muted">Sign in with the account provided by your dispatcher.</Text>
        </View>

        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          error={fieldErrors.email}
          editable={!isSubmitting}
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="username"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <TextField
          ref={passwordRef}
          label="Password"
          value={password}
          onChangeText={setPassword}
          error={fieldErrors.password}
          editable={!isSubmitting}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={() => void handleSubmit()}
        />

        {formError ? (
          <Text tone="danger" accessibilityRole="alert">
            {formError}
          </Text>
        ) : null}

        <Button label="Sign in" loading={isSubmitting} onPress={() => void handleSubmit()} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
});
