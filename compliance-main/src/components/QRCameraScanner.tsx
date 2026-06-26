/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { Camera, X, Upload, CheckCircle, AlertTriangle, RefreshCw, RefreshCcw, Video } from 'lucide-react';

interface QRCameraScannerProps {
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

export default function QRCameraScanner({ onClose, onScanSuccess }: QRCameraScannerProps) {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string>('');
  const [manualFileResult, setManualFileResult] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number | null>(null);

  // Load available video input devices
  useEffect(() => {
    async function getDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputDevices = devices.filter(device => device.kind === 'videoinput');
        setVideoDevices(videoInputDevices);
        
        if (videoInputDevices.length > 0) {
          // Default to first camera (prefer environment/back camera if available)
          const backCamera = videoInputDevices.find(device => 
            device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('environment')
          );
          setSelectedDeviceId(backCamera ? backCamera.deviceId : videoInputDevices[0].deviceId);
        }
      } catch (err) {
        console.warn('Error listing video input devices:', err);
      }
    }

    getDevices();
  }, []);

  // Control camera stream based on selectedDeviceId
  useEffect(() => {
    if (!selectedDeviceId) return;
    
    let active = true;
    stopCamera();

    async function startCamera() {
      try {
        setScanError('');
        const constraints = {
          video: {
            deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
            facingMode: selectedDeviceId ? undefined : 'environment'
          }
        };
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (deviceError) {
          console.warn('Exact deviceId constraint failed. Falling back to simple default video input...', deviceError);
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
          });
        }
        
        if (!active) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS
          videoRef.current.play().catch(playErr => {
            console.warn('Auto-play blocked by browser. User interaction might be required:', playErr);
          });
          setIsScanning(true);
          setHasCameraPermission(true);
        }
      } catch (err: any) {
        console.error('Failed to access camera device:', err);
        setHasCameraPermission(false);
        setScanError(
          'Could not start camera. Permissions might be denied, or the device is busy. Try uploading an image below instead!'
        );
      }
    }

    startCamera();

    return () => {
      active = false;
      stopCamera();
    };
  }, [selectedDeviceId]);

  // Clean stop helper
  const stopCamera = () => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  // Live scan loop
  useEffect(() => {
    if (!isScanning) return;

    const canvas = canvasRef.current || document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;

    const tick = () => {
      if (video && video.readyState >= 2 && ctx) {
        const width = video.videoWidth;
        const height = video.videoHeight;
        
        if (width > 0 && height > 0) {
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(video, 0, 0, width, height);
          
          const imageData = ctx.getImageData(0, 0, width, height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            // Success! Draw highlighting box
            drawRect(ctx, code.location.topLeftCorner, code.location.bottomRightCorner);
            stopCamera();
            
            // Tiny delayed feedback before callback
            setTimeout(() => {
              onScanSuccess(code.data);
            }, 400);
            return;
          }
        }
      }
      requestRef.current = requestAnimationFrame(tick);
    };

    requestRef.current = requestAnimationFrame(tick);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isScanning, onScanSuccess]);

  const drawRect = (ctx: CanvasRenderingContext2D, topLeft: any, bottomRight: any) => {
    ctx.beginPath();
    ctx.moveTo(topLeft.x, topLeft.y);
    ctx.lineTo(bottomRight.x, topLeft.y);
    ctx.lineTo(bottomRight.x, bottomRight.y);
    ctx.lineTo(topLeft.x, bottomRight.y);
    ctx.closePath();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#10b981'; // Success green
    ctx.stroke();
  };

  // Decode uploaded image files containing QR codes
  const handleFileDecode = (file: File) => {
    if (!file) return;
    setScanError('');
    setManualFileResult('');

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);

        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          onScanSuccess(code.data);
        } else {
          setScanError('Could not locate or decode any valid QR code stamp in this picture. Check clarity and retry!');
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileDecode(e.target.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[200] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border-2 border-slate-200 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative animate-fade-in my-auto flex flex-col font-sans">
        
        {/* Banner Header */}
        <div className="bg-[#dc2626] text-white p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 animate-pulse text-white" />
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider leading-none">
                Bureau Decal Optical Scanner
              </h3>
              <span className="text-[9px] text-[#fecaca] font-mono block mt-1 uppercase leading-none font-bold">
                Direct Browser Video Receiver
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-red-800 p-1.5 rounded transition cursor-pointer"
            title="Close Decoder"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Decoder Interface Panel */}
        <div className="p-5 space-y-4 flex-1">
          
          {/* Diagnostic Warnings & Instructions */}
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-850 rounded-lg text-[10.5px] leading-relaxed font-sans space-y-1">
            <span className="font-extrabold block text-amber-900">💡 Field Tip for AI Studio Containers:</span>
            <p>
              Under secure sandboxes, physical phone barcode apps might block anonymous redirects. 
              <strong> You can test scanning instantly by using this on-screen webcam reader or uploading a decal photo below!</strong>
            </p>
          </div>

          {/* Camera Viewport or Error */}
          <div className="relative aspect-square max-w-[280px] mx-auto border-4 border-[#dc2626] bg-slate-900 rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
            
            {hasCameraPermission === false || scanError ? (
              <div className="absolute inset-0 p-4 flex flex-col items-center justify-center text-center bg-slate-900 text-slate-300">
                <AlertTriangle className="w-10 h-10 text-amber-500 mb-2 animate-bounce" />
                <span className="text-[11px] font-mono leading-relaxed text-slate-400">
                  {scanError || 'Webcam feed inactive.'}
                </span>
              </div>
            ) : (
              <>
                {/* Red Laser Scanning Ring Effect */}
                <div 
                  className="absolute left-0 w-full h-1 bg-red-600 shadow shadow-red-500 z-10 pointer-events-none" 
                  style={{ 
                    animation: 'scanLineEffectBureau 2.4s infinite linear' 
                  }}
                />
                
                <video 
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className="w-full h-full object-cover select-none"
                />
              </>
            )}
            
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Multi-Camera Selector Trigger */}
          {videoDevices.length > 1 && (
            <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <label htmlFor="camera-source-select" className="block text-[9px] text-slate-500 font-bold uppercase font-mono leading-none">
                Select Hardware Lens:
              </label>
              <div className="flex items-center gap-2">
                <Video className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  id="camera-source-select"
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="w-full bg-white border border-slate-250 rounded px-2 py-1 text-[11px] font-sans font-bold text-slate-800 focus:outline-none"
                >
                  {videoDevices.map((device, index) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${index + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Alternative File Drop Uploader Zone */}
          <div className="space-y-2">
            <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider font-sans text-center">
              — OR UPLOAD COMPLIANCE TAG PHOTOGRAPH —
            </span>
            
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleFileDecode(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => document.getElementById('qr-camera-file-input')?.click()}
              className={`p-4 border-2 border-dashed rounded-xl text-center transition cursor-pointer select-none space-y-1.5 h-24 flex flex-col justify-center items-center ${
                dragOver 
                  ? 'border-emerald-500 bg-emerald-50/50 text-emerald-800' 
                  : 'border-slate-300 hover:border-[#dc2626] bg-slate-50/50 hover:bg-slate-50 text-slate-500'
              }`}
            >
              <input
                id="qr-camera-file-input"
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
              />
              <Upload className="w-5 h-5 shrink-0 text-slate-400" />
              <div>
                <span className="text-[11px] font-bold block leading-none">
                  Drag & Drop decalled/printed tag photo
                </span>
                <span className="text-[9px] text-slate-400 font-mono mt-1 block">
                  Supports JPG, PNG with visible QR box
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Interface Footer copyright */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 text-center shrink-0 flex items-center justify-between">
          <span className="text-[9px] font-mono text-slate-400 uppercase">
            NJ Optical Verification System
          </span>
          <button
            onClick={onClose}
            className="py-1 px-3 bg-slate-800 hover:bg-black text-white text-[10px] font-bold uppercase rounded cursor-pointer leading-none"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}
