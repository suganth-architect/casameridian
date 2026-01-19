"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wifi, Utensils, SprayCan, Phone, AlertCircle, LogOut } from "lucide-react";
import { getFirestoreDb, getFirebaseAuth } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

interface GuestDashboardProps {
    guestName: string;
    checkIn: string; // ISO string or formatted date
    checkOut: string; // ISO string or formatted date
    nights: number;
    phone: string;
}

export function GuestDashboard({ guestName, checkIn, checkOut, nights, phone }: GuestDashboardProps) {
    const [loadingRequest, setLoadingRequest] = useState<string | null>(null);

    const handleServiceRequest = async (type: string, notes: string = "") => {
        setLoadingRequest(type);
        const db = getFirestoreDb();
        if (!db) return;

        try {
            await addDoc(collection(db, "guestRequests"), {
                phone,
                guestName,
                type,
                notes,
                status: "new",
                createdAt: serverTimestamp(),
            });
            alert(`Request for ${type} sent! We'll be there shortly.`);
        } catch (error) {
            console.error("Error creating request:", error);
            alert("Failed to send request. Please try contacting front desk directly.");
        } finally {
            setLoadingRequest(null);
        }
    };

    const handleLogout = () => {
        getFirebaseAuth()?.signOut();
        window.location.reload();
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Welcome Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-light tracking-tight text-foreground">
                        Welcome, <span className="font-normal text-amber-600 dark:text-amber-500">{guestName}</span>
                    </h1>
                    <p className="text-muted-foreground mt-1">We hope you have a wonderful stay.</p>
                </div>
                <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
                    <LogOut className="h-5 w-5" />
                </Button>
            </div>

            {/* Booking Card */}
            <Card className="rounded-2xl border-amber-100 dark:border-zinc-800 bg-gradient-to-br from-white to-amber-50/30 dark:from-zinc-900 dark:to-zinc-900 overflow-hidden shadow-sm">
                <CardHeader className="pb-2">
                    <CardDescription className="uppercase tracking-widest text-xs font-semibold text-amber-600/80">Current Stay</CardDescription>
                    <CardTitle className="text-xl">Casa Meridian - Luxury Suite</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Check-in</p>
                            <p className="font-medium text-lg">{new Date(checkIn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                            <p className="text-xs text-muted-foreground">12:00 PM</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Check-out</p>
                            <p className="font-medium text-lg">{new Date(checkOut).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                            <p className="text-xs text-muted-foreground">11:00 AM</p>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-dashed border-amber-200/50 dark:border-zinc-700 flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Duration</span>
                        <span className="font-medium">{nights} Night{nights !== 1 ? 's' : ''}</span>
                    </div>
                </CardContent>
            </Card>

            {/* WiFi Card */}
            <Card className="rounded-2xl bg-slate-900 text-white dark:bg-zinc-800 border-none shadow-md">
                <CardContent className="pt-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-white/10 rounded-full">
                            <Wifi className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-300 uppercase tracking-widest">Wi-Fi Network</p>
                            <p className="font-medium text-lg">Casa_Guest_5G</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-300 uppercase tracking-widest">Password</p>
                        <p className="font-mono text-lg tracking-wider">welcome2026</p>
                    </div>
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <div>
                <h3 className="text-lg font-medium mb-4 ml-1">Guest Services</h3>
                <div className="grid grid-cols-2 gap-3">
                    <Button
                        variant="outline"
                        className="h-auto py-4 flex flex-col gap-2 border-dashed border-amber-200 hover:border-amber-400 hover:bg-amber-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                        onClick={() => handleServiceRequest("Housekeeping", "General Cleaning")}
                        disabled={loadingRequest === "Housekeeping"}
                    >
                        <SprayCan className="h-6 w-6 text-amber-600" />
                        <span className="text-xs">Housekeeping</span>
                    </Button>

                    <Button
                        variant="outline"
                        className="h-auto py-4 flex flex-col gap-2 border-dashed border-amber-200 hover:border-amber-400 hover:bg-amber-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                        onClick={() => handleServiceRequest("Towels", "Fresh Towels Request")}
                        disabled={loadingRequest === "Towels"}
                    >
                        <div className="h-6 w-6 flex items-center justify-center text-amber-600 font-bold text-lg">T</div>
                        <span className="text-xs">Request Towels</span>
                    </Button>

                    <Button
                        variant="outline"
                        className="h-auto py-4 flex flex-col gap-2 border-dashed border-amber-200 hover:border-amber-400 hover:bg-amber-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                        onClick={() => handleServiceRequest("Chef", "Private Chef Inquiry")}
                        disabled={loadingRequest === "Chef"}
                    >
                        <Utensils className="h-6 w-6 text-amber-600" />
                        <span className="text-xs">Chef Request</span>
                    </Button>

                    <Button
                        className="h-auto py-4 flex flex-col gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50"
                        onClick={() => handleServiceRequest("Emergency", "EMERGENCY CALL REQUEST")}
                        disabled={loadingRequest === "Emergency"}
                    >
                        <AlertCircle className="h-6 w-6" />
                        <span className="text-xs">Emergency</span>
                    </Button>
                </div>
            </div>

            {/* House Rules */}
            <Card className="rounded-2xl text-sm">
                <CardHeader>
                    <CardTitle className="text-base">House Rules</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="list-disc list-outside ml-4 space-y-1 text-muted-foreground">
                        <li>Check-out is at 11:00 AM.</li>
                        <li>Please respect quiet hours from 10 PM to 8 AM.</li>
                        <li>No smoking inside the villa.</li>
                        <li>Please turn off ACs when leaving the room.</li>
                    </ul>
                </CardContent>
            </Card>

            <div className="flex justify-center pt-4">
                <a href="tel:+919876543210" className="inline-flex items-center gap-2 text-muted-foreground hover:text-amber-600 transition-colors text-sm">
                    <Phone className="h-4 w-4" />
                    <span>Contact Front Desk</span>
                </a>
            </div>
        </div>
    );
}
