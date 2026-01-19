"use client";

import { useState, useEffect } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Loader2, Phone, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface OtpLoginProps {
    onLoginSuccess: (phone: string) => void;
}

export function OtpLogin({ onLoginSuccess }: OtpLoginProps) {
    const [phoneNumber, setPhoneNumber] = useState("");
    const [otp, setOtp] = useState("");
    const [verificationId, setVerificationId] = useState<ConfirmationResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);

    useEffect(() => {
        const auth = getFirebaseAuth();
        if (!auth) return;

        // Initialize RecaptchaVerifier
        const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
            size: "invisible",
            callback: () => {
                // reCAPTCHA solved
            },
            "expired-callback": () => {
                setError("Recaptcha expired. Please try again.");
            },
        });

        verifier.render();
        setRecaptchaVerifier(verifier);

        return () => {
            verifier.clear();
        }
    }, []);

    const formatPhoneNumber = (phone: string) => {
        // Basic normalization for India (+91)
        let cleaned = phone.replace(/\D/g, "");
        if (cleaned.length === 10) {
            return `+91${cleaned}`;
        }
        if (cleaned.length > 0 && !cleaned.startsWith("+")) {
            return `+${cleaned}`;
        }
        return phone;
    };

    const handleSendOtp = async () => {
        if (!phoneNumber) {
            setError("Please enter a valid phone number.");
            return;
        }

        setLoading(true);
        setError("");

        const formattedPhone = formatPhoneNumber(phoneNumber);
        const auth = getFirebaseAuth();

        if (!auth || !recaptchaVerifier) {
            setError("Authentication service not ready.");
            setLoading(false);
            return;
        }

        try {
            const confirmationResult = await signInWithPhoneNumber(
                auth,
                formattedPhone,
                recaptchaVerifier
            );
            setVerificationId(confirmationResult);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            console.error("Error sending OTP:", err);
            setError(err.message || "Failed to send OTP. Try again.");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((window as any).grecaptcha) {
                recaptchaVerifier.clear();
                // Re-init if needed, but often just clearing is enough for a retry
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp || !verificationId) {
            setError("Please enter the OTP.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            await verificationId.confirm(otp);
            if (getFirebaseAuth()?.currentUser?.phoneNumber) {
                onLoginSuccess(getFirebaseAuth()!.currentUser!.phoneNumber!);
            }
        } catch (err) {
            console.error("Error verifying OTP:", err);
            setError("Invalid OTP. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-sm mx-auto p-6 bg-white/80 backdrop-blur-md rounded-2xl border border-amber-100 shadow-xl dark:bg-zinc-900/80 dark:border-zinc-800">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-light text-foreground tracking-wide">Welcome Home</h2>
                <p className="text-sm text-muted-foreground mt-2">Sign in to access your stay</p>
            </div>

            <div className="space-y-4">
                {!verificationId ? (
                    <>
                        <div className="space-y-2">
                            <label htmlFor="phone" className="text-sm font-medium text-muted-foreground">
                                Phone Number
                            </label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-amber-500/60" />
                                <input
                                    id="phone"
                                    type="tel"
                                    placeholder="+91 98765 43210"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-950 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-mono text-sm"
                                />
                            </div>
                        </div>

                        <div id="recaptcha-container"></div>

                        <Button
                            onClick={handleSendOtp}
                            disabled={loading || !phoneNumber}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 rounded-xl h-11"
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                "Send Verification Code"
                            )}
                        </Button>
                    </>
                ) : (
                    <>
                        <div className="space-y-2">
                            <label htmlFor="otp" className="text-sm font-medium text-muted-foreground">
                                Verification Code
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-amber-500/60" />
                                <input
                                    id="otp"
                                    type="text"
                                    placeholder="123456"
                                    maxLength={6}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-950 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-mono text-sm tracking-widest"
                                />
                            </div>
                        </div>

                        <Button
                            onClick={handleVerifyOtp}
                            disabled={loading || otp.length !== 6}
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-xl h-11"
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                "Verify & Sign In"
                            )}
                        </Button>

                        <button
                            onClick={() => {
                                setVerificationId(null);
                                setOtp("");
                                setError("");
                            }}
                            className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Change Phone Number
                        </button>
                    </>
                )}

                {error && (
                    <div className="p-3 rounded-lg bg-red-50 text-red-600 text-xs border border-red-100 text-center animate-in fade-in slide-in-from-bottom-2">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
}
