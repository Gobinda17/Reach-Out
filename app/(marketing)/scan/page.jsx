"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { extractTagCode } from "@/lib/customer";
import { ContactOwnerForm } from "@/components/ContactOwnerForm";
import { StepLabel } from "@/components/StepLabel";
import { QrIcon, CameraIcon, ShieldIcon } from "@/components/icons";

export default function ScanPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);

  const [scanning, setScanning] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [decodeError, setDecodeError] = useState(null);
  const [tagCode, setTagCode] = useState(null);
  const [tagInfo, setTagInfo] = useState(null);

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const handleDecoded = useCallback(
    async (raw) => {
      const code = extractTagCode(raw);
      if (!code) {
        setDecodeError("This QR code isn't a Reach-Out tag QR code.");
        return;
      }
      stopCamera();
      setDecodeError(null);
      setLookingUp(true);
      try {
        const res = await fetch(`/api/tags/${code}`);
        if (!res.ok) {
          setDecodeError(`No customer found for tag ${code}.`);
          return;
        }
        const data = await res.json();
        setTagCode(code);
        setTagInfo(data);
      } catch {
        setDecodeError("Could not reach the server to look up this tag.");
      } finally {
        setLookingUp(false);
      }
    },
    [stopCamera]
  );

  async function startCamera() {
    setCameraError(null);
    setDecodeError(null);
    setTagInfo(null);
    setTagCode(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);

      const tick = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const result = jsQR(imageData.data, imageData.width, imageData.height);

        if (result) {
          handleDecoded(result.data);
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setCameraError("Could not access the camera. Check permissions, or upload an image instead.");
    }
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setDecodeError(null);
    setTagInfo(null);
    setTagCode(null);

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const result = jsQR(imageData.data, imageData.width, imageData.height);
          if (result) {
            handleDecoded(result.data);
          } else {
            setDecodeError("No QR code found in that image.");
          }
        }
      }
      URL.revokeObjectURL(objectUrl);
    };
    img.onerror = () => {
      setDecodeError("Could not read that image file.");
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;
  }

  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-yellow-100 to-amber-50 opacity-70 blur-3xl dark:from-yellow-500/10 dark:to-transparent"
      />
      <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
        <div className="flex flex-col gap-2">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-yellow-300 bg-yellow-50 px-3 py-1 text-xs font-medium text-amber-800 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-300">
            <QrIcon className="h-3.5 w-3.5" />
            Scan a tag
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Look up a tag
          </h1>
          <p className="max-w-lg text-sm text-slate-500 dark:text-slate-400">
            Scan a previously generated tag with your camera, or upload an image of it. You&apos;ll
            see the same privacy-safe card a stranger would — no name or number, just a way to
            message the owner.
          </p>
        </div>

        <div className="grid gap-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-black/5 sm:grid-cols-2 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4">
            <StepLabel n={1}>Scan or upload</StepLabel>
            <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
              <video
                ref={videoRef}
                muted
                playsInline
                className={`h-full w-full object-cover ${scanning ? "block" : "hidden"}`}
              />
              {!scanning && (
                <div className="flex flex-col items-center gap-2 px-6 text-center">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                    <CameraIcon className="h-4.5 w-4.5" />
                  </span>
                  <p className="text-sm text-slate-400">
                    {cameraError ?? "Point your camera at a Reach-Out QR code, or upload a photo of one."}
                  </p>
                </div>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />

            <div className="flex flex-wrap gap-3">
              {scanning ? (
                <button
                  onClick={stopCamera}
                  className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Stop camera
                </button>
              ) : (
                <button
                  onClick={startCamera}
                  className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-yellow-400 shadow-sm shadow-black/20 transition-transform hover:-translate-y-0.5 hover:bg-zinc-900 hover:shadow-md"
                >
                  Start camera
                </button>
              )}
              <label className="cursor-pointer rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                Upload image
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
            {decodeError && <p className="text-sm text-rose-500">{decodeError}</p>}
          </div>

          <div className="flex flex-col gap-3">
            <StepLabel n={2}>Contact card</StepLabel>
            {tagCode && tagInfo && (
              <div className="flex items-center gap-2 rounded-lg bg-yellow-50 px-3 py-2 text-xs font-medium text-amber-800 dark:bg-yellow-500/10 dark:text-yellow-300">
                <ShieldIcon className="h-3.5 w-3.5 shrink-0" />
                Tag found —{" "}
                <span className="rounded bg-white/70 px-1.5 py-0.5 font-mono dark:bg-black/30">{tagCode}</span>
              </div>
            )}
            {tagInfo ? (
              <div className="flex flex-col gap-3">
                {(tagInfo.vehicleReg || tagInfo.vehicleMakeModel) && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-800/60">
                    {tagInfo.vehicleReg && (
                      <p className="font-medium tracking-widest text-slate-700 dark:text-slate-200">
                        {tagInfo.vehicleReg}
                      </p>
                    )}
                    {tagInfo.vehicleMakeModel && (
                      <p className="text-slate-500 dark:text-slate-400">{tagInfo.vehicleMakeModel}</p>
                    )}
                  </div>
                )}
                <p className="text-xs text-slate-400">
                  The owner&apos;s name and phone number are never shown — not even here.
                </p>
                <ContactOwnerForm code={tagCode} />
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                {lookingUp
                  ? "Looking up this tag…"
                  : "Once step 1 finds a tag, its contact card will appear here."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
