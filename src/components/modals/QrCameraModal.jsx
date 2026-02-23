import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import Button from '../ui/Button';

const QrCameraModal = ({ open, onClose, onDetect, error }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    let stopped = false;
    async function startCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          onDetect(null, 'Seu navegador não suporta acesso à câmera.');
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        if ('BarcodeDetector' in window) {
          const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
          scanTimerRef.current = setInterval(async () => {
            if (!videoRef.current) return;
            try {
              const codes = await detector.detect(videoRef.current);
              if (codes && codes.length > 0) {
                const value = codes[0]?.rawValue || '';
                if (value) {
                  onDetect(value);
                  stopCamera();
                }
              }
            } catch (error) {}
          }, 450);
        } else {
          onDetect(null, 'Este navegador não lê QR automaticamente; use leitor externo ou cole o código.');
        }
      } catch (err) {
        onDetect(null, 'Não foi possível acessar a câmera. No celular, use HTTPS/localhost e permita permissão.');
      }
    }
    function stopCamera() {
      if (scanTimerRef.current) {
        clearInterval(scanTimerRef.current);
        scanTimerRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
    startCamera();
    return () => {
      stopped = true;
      stopCamera();
    };
  }, [open, onDetect]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl border border-cyan-500/40 w-full max-w-md p-6 shadow-2xl animate-fade-in flex flex-col items-center">
        <div className="flex justify-between items-center w-full mb-4">
          <h3 className="text-white font-bold text-lg">Leitura QR Code</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24}/></button>
        </div>
        <video ref={videoRef} className="w-full max-h-[260px] rounded object-cover bg-black" playsInline muted />
        {error && <p className="mt-2 text-xs text-amber-300 font-semibold">{error}</p>}
        <Button onClick={onClose} variant="secondary" className="mt-4 w-full">Fechar</Button>
      </div>
    </div>
  );
};

export default QrCameraModal;
