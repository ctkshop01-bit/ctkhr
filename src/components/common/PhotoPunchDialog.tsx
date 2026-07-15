import { useEffect, useMemo, useRef, useState } from "react";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/utils";
import { readFileAsDataUrl, shouldUseOriginalImageFile } from "@/components/common/photoUpload";

type Result = { photoDataUrl: string; capturedAtISO: string; reason?: string; hourlyRate?: string };

const MAX_IMAGE_SIDE = 480;
const JPEG_QUALITY = 0.58;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image_load_failed"));
    img.src = src;
  });
}

async function compressImageSrc(src: string) {
  const img = await loadImage(src);
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(img.width, img.height));
  const targetW = Math.max(1, Math.round(img.width * scale));
  const targetH = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_not_supported");
  ctx.drawImage(img, 0, 0, targetW, targetH);
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

function PhotoPickerButton({
  label,
  disabled,
  capture,
  onFileChange,
}: {
  label: string;
  disabled?: boolean;
  capture?: "user" | "environment";
  onFileChange: (file?: File | null) => void;
}) {
  return (
    <div
      className={cn(
        "relative inline-flex h-10 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/70 text-sm font-medium text-zinc-100 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.55)] transition hover:bg-zinc-900",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <span className="inline-flex h-full items-center justify-center px-4">{label}</span>
      <input
        type="file"
        accept="image/*,.heic,.heif"
        capture={capture}
        disabled={disabled}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        onClick={e => {
          e.currentTarget.value = "";
        }}
        onChange={e => onFileChange(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

export default function PhotoPunchDialog({
  open,
  title,
  description,
  requireReason,
  requireHourlyRate,
  confirmText,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description?: string;
  requireReason?: boolean;
  requireHourlyRate?: boolean;
  confirmText: string;
  onClose: () => void;
  onConfirm: (result: Result) => void;
}) {
  const t = useT();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [processing, setProcessing] = useState(false);

  const canConfirm = useMemo(() => {
    if (!photoDataUrl) return false;
    if (requireReason && !reason.trim()) return false;
    if (requireHourlyRate && !hourlyRate.trim()) return false;
    return true;
  }, [hourlyRate, photoDataUrl, reason, requireHourlyRate, requireReason]);

  useEffect(() => {
    if (!open) return;
    setCameraError(null);
    setPhotoDataUrl(null);
    setReason("");
    setHourlyRate("");
    setProcessing(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!("mediaDevices" in navigator) || typeof navigator.mediaDevices.getUserMedia !== "function") {
      setCameraError(t("punch.cameraUnsupported"));
      return;
    }
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then(stream => {
        if (cancelled) return;
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          v.play().catch(() => undefined);
        }
      })
      .catch(() => {
        setCameraError(t("punch.cameraDenied"));
      });
    return () => {
      cancelled = true;
      const s = streamRef.current;
      if (s) s.getTracks().forEach(tr => tr.stop());
      streamRef.current = null;
    };
  }, [open, t]);

  const takeShot = async () => {
    const v = videoRef.current;
    if (!v) return;
    const vw = v.videoWidth || 0;
    const vh = v.videoHeight || 0;
    if (!vw || !vh) return;
    const targetW = Math.min(MAX_IMAGE_SIDE, vw);
    const targetH = Math.round((targetW / vw) * vh);
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, targetW, targetH);
    setProcessing(true);
    try {
      const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
      setPhotoDataUrl(await compressImageSrc(dataUrl));
    } finally {
      setProcessing(false);
    }
  };

  const handleFileChange = (file?: File | null) => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setProcessing(true);
    const readPhoto = shouldUseOriginalImageFile(file)
      ? readFileAsDataUrl(file)
      : compressImageSrc(objectUrl).catch(() => readFileAsDataUrl(file));

    readPhoto
      .then(dataUrl => {
        setPhotoDataUrl(dataUrl);
      })
      .finally(() => {
        URL.revokeObjectURL(objectUrl);
        setProcessing(false);
      });
  };

  return (
    <Dialog
      open={open}
      title={title}
      description={description}
      onClose={() => {
        const s = streamRef.current;
        if (s) s.getTracks().forEach(tr => tr.stop());
        streamRef.current = null;
        onClose();
      }}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t("action.cancel")}
          </Button>
          <Button
            disabled={!canConfirm || processing}
            onClick={() => {
              if (!photoDataUrl) return;
              onConfirm({
                photoDataUrl,
                capturedAtISO: new Date().toISOString(),
                reason: requireReason ? reason.trim() : undefined,
                hourlyRate: requireHourlyRate ? hourlyRate.trim() : undefined,
              });
            }}
          >
            {confirmText}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4">
        <div className="overflow-hidden rounded-2xl border border-zinc-900/60 bg-zinc-950/30">
          {cameraError ? (
            <div className="p-4 text-sm text-rose-200">{cameraError}</div>
          ) : processing ? (
            <div className="flex h-64 items-center justify-center p-4 text-sm text-zinc-300">{t("punch.processing")}</div>
          ) : photoDataUrl ? (
            <img src={photoDataUrl} alt={t("punch.photoAlt")} className="h-64 w-full object-cover" />
          ) : (
            <video ref={videoRef} muted playsInline className="h-64 w-full object-cover" />
          )}
        </div>

        {!cameraError ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void takeShot()} disabled={Boolean(photoDataUrl) || processing}>
              {t("punch.takePhoto")}
            </Button>
            <PhotoPickerButton label={t("punch.uploadAlbum")} disabled={processing} onFileChange={handleFileChange} />
            <Button
              variant="secondary"
              onClick={() => setPhotoDataUrl(null)}
              disabled={!photoDataUrl || processing}
            >
              {t("punch.retake")}
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <PhotoPickerButton label={t("punch.uploadPhoto")} disabled={processing} capture="user" onFileChange={handleFileChange} />
            <PhotoPickerButton label={t("punch.uploadAlbum")} disabled={processing} onFileChange={handleFileChange} />
          </div>
        )}

        {requireReason ? (
          <div className="grid gap-2">
            <div className="text-xs font-medium text-zinc-300">{t("employee.requests.overtimeReason")}</div>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder={t("employee.requests.overtimeReasonPH")} />
          </div>
        ) : null}

        {requireHourlyRate ? (
          <div className="grid gap-2">
            <div className="text-xs font-medium text-zinc-300">{t("employee.requests.overtimeHourlyRate")}</div>
            <Input type="number" step="0.01" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} placeholder={t("employee.requests.overtimeHourlyRatePH")} />
          </div>
        ) : null}

        <div className="text-xs text-zinc-500">
          {processing ? t("punch.compressHint") : cameraError ? t("punch.uploadFallbackHint") : t("punch.photoRequiredHint")}
        </div>
      </div>
    </Dialog>
  );
}
