import React, { useState } from 'react';
import { Button, Image, Upload, message } from 'antd';
import { DeleteOutlined, LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import type { RcFile, UploadProps } from 'antd/es/upload/interface';
import { uploadService } from '../../services/upload.service';

interface ImageUploadProps {
  value?: string | null;
  onChange?: (url: string | null) => void;
  aspectRatioLabel?: string;
  maxSizeMB?: number;
  disabled?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  aspectRatioLabel = 'Recommended: JPG/PNG/WebP, max 10MB',
  maxSizeMB = 10,
  disabled = false,
}) => {
  const [loading, setLoading] = useState(false);

  const beforeUpload = (file: RcFile) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('Please upload an image file (JPG, PNG, or WebP).');
      return false;
    }
    const isLtMax = file.size / 1024 / 1024 < maxSizeMB;
    if (!isLtMax) {
      message.error(`Image must be smaller than ${maxSizeMB}MB.`);
      return false;
    }
    return true;
  };

  const handleCustomUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options;
    setLoading(true);
    try {
      const result = await uploadService.uploadImage(file as File);
      setLoading(false);
      if (onChange) {
        onChange(result.url);
      }
      if (onSuccess) onSuccess(result);
      message.success('Image uploaded to S3 successfully!');
    } catch (err: unknown) {
      setLoading(false);
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ||
        (err as Error).message ||
        'Image upload failed';
      message.error(msg);
      if (onError) onError(err as Error);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onChange) {
      onChange(null);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      {value ? (
        <div className="relative inline-block w-36 h-36 border border-brand-border rounded-xl overflow-hidden bg-brand-cream/50 group shadow-sm">
          <Image
            src={value}
            alt="Uploaded preview"
            width={144}
            height={144}
            className="object-cover w-full h-full"
            fallback="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='144' height='144' viewBox='0 0 144 144'><rect width='144' height='144' fill='%23eee'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23aaa' font-size='12'>No Preview</text></svg>"
          />
          {!disabled && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                type="primary"
                danger
                size="small"
                shape="circle"
                icon={<DeleteOutlined />}
                onClick={handleRemove}
                title="Remove image"
              />
            </div>
          )}
        </div>
      ) : (
        <Upload
          name="image"
          listType="picture-card"
          showUploadList={false}
          customRequest={handleCustomUpload}
          beforeUpload={beforeUpload}
          disabled={disabled || loading}
          className="sharon-image-uploader"
        >
          <div className="flex flex-col items-center justify-center p-3 text-center cursor-pointer">
            {loading ? (
              <LoadingOutlined className="text-xl text-brand-forest mb-1.5" />
            ) : (
              <PlusOutlined className="text-xl text-brand-forest mb-1.5" />
            )}
            <div className="text-xs font-semibold text-brand-forest">
              {loading ? 'Uploading to S3...' : 'Upload Photo'}
            </div>
          </div>
        </Upload>
      )}
      {aspectRatioLabel && (
        <div className="text-[11px] text-brand-muted">{aspectRatioLabel}</div>
      )}
    </div>
  );
};
