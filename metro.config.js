const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('wasm');

// Fix Metro resolution for lucide-react-native on Windows/Expo by pointing directly to CJS build
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'lucide-react-native') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/lucide-react-native/dist/cjs/lucide-react-native.js'),
      type: 'sourceFile',
    };
  }
  if (moduleName.startsWith('lucide-react-native/icons/')) {
    const iconName = moduleName.replace('lucide-react-native/icons/', '');
    return {
      filePath: path.resolve(__dirname, `node_modules/lucide-react-native/dist/cjs/icons/${iconName}.js`),
      type: 'sourceFile',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
