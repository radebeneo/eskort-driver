import { Alert, Linking } from 'react-native';

/** `tel:` URL with formatting removed, or null when the number is unusable. */
export function toTelUrl(phone: string): string | null {
  const dialable = phone.replace(/[^\d+]/g, '');
  return dialable.replace(/\D/g, '').length >= 3 ? `tel:${dialable}` : null;
}

export async function callPhoneNumber(phone: string): Promise<void> {
  const url = toTelUrl(phone);
  if (!url) {
    Alert.alert('Invalid phone number', 'This customer phone number cannot be dialled.');
    return;
  }
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Could not start the call', 'Your device could not open the phone app.');
  }
}
