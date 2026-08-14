import { registerWebModule, NativeModule } from 'expo';

// WatermarkCompositorAndroidModule is not available on the web platform.
class WatermarkCompositorAndroidModule extends NativeModule<{}> {}

export default registerWebModule(WatermarkCompositorAndroidModule, 'WatermarkCompositorAndroidModule');
