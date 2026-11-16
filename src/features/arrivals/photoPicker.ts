/**
 * Picks exam photos with expo-image-picker: the camera or the photo library on phones (the officer
 * chooses), a file chooser on web. Captured photos are not saved to the device gallery (FE-024).
 * Uploading happens when the exam is completed (arrivalBackend.uploadExamPhotos).
 */
import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

import type { ExamPhoto } from '@/domain/types';

export type PhotoSource = 'camera' | 'library';

/** The officer refused camera or photo access; the message says where to change it. */
export class PhotoPermissionError extends Error {
  constructor(source: PhotoSource) {
    super(
      source === 'camera'
        ? 'Camera access is off. Allow it in Settings to take photos.'
        : 'Photo access is off. Allow it in Settings to attach photos.',
    );
    this.name = 'PhotoPermissionError';
  }
}

/** Camera or library on phones (null if cancelled); web has only the file chooser. */
export function choosePhotoSource(): Promise<PhotoSource | null> {
  if (Platform.OS === 'web') return Promise.resolve('library');
  return new Promise((resolve) => {
    Alert.alert(
      'Add photo',
      undefined,
      [
        { text: 'Take photo', onPress: () => resolve('camera') },
        { text: 'Choose from library', onPress: () => resolve('library') },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}

let picked = 0;

/** Up to `limit` photos from the source; empty when cancelled. */
export async function pickPhotos(source: PhotoSource, limit: number): Promise<ExamPhoto[]> {
  const permission =
    source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new PhotoPermissionError(source);
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.7,
    allowsMultipleSelection: source === 'library' && limit > 1,
    selectionLimit: limit,
  };
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return [];
  return result.assets.slice(0, limit).map((asset) => ({
    id: `photo-${Date.now()}-${++picked}`,
    uri: asset.uri,
    fileName: asset.fileName ?? undefined,
    mimeType: asset.mimeType ?? undefined,
  }));
}
