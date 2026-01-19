"use client";

import { useState } from "react";
import { Loader2, Upload, CheckCircle, FileText, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface IdUploadProps {
    bookingId: string;
    onUploadComplete: (frontUrl: string, backUrl?: string) => void;
}

export function IdUpload({ bookingId, onUploadComplete }: IdUploadProps) {
    const [frontFile, setFrontFile] = useState<File | null>(null);
    const [backFile, setBackFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, side: "front" | "back") => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (side === "front") setFrontFile(file);
            else setBackFile(file);
        }
    };

    const handleUpload = async () => {
        if (!frontFile) return;

        setUploading(true);

        try {
            // Upload Front
            const frontData = new FormData();
            frontData.append('file', frontFile);
            frontData.append('bookingId', bookingId);
            frontData.append('docType', 'aadhaar'); // Defaulting to aadhaar/id for now, could be dynamic

            const frontRes = await fetch('/api/check-in/upload-kyc', {
                method: 'POST',
                body: frontData
            });

            if (!frontRes.ok) {
                const err = await frontRes.json();
                throw new Error(err.error || "Upload failed");
            }

            const frontJson = await frontRes.json();
            const frontUrl = frontJson.url;

            let backUrl: string | undefined = undefined;

            // Upload Back (Optional)
            if (backFile) {
                const backData = new FormData();
                backData.append('file', backFile);
                backData.append('bookingId', bookingId);
                backData.append('docType', 'aadhaar'); // Same type

                const backRes = await fetch('/api/check-in/upload-kyc', {
                    method: 'POST',
                    body: backData
                });

                if (backRes.ok) {
                    const backJson = await backRes.json();
                    backUrl = backJson.url;
                }
            }

            onUploadComplete(frontUrl, backUrl);
        } catch (error: any) {
            console.error("Error uploading ID:", error);
            alert(error.message || "Failed to upload ID. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center mb-6">
                <h3 className="text-2xl font-light text-stone-900 dark:text-stone-50 font-serif">ID Verification</h3>
                <p className="text-stone-500 dark:text-stone-400 mt-2 text-sm leading-relaxed max-w-xs mx-auto">
                    Please upload a clear photo of your government-issued ID (Passport, Driver License, or National ID).
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Front Side */}
                <UploadCard
                    label="Front Side"
                    subLabel="Required"
                    file={frontFile}
                    onChange={(e) => handleFileChange(e, "front")}
                    disabled={uploading}
                    required
                />

                {/* Back Side */}
                <UploadCard
                    label="Back Side"
                    subLabel="Optional"
                    file={backFile}
                    onChange={(e) => handleFileChange(e, "back")}
                    disabled={uploading}
                />
            </div>

            <button
                onClick={handleUpload}
                disabled={!frontFile || uploading}
                className={cn(
                    "w-full py-4 rounded-2xl font-medium mt-8 flex items-center justify-center space-x-2 transition-all duration-300 shadow-lg",
                    !frontFile || uploading
                        ? "bg-stone-100 dark:bg-zinc-800 text-stone-400 cursor-not-allowed shadow-none"
                        : "bg-gradient-to-r from-meridian-gold to-amber-600 text-white hover:shadow-meridian-gold/30 hover:scale-[1.01]"
                )}
            >
                {uploading ? (
                    <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Verifying Documents...</span>
                    </>
                ) : (
                    <span>Continue to Selfie</span>
                )}
            </button>
        </div>
    );
}

function UploadCard({
    label,
    subLabel,
    file,
    onChange,
    disabled,
    required
}: {
    label: string,
    subLabel: string,
    file: File | null,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    disabled: boolean,
    required?: boolean
}) {
    return (
        <div className={cn(
            "group relative border transition-all duration-300 rounded-[1.5rem] overflow-hidden",
            file
                ? "border-green-500/30 bg-green-50/50 dark:bg-green-900/10"
                : "border-stone-200 dark:border-zinc-800 bg-stone-50/50 dark:bg-zinc-900 hover:border-meridian-gold/50 hover:bg-white dark:hover:bg-zinc-800"
        )}>
            <input
                type="file"
                accept="image/*,application/pdf"
                onChange={onChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                disabled={disabled}
            />

            <div className="p-6 md:p-8 flex flex-col items-center justify-center text-center min-h-[200px] space-y-4">
                {file ? (
                    <>
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
                            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="space-y-1">
                            <p className="font-medium text-stone-900 dark:text-stone-100 truncate max-w-[150px] mx-auto">
                                {file.name}
                            </p>
                            <p className="text-xs text-green-600 dark:text-green-400 font-medium">Ready to upload</p>
                        </div>
                        <p className="text-[10px] uppercase tracking-widest text-stone-400">Click to change</p>
                    </>
                ) : (
                    <>
                        <div className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-300",
                            required
                                ? "bg-meridian-gold/10 text-meridian-gold group-hover:bg-meridian-gold group-hover:text-white"
                                : "bg-stone-100 dark:bg-zinc-800 text-stone-400 group-hover:bg-stone-200 dark:group-hover:bg-zinc-700"
                        )}>
                            {required ? <FileText className="h-6 w-6" /> : <ImagePlus className="h-6 w-6" />}
                        </div>
                        <div className="space-y-1">
                            <p className="font-medium text-stone-900 dark:text-stone-200">
                                {label}
                            </p>
                            <p className={cn("text-xs", required ? "text-meridian-gold font-medium" : "text-stone-400")}>
                                {subLabel}
                            </p>
                        </div>
                    </>
                )}
            </div>

            {/* Decorative corner accent */}
            {required && !file && (
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-meridian-gold/10 to-transparent rounded-bl-3xl -mr-8 -mt-8" />
            )}
        </div>
    );
}
