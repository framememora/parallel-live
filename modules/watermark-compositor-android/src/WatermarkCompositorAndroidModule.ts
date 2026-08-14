import { NativeModule, requireNativeModule } from 'expo';

declare class WatermarkCompositorAndroidModule extends NativeModule<{}> {
  burnIn(sourcePath: string, destinationPath: string): Promise<string>;
}

export default requireNativeModule<WatermarkCompositorAndroidModule>('WatermarkCompositorAndroid');
