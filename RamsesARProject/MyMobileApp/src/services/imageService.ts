/**
 * Image Service
 * =============
 * Handles image picking from camera and gallery
 * using react-native-image-picker.
 */

import {
  launchCamera,
  launchImageLibrary,
  type ImagePickerResponse,
  type CameraOptions,
  type ImageLibraryOptions,
} from 'react-native-image-picker';

export interface PickedImage {
  uri: string;
  type: string;
  fileName: string;
  width: number;
  height: number;
}

function parseResponse(response: ImagePickerResponse): PickedImage | null {
  if (response.didCancel || response.errorCode || !response.assets?.length) {
    return null;
  }

  const asset = response.assets[0];
  return {
    uri: asset.uri ?? '',
    type: asset.type ?? 'image/jpeg',
    fileName: asset.fileName ?? 'photo.jpg',
    width: asset.width ?? 0,
    height: asset.height ?? 0,
  };
}

/**
 * Launch the device camera to take a photo.
 */
export async function takePhoto(): Promise<PickedImage | null> {
  const options: CameraOptions = {
    mediaType: 'photo',
    cameraType: 'back',
    quality: 0.8,
    maxWidth: 1280,
    maxHeight: 1280,
    includeBase64: false,
    saveToPhotos: false,
  };

  const response = await launchCamera(options);
  return parseResponse(response);
}

/**
 * Launch the image gallery to pick a photo.
 */
export async function pickFromGallery(): Promise<PickedImage | null> {
  const options: ImageLibraryOptions = {
    mediaType: 'photo',
    quality: 0.8,
    maxWidth: 1280,
    maxHeight: 1280,
    includeBase64: false,
    selectionLimit: 1,
  };

  const response = await launchImageLibrary(options);
  return parseResponse(response);
}
