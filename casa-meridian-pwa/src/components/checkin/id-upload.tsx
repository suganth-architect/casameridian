"use client";

import { useState } from "react";
import { Loader2, Upload, CheckCircle, FileText, ImagePlus, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface IdUploadProps {
    bookingId: string;
    kycStatus: string;
    onUploadComplete: (status: string) => void;
}

export function IdUpload({ bookingId, kycStatus, onUploadComplete }: IdUploadProps) {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const isVerified = kycStatus === 'verified';

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setErrorMsg(null);

            // Create preview
            if (selectedFile.type.startsWith('image/')) {
                const url = URL.createObjectURL(selectedFile);
                setPreviewUrl(url);
            } else {
                setPreviewUrl(null); // PDF or other
            }
        }
    };

    const handleUpload = async () => {
        if (!file || isVerified) return;

        setUploading(true);
        setProgress(10); // Start progress
        setErrorMsg(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('bookingId', bookingId);
            formData.append('docType', 'aadhaar'); // Defaulting to generic

            // Simulate progress for better UX
            const progressInterval = setInterval(() => {
                setProgress(prev => Math.min(prev + 10, 90));
            }, 300);

            const res = await fetch('/api/check-in/upload-kyc', {
                method: 'POST',
                body: formData
            });

            clearInterval(progressInterval);
            setProgress(100);

            if (!res.ok) {
                const err = await res.json();
                if (res.status === 400) throw new Error(err.error || "Invalid file. Please check size/type.");
                if (res.status === 404) throw new Error("Booking session expired. Please refresh.");
                if (res.status === 409) throw new Error("Booking is not in a valid state for upload.");
                throw new Error("Upload failed. Please try again.");
            }

            const data = await res.json();
            onUploadComplete(data.status || 'submitted');

        } catch (error: any) {
            console.error("Error uploading ID:", error);
            setErrorMsg(error.message || "Failed to upload ID.");
            setProgress(0);
        } finally {
            setUploading(false);
        }
    };

    const clearFile = () => {
        setFile(null);
        setPreviewUrl(null);
        setErrorMsg(null);
    };

    if (isVerified) {
        return (
            <div className="text-center p-8 bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-100 dark:border-green-900/30">
                <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-green-900 dark:text-green-100">Identity Verified</h3>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Your documents have been verified. No further action is needed.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center mb-2">
                <h3 className="text-2xl font-light text-stone-900 dark:text-stone-50 font-serif">ID Verification</h3>
                <p className="text-stone-500 dark:text-stone-400 mt-2 text-sm leading-relaxed max-w-xs mx-auto">
                    Upload a clear photo of your Government ID (Aadhaar, Passport, or License).
                </p>
            </div>

            {errorMsg && (
                <div className="animate-in fade-in zoom-in duration-300 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 rounded-xl p-4 flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                        <h4 className="font-medium text-red-900 dark:text-red-100 text-sm">Upload Failed</h4>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-0.5">{errorMsg}</p>
                    </div>
                </div>
            )}

            <div className="flex flex-col items-center justify-center">
                {!file ? (
                    <label className={cn(
                        "group relative w-full aspect-video md:aspect-[2/1] max-w-lg border-2 border-dashed rounded-[1.5rem] cursor-pointer transition-all duration-300 flex flex-col items-center justify-center p-6",
                        "border-stone-200 dark:border-zinc-800 bg-stone-50/50 dark:bg-zinc-900",
                        "hover:border-meridian-gold/50 hover:bg-white dark:hover:bg-zinc-800"
                    )}>
                        <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            disabled={uploading}
                        />
                        <div className="w-16 h-16 rounded-full bg-stone-100 dark:bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 mb-4 text-stone-400 group-hover:text-meridian-gold">
                            <Upload className="h-8 w-8" />
                        </div>
                        <p className="font-medium text-stone-900 dark:text-stone-200">
                            Click to Upload ID
                        </p>
                        <p className="text-xs text-stone-400 mt-1">
                            JPG, PNG or PDF (Max 5MB)
                        </p>
                    </label>
                ) : (
                    <div className="relative w-full max-w-lg overflow-hidden rounded-[1.5rem] border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl">
                        <button
                            onClick={clearFile}
                            disabled={uploading}
                            className="absolute top-3 right-3 z-20 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
                        >
                            <XCircle className="h-6 w-6" />
                        </button>

                        <div className="aspect-video w-full bg-stone-100 dark:bg-black/50 flex items-center justify-center relative">
                            {previewUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                            ) : (
                                <div className="flex flex-col items-center text-stone-400">
                                    <FileText className="h-16 w-16 mb-2" />
                                    <span className="text-sm font-medium">{file.name}</span>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-stone-100 dark:border-zinc-800">
                            {!uploading ? (
                                <div className="flex items-center justify-between">
                                    <div className="text-sm truncate max-w-[200px] text-stone-600 dark:text-stone-300 font-medium">
                                        {file.name}
                                    </div>
                                    <div className="text-xs text-stone-400">
                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-stone-500 font-medium uppercase tracking-wider">
                                        <span>Uploading...</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-stone-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-meridian-gold transition-all duration-300 ease-out"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className={cn(
                    "w-full py-6 rounded-xl font-medium text-base shadow-lg transition-all duration-300",
                    !file || uploading
                        ? "bg-stone-100 dark:bg-zinc-800 text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-800 shadow-none cursor-not-allowed"
                        : "bg-gradient-to-r from-meridian-gold to-amber-600 text-white hover:shadow-meridian-gold/30 hover:scale-[1.01]"
                )}
            >
                {uploading ? (
                    <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Verifying & Uploading...
                    </>
                ) : (
                    "Submit Verification"
                )}
            </Button>
        </div>
    );
}
