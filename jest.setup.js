/* global jest */
// Shared Jest setup: replace native modules that have no JS implementation in tests.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
