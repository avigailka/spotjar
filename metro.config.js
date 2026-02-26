const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && moduleName === "react-native-maps") {
    return { type: "empty" };
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Force react-leaflet and leaflet into the web bundle
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
};

// Ensure leaflet packages are not excluded from web builds
config.resolver.platforms = ["ios", "android", "native", "web"];

module.exports = config;