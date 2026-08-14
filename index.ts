import { registerRootComponent } from 'expo';

import App from './App';

// Keep `./App` as a static import. Switching it to a conditional require() to
// catch import-time errors changes the entry module's dependency shape, which
// makes Metro's graph throw "Got unexpected undefined" from nullthrows in
// Graph._recursivelyCommitModule under lazy bundling and fails the whole bundle
// with a 500 — clearing the cache does not help.

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
