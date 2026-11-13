import { axiosClient } from '../api/axiosClient';
import { API_ENDPOINTS } from '../api/endpoints';
import type { ApiSuccessEnvelope, UploadResult } from '@sharon/shared';

export const uploadService = {
  async uploadImage(file: File): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('image', file);

    const response = await axiosClient.post<
      ApiSuccessEnvelope<UploadResult>
    >(API_ENDPOINTS.UPLOAD.IMAGE, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  },
};
