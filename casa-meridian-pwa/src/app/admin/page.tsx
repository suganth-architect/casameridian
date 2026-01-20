
'use client';

import * as React from 'react';
import { getFirebaseAuth, getGoogleProvider } from '@/lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, LogOut, ShieldAlert, Sparkles } from 'lucide-react';

// Sub Components
import { RequestsTab } from '@/components/admin/RequestsTab';
import { BookingsTab } from '@/components/admin/BookingsTab';
import { CalendarTab } from '@/components/admin/CalendarTab';
import { CheckinTab } from '@/components/admin/CheckinTab';
import { AdminTab } from '@/components/admin/AdminTab';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Types
import { AdminProfile } from '@/lib/admin-auth';
import Image from 'next/image';

// Reuse Visuals Tab Logic Inline (since it was simple and specific)
import { VisualsTab } from '@/components/admin/VisualsTab';

export const dynamic = "force-dynamic";

export default function AdminDashboard() {
    const [user, setUser] = React.useState<User | null>(null);
    const [adminProfile, setAdminProfile] = React.useState<AdminProfile | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [verifying, setVerifying] = React.useState(false);

    // Auth Listener
    React.useEffect(() => {
        const auth = getFirebaseAuth();
        if (auth) {
            const unsub = onAuthStateChanged(auth, async (u) => {
                setUser(u);
                if (u) {
                    // Verify Role
                    setVerifying(true);
                    try {
                        const token = await u.getIdToken();
                        const res = await fetch('/api/admin/rbac/me', {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const data = await res.json();
                        if (res.ok && data.admin) {
                            setAdminProfile(data.admin);
                        } else {
                            setAdminProfile(null);
                        }
                    } catch (e) {
                        console.error(e);
                        setAdminProfile(null);
                    } finally {
                        setVerifying(false);
                        setLoading(false);
                    }
                } else {
                    setLoading(false);
                    setAdminProfile(null);
                }
            });
            return () => unsub();
        } else {
            setLoading(false);
        }
    }, []);

    const handleLogin = async () => {
        const auth = getFirebaseAuth();
        const provider = getGoogleProvider();
        if (auth && provider) {
            try { await signInWithPopup(auth, provider); } catch (e) { console.error(e); }
        }
    };

    const handleLogout = async () => {
        const auth = getFirebaseAuth();
        if (auth) await signOut(auth);
        setAdminProfile(null);
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-[rgb(var(--meridian-gold))]" /></div>;

    if (!user) {
        return (
            <div className="h-screen flex flex-col items-center justify-center space-y-6 bg-slate-50">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold font-montserrat text-[rgb(var(--meridian-blue))]">Casa Meridian</h1>
                    <p className="text-slate-500">Administration Panel</p>
                </div>
                <Button onClick={handleLogin} className="bg-[rgb(var(--meridian-blue))] text-white px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all">
                    Sign in with Google
                </Button>
            </div>
        );
    }

    if (verifying) return <div className="h-screen flex items-center justify-center flex-col gap-4"><Loader2 className="animate-spin w-8 h-8 text-[rgb(var(--meridian-blue))]" /><p>Verifying Access...</p></div>;

    if (!adminProfile) {
        return (
            <div className="h-screen flex flex-col items-center justify-center space-y-6 bg-slate-50 px-4 text-center">
                <ShieldAlert className="w-16 h-16 text-red-500" />
                <h1 className="text-2xl font-bold text-slate-800">Access Denied</h1>
                <p className="text-slate-600 max-w-md">
                    Your account <strong>{user.email}</strong> is not authorized to access this panel.
                    Please contact the property owner to be added as a staff member.
                </p>
                <Button variant="outline" onClick={handleLogout}>Logout</Button>
            </div>
        );
    }

    // Access Control Helpers
    const isOwner = adminProfile.role === 'owner';
    const isAdmin = adminProfile.role === 'admin' || isOwner;
    const isStaff = adminProfile.role === 'staff' || isAdmin;

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 pb-32">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-[rgb(var(--meridian-blue))]">Dashboard</h1>
                        <p className="text-slate-500">Welcome, {adminProfile.name} <span className="text-xs uppercase bg-[rgb(var(--meridian-gold))] text-white px-2 py-0.5 rounded-full ml-2">{adminProfile.role}</span></p>
                    </div>
                    <Button variant="outline" onClick={handleLogout} className="border-red-100 text-red-500 hover:bg-red-50"><LogOut className="mr-2 h-4 w-4" /> Logout</Button>
                </div>

                <Tabs defaultValue={isAdmin ? "requests" : "checkin"} className="space-y-6">
                    <TabsList className="bg-white p-1 rounded-xl border shadow-sm h-auto flex flex-wrap justify-start">
                        {isAdmin && <TabsTrigger value="requests" className="data-[state=active]:bg-[rgb(var(--meridian-blue))] data-[state=active]:text-white rounded-lg px-4 py-2">Requests</TabsTrigger>}
                        {isAdmin && <TabsTrigger value="bookings" className="data-[state=active]:bg-[rgb(var(--meridian-blue))] data-[state=active]:text-white rounded-lg px-4 py-2">Bookings</TabsTrigger>}
                        {isAdmin && <TabsTrigger value="calendar" className="data-[state=active]:bg-[rgb(var(--meridian-blue))] data-[state=active]:text-white rounded-lg px-4 py-2">Calendar</TabsTrigger>}
                        {isStaff && <TabsTrigger value="checkin" className="data-[state=active]:bg-[rgb(var(--meridian-blue))] data-[state=active]:text-white rounded-lg px-4 py-2">Check-in</TabsTrigger>}
                        {isOwner && <TabsTrigger value="admins" className="data-[state=active]:bg-[rgb(var(--meridian-blue))] data-[state=active]:text-white rounded-lg px-4 py-2">Admins</TabsTrigger>}
                        {isAdmin && <TabsTrigger value="visuals" className="data-[state=active]:bg-[rgb(var(--meridian-blue))] data-[state=active]:text-white rounded-lg px-4 py-2">Visuals</TabsTrigger>}
                    </TabsList>

                    {isAdmin && <TabsContent value="requests"><RequestsTab /></TabsContent>}
                    {isAdmin && <TabsContent value="bookings"><BookingsTab /></TabsContent>}
                    {isAdmin && <TabsContent value="calendar"><CalendarTab /></TabsContent>}
                    {isStaff && <TabsContent value="checkin"><CheckinTab /></TabsContent>}
                    {isOwner && <TabsContent value="admins"><AdminTab currentUserEmail={user.email} /></TabsContent>}

                    {isAdmin && <TabsContent value="visuals"><VisualsTab /></TabsContent>}
                </Tabs>
            </div>
        </div>
    );
}


