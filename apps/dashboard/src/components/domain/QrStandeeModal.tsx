import { useEffect, useState } from 'react';
import { Button, Modal, Tag, message } from 'antd';
import { Download, FileText, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import type { QrCodeRecord } from '../../types/dashboard';
import {
  buildQrTargetUrl,
  downloadStandeePdf,
  downloadStandeePng,
} from '../../utils/qrExport';

interface QrStandeeModalProps {
  qrRecord: QrCodeRecord | null;
  open: boolean;
  onClose: () => void;
}

export function QrStandeeModal({
  qrRecord,
  open,
  onClose,
}: QrStandeeModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [downloading, setDownloading] = useState<'png' | 'pdf' | null>(null);

  useEffect(() => {
    if (!qrRecord || !open) {
      setQrDataUrl('');
      return;
    }

    let cancelled = false;
    const targetUrl = buildQrTargetUrl(qrRecord);
    QRCode.toDataURL(targetUrl, {
      width: 360,
      margin: 2,
      color: {
        dark: '#241C24',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => {
        if (!cancelled) {
          setQrDataUrl(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrDataUrl('');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [qrRecord, open]);

  if (!qrRecord) {
    return null;
  }

  const targetUrl = buildQrTargetUrl(qrRecord);

  const handleDownloadPng = async () => {
    try {
      setDownloading('png');
      await downloadStandeePng(qrRecord);
      message.success('Standee PNG downloaded');
    } catch {
      message.error('Failed to generate PNG standee');
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloading('pdf');
      await downloadStandeePdf(qrRecord);
      message.success('Print-ready A5 Standee PDF downloaded');
    } catch {
      message.error('Failed to generate PDF standee');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={460}
      title={
        <div className="flex items-center gap-2 text-brand-forest">
          <QrCode className="h-5 w-5" />
          <span>Counter Standee Preview ({qrRecord.businessId})</span>
        </div>
      }
    >
      <div className="mt-3 rounded-3xl border-4 border-brand-forest bg-brand-cream p-5 text-center shadow-soft">
        <div className="rounded-2xl bg-brand-forest px-4 py-3 text-white">
          <div className="text-[10px] font-semibold tracking-widest text-brand-amber">
            CONTACTLESS ORDERING
          </div>
          <div className="font-display text-xl font-bold">
            Sharon Tea &amp; Coffee
          </div>
          <div className="text-xs text-brand-cream/90">
            {qrRecord.outletName}
          </div>
        </div>

        <div className="mx-auto my-4 inline-block rounded-2xl border border-brand-border bg-white p-3">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR Standee ${qrRecord.businessId}`}
              className="h-56 w-56 object-contain"
            />
          ) : (
            <div className="flex h-56 w-56 items-center justify-center text-xs text-brand-muted">
              Generating QR...
            </div>
          )}
        </div>

        <div>
          <Tag
            color="#541424"
            className="rounded-full px-3 py-0.5 text-xs font-semibold uppercase"
          >
            {qrRecord.label}
          </Tag>
        </div>
        <div className="mt-2 font-display text-base font-bold text-brand-black">
          Scan to Browse, Customize &amp; Pay via UPI
        </div>
        <div className="mt-1 break-all text-[11px] text-brand-muted">
          {targetUrl}
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <Button
          type="primary"
          block
          size="large"
          loading={downloading === 'png'}
          icon={<Download className="h-4 w-4" />}
          onClick={handleDownloadPng}
        >
          Download PNG
        </Button>
        <Button
          block
          size="large"
          loading={downloading === 'pdf'}
          className="btn-export-pdf"
          icon={<FileText className="h-4 w-4" />}
          onClick={handleDownloadPdf}
        >
          Download PDF
        </Button>
      </div>
    </Modal>
  );
}
