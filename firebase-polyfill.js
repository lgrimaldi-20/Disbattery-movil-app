// Polyfill para Firebase en React Native
if (typeof global.window === 'undefined') {
  global.window = global;
}

if (typeof global.self === 'undefined') {
  global.self = global;
}
