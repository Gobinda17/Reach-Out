"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { emptyCustomer, extractTagCode } from "@/lib/customer";
import { CustomerForm } from "@/components/CustomerForm";
import { QrIcon } from "@/components/icons";

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
  const [customer, setCustomer] = useState(null);

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
        setDecodeError("This QR code isn't a Kavach tag QR code.");
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
        setCustomer({ ...emptyCustomer, ...data });
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
    setCustomer(null);
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
    setCustomer(null);
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
        className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-sky-100 to-indigo-100 opacity-70 blur-3xl dark:from-sky-950/30 dark:to-indigo-950/40"
      />
      <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
        <div className="flex flex-col gap-2">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300">
            <QrIcon className="h-3.5 w-3.5" />
            Scan a tag
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Look up a customer QR
          </h1>
          <p className="max-w-lg text-sm text-slate-500 dark:text-slate-400">
            Scan a previously generated tag with your camera, or upload an image of it, to fill
            the customer details form below.
          </p>
        </div>

        <div className="grid gap-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-indigo-900/5 sm:grid-cols-2 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4">
            <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
              <video
                ref={videoRef}
                muted
                playsInline
                className={`h-full w-full object-cover ${scanning ? "block" : "hidden"}`}
              />
              {!scanning && (
                <p className="px-6 text-center text-sm text-slate-400">
                  {cameraError ?? "Start the camera or upload an image containing a QR code."}
                </p>
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
                  className="rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-indigo-600/25 transition-transform hover:-translate-y-0.5 hover:shadow-md"
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
            {tagCode && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Tag code{" "}
                <span className="rounded-md bg-indigo-50 px-2 py-0.5 font-mono font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                  {tagCode}
                </span>
              </p>
            )}
            {customer ? (
              <CustomerForm value={customer} onChange={setCustomer} />
            ) : (
              <p className="text-sm text-slate-400">
                {lookingUp
                  ? "Looking up this tag…"
                  : "Decoded customer details will appear here once a QR code is scanned."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
