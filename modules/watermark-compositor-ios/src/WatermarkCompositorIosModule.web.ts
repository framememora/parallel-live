import { registerWebModule, NativeModule } from 'expo';

// WatermarkCompositorIosModule is not available on the web platform.
class WatermarkCompositorIosModule extends NativeModule<{}> {}

export default registerWebModule(WatermarkCompositorIosModule, 'WatermarkCompositorIosModule');
