import { NativeModule, requireNativeModule } from 'expo';

declare class WatermarkCompositorIosModule extends NativeModule<{}> {
  burnIn(sourcePath: string, destinationPath: string): Promise<string>;
}

export default requireNativeModule<WatermarkCompositorIosModule>('WatermarkCompositorIos');
