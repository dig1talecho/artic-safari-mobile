const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Paket dışa aktarımlarını eski kararlı haline getir
config.resolver.unstable_enablePackageExports = false;

// Hermes motorunun tanıyamadığı private properties hatalarını önlemek için transformer ayarı
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;