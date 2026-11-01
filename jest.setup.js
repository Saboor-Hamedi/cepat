/* global jest */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return new Proxy(
    {},
    {
      get: (_, prop) => {
        if (prop === '__esModule') return true;
        const Icon = (props) =>
          React.createElement(View, {
            ...props,
            testID: props.testID || `lucide-icon-${String(prop)}`,
          });
        Icon.displayName = `LucideIcon(${String(prop)})`;
        return Icon;
      },
    },
  );
});
