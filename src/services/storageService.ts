import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

export async function uploadFile(file: File, path: string): Promise<string> {
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
}

export async function uploadMultipleFiles(files: FileList | File[], basePath: string): Promise<string[]> {
  const uploadPromises = Array.from(files).map((file, index) => {
    const extension = file.name.split('.').pop();
    const fileName = `${Date.now()}_${index}.${extension}`;
    return uploadFile(file, `${basePath}/${fileName}`);
  });
  
  return Promise.all(uploadPromises);
}
