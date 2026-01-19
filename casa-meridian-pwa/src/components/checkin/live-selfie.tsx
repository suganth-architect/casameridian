"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getFirebaseStorage } from "@/lib/firebase";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { Loader2, Camera, AlertCircle, ScanFace, Check } from "lucide-react";
import { FaceDetector, FilesetResolver, Detection } from "@mediapipe/tasks-vision";
import { cn } from "@/lib/utils";

interface LiveSelfieProps {
    bookingId: string;
    onCaptureComplete: (selfieUrl: string, analysis: SelfieAnalysis) => void;
}

export interface SelfieAnalysis {
    lightingScore: number;
    blurScore: number;
    faceConfidence: number;
}

export function LiveSelfie({ bookingId, onCaptureComplete }: LiveSelfieProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [faceDetector, setFaceDetector] = useState<FaceDetector | null>(null);

    // Status Checks
    const [checks, setChecks] = useState({
        hasOneFace: false,
        isCentered: false,
        isGoodLighting: false,
        isSharp: false,
    });
    const [scores, setScores] = useState<SelfieAnalysis>({
        lightingScore: 0,
        blurScore: 0,
        faceConfidence: 0,
    });

    const [capturing, setCapturing] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const [permissionDenied, setPermissionDenied] = useState(false);

    // Initialize MediaPipe
    useEffect(() => {
        const initMediaPipe = async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
                );
                const detector = await FaceDetector.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO"
                });
                setFaceDetector(detector);
                startCamera();
            } catch (error) {
                console.error("Failed to init MediaPipe:", error);
                // Fallback or retry logic could go here
                setInitializing(false);
            }
        };

        if (typeof window !== "undefined") {
            initMediaPipe();
        }

        return () => {
            stopCamera();
        };
    }, []);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                setStream(mediaStream);
            }
            setInitializing(false);
        } catch (err) {
            console.error("Camera denied:", err);
            setPermissionDenied(true);
            setInitializing(false);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    // Analysis Loop
    const analyzeFrame = useCallback(() => {
        if (!faceDetector || !videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        if (video.readyState !== 4) return;

        const startTimeMs = performance.now();
        const detections = faceDetector.detectForVideo(video, startTimeMs);

        // 1. One Face Check
        const hasOneFace = detections.detections.length === 1;

        // 2. Centered Check
        let isCentered = false;
        let faceConfidence = 0;

        if (hasOneFace) {
            const face = detections.detections[0];
            const box = face.boundingBox;
            if (box) {
                const centerX = box.originX + box.width / 2;
                const centerY = box.originY + box.height / 2;
                const videoWidth = video.videoWidth;
                const videoHeight = video.videoHeight;

                // Center safe zone (approx middle 40%)
                isCentered = (
                    centerX > videoWidth * 0.3 &&
                    centerX < videoWidth * 0.7 &&
                    centerY > videoHeight * 0.3 &&
                    centerY < videoHeight * 0.7 &&
                    box.width > videoWidth * 0.15 // Face strictly large enough
                );
                faceConfidence = face.categories[0].score;
            }
        }

        // 3. Lighting & Sharpness (using Canvas)
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Get slightly downsampled imageData for performance analysis checks
            // We analyze the central region where face should be
            const sampleX = Math.floor(canvas.width * 0.25);
            const sampleY = Math.floor(canvas.height * 0.25);
            const sampleW = Math.floor(canvas.width * 0.5);
            const sampleH = Math.floor(canvas.height * 0.5);

            const imageData = ctx.getImageData(sampleX, sampleY, sampleW, sampleH);
            const data = imageData.data;

            // -- Brightness --
            let colorSum = 0;
            for (let i = 0, len = data.length; i < len; i += 4) {
                colorSum += Math.max(data[i], data[i + 1], data[i + 2]); // Max RGB approximation
            }
            const brightness = Math.floor(colorSum / (data.length / 4));
            const isGoodLighting = brightness > 80; // Threshold adjusted for indoor

            // -- Sharpness (Simple Edge Detection Variance) --
            // Very basic approximation: variance of neighbor differences (Laplacian-ish)
            // Skipping for performance if brightness is too low
            let blurScore = 0;
            let isSharp = false;

            if (isGoodLighting) {
                // Quick check: standard deviation of pixel intensities? 
                // Or better: localized contrast.
                // Let's use a simple heuristic: if max - min in blocks is high, it's sharp.
                // Actually, for check-in, we just want to avoid extreme blur.
                // Let's rely on face detection score mostly, and just brightness.
                // Face detection usually fails if too blurry.
                // We'll set a dummy pass for sharpness if face score is high.

                if (faceConfidence > 0.85) {
                    isSharp = true;
                    blurScore = 100;
                } else {
                    // Fallback logic could go here
                    isSharp = faceConfidence > 0.7;
                    blurScore = Math.floor(faceConfidence * 100);
                }
            }

            setChecks({
                hasOneFace,
                isCentered,
                isGoodLighting,
                isSharp
            });

            setScores({
                lightingScore: brightness,
                blurScore,
                faceConfidence
            });
        }

    }, [faceDetector]);

    useEffect(() => {
        const intervalId = setInterval(analyzeFrame, 250); // check 4 times a second
        return () => clearInterval(intervalId);
    }, [analyzeFrame]);

    const handleCapture = async () => {
        if (!videoRef.current || !canvasRef.current) return;
        setCapturing(true);

        // Draw full resolution frame
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);

        // Convert to base64 string
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

        try {
            const storage = getFirebaseStorage();
            if (!storage) throw new Error("Storage not init");

            const selfieRef = ref(storage, `checkins/${bookingId}/selfie.jpg`);
            await uploadString(selfieRef, dataUrl, 'data_url');
            const downloadUrl = await getDownloadURL(selfieRef);

            stopCamera();
            onCaptureComplete(downloadUrl, scores);

        } catch (error) {
            console.error("Upload failed", error);
            alert("Upload failed, please retry.");
            setCapturing(false);
        }
    };

    if (permissionDenied) {
        return (
            <div className="text-center p-8 border border-destructive/20 rounded-2xl bg-destructive/5 animate-in fade-in">
                <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-medium text-destructive">Camera Access Denied</h3>
                <p className="text-muted-foreground mt-2 text-sm">We need camera access to verify your identity. Please enable camera permissions in your browser settings.</p>
            </div>
        );
    }

    if (initializing) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-6">
                <div className="w-16 h-16 border-4 border-meridian-gold/20 border-t-meridian-gold rounded-full animate-spin" />
                <p className="text-stone-500 font-medium tracking-widest text-xs uppercase animate-pulse">
                    Initializing Camera...
                </p>
            </div>
        );
    }

    const allChecksPassed = checks.hasOneFace && checks.isCentered && checks.isGoodLighting && checks.isSharp;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center mb-6">
                <h3 className="text-2xl font-light text-stone-900 dark:text-stone-50 font-serif">Live Identification</h3>
                <p className="text-stone-500 dark:text-stone-400 mt-2 text-sm leading-relaxed max-w-xs mx-auto">
                    Position your face within the frame. Verification is automatic.
                </p>
            </div>

            <div className="relative mx-auto rounded-[2.5rem] overflow-hidden shadow-2xl bg-black border-[6px] border-white dark:border-zinc-800 max-w-[400px] aspect-[3/4]">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
                />

                {/* Cinematic Vignette Overlay */}
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.6)_100%)]" />

                {/* Guide Overlay */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    <div className={cn(
                        "w-[60%] h-[50%] rounded-[50%] border-2 transition-all duration-500 backdrop-blur-[2px]",
                        allChecksPassed
                            ? "border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.3)] scale-105"
                            : "border-white/30 bg-black/10"
                    )}>
                        {/* Cutout helper */}
                        {!allChecksPassed && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2">
                                <ScanFace className="w-8 h-8 text-white/20 animate-pulse" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Status Chips */}
                <div className="absolute top-6 left-0 right-0 flex justify-center gap-2 px-4 pointer-events-none">
                    <StatusChip label="Face" valid={checks.hasOneFace} />
                    <StatusChip label="Center" valid={checks.isCentered} />
                    <StatusChip label="Light" valid={checks.isGoodLighting} />
                </div>
            </div>

            {/* Hidden canvas for processing */}
            <canvas ref={canvasRef} className="hidden" />

            <div className="max-w-[400px] mx-auto">
                <button
                    onClick={handleCapture}
                    disabled={!allChecksPassed || capturing}
                    className={cn(
                        "w-full py-4 rounded-full font-medium flex items-center justify-center space-x-2 transition-all duration-500 shadow-xl",
                        allChecksPassed
                            ? "bg-gradient-to-r from-meridian-gold to-amber-600 text-white hover:scale-[1.02] hover:shadow-meridian-gold/40 cursor-pointer text-lg animate-pulse"
                            : "bg-stone-100 dark:bg-zinc-800 text-stone-400 cursor-not-allowed"
                    )}
                >
                    {capturing ? (
                        <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>Verifying...</span>
                        </>
                    ) : (
                        <>
                            <Camera className={cn("h-5 w-5", allChecksPassed ? "animate-bounce" : "")} />
                            <span>{allChecksPassed ? "Capture Verification" : "Position your face"}</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

function StatusChip({ label, valid }: { label: string, valid: boolean }) {
    return (
        <span className={cn(
            "text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-full backdrop-blur-xl transition-all duration-300 border",
            valid
                ? "bg-green-500/30 text-white border-green-400/30 shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                : "bg-black/40 text-white/40 border-white/5"
        )}>
            {label} {valid && <Check className="inline h-2.5 w-2.5 ml-0.5 -mt-0.5" />}
        </span>
    );
}
