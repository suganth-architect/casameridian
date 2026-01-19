'use client';

import * as React from 'react';
// Import Getters instead of instances
import { getFirebaseAuth, getFirestoreDb, getGoogleProvider } from '@/lib/firebase';
import { normalizePhoneDigits, normalizePhoneE164 } from '@/lib/phone';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, LogOut, Check, X, Image as ImageIcon, Sparkles } from 'lucide-react';
import Image from 'next/image';

// HOTFIX: Prevent build-time static generation errors
export const dynamic = "force-dynamic";

const ADMIN_EMAILS = ['luckysuganth@gmail.com', 'mbsujith23@gmail.com'];

export default function AdminDashboard() {
    const [user, setUser] = React.useState<User | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [requests, setRequests] = React.useState<any[]>([]);

    // Visuals Tab State
    const [generating, setGenerating] = React.useState<string | null>(null);
    const [assets, setAssets] = React.useState<Record<string, any>>({});

    // 1. Auth Listener
    React.useEffect(() => {
        const auth = getFirebaseAuth();
        if (auth) {
            const unsubscribe = onAuthStateChanged(auth, (u) => {
                setUser(u);
                setLoading(false);
            });
            return () => unsubscribe();
        } else {
            // If auth is not available (e.g. server side), stop loading
            setLoading(false);
        }
    }, []);

    // 2. Data Listener (Requests) - Only if user is logged in & authorized
    React.useEffect(() => {
        if (!user || !ADMIN_EMAILS.includes(user.email || '')) return;

        const db = getFirestoreDb();
        if (!db) return;

        const q = query(
            collection(db, 'bookingRequests'),
            where('status', '==', 'pending'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snap) => {
            setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsubscribe();
    }, [user]);

    // 3. Data Listener (Assets) - Only if user is logged in & authorized
    React.useEffect(() => {
        if (!user || !ADMIN_EMAILS.includes(user.email || '')) return;

        const db = getFirestoreDb();
        if (!db) return;

        const unsub = onSnapshot(collection(db, 'siteAssets'), (snap) => {
            const data: Record<string, any> = {};
            snap.forEach(doc => { data[doc.id] = doc.data(); });
            setAssets(data);
        });
        return () => unsub();
    }, [user]);

    const handleLogin = async () => {
        const auth = getFirebaseAuth();
        const provider = getGoogleProvider();
        if (auth && provider) {
            try {
                await signInWithPopup(auth, provider);
            } catch (error) {
                console.error("Login failed", error);
            }
        }
    };

    const handleLogout = async () => {
        const auth = getFirebaseAuth();
        if (auth) await signOut(auth);
    };

    const handleApprove = async (req: any) => {
        const db = getFirestoreDb();
        if (!db || !confirm(`Approve booking for ${req.guestName}?`)) return;

        try {
            // 1. Create Confirmed Booking
            await addDoc(collection(db, 'bookings'), {
                guestName: req.guestName,
                phone: req.phone, // Raw requests phone
                phoneLocal: normalizePhoneDigits(req.phone), // Normalized 10 digit
                phoneE164: normalizePhoneE164(req.phone), // E.164
                email: req.email || '',
                checkIn: req.checkIn,
                checkOut: req.checkOut,
                nights: req.nights,
                totalAmount: req.totalAmount,
                pricePerNight: req.pricePerNight,
                requestId: req.id,
                status: 'confirmed',
                createdAt: serverTimestamp(),
                approvedAt: serverTimestamp(),
            });

            // 2. Update Request Status
            await updateDoc(doc(db, 'bookingRequests', req.id), { status: 'approved', updatedAt: serverTimestamp() });
        } catch (err) {
            console.error(err);
            alert("Error approving");
        }
    };

    const handleReject = async (id: string) => {
        const db = getFirestoreDb();
        if (!db || !confirm("Reject this request?")) return;
        try {
            await updateDoc(doc(db, 'bookingRequests', id), { status: 'rejected', updatedAt: serverTimestamp() });
        } catch (err) {
            console.error(err);
        }
    };

    const handleGenerate = async (type: string) => {
        const auth = getFirebaseAuth();
        if (!auth?.currentUser) return alert("Please log in");

        setGenerating(type);
        try {
            const token = await auth.currentUser.getIdToken();
            const res = await fetch('/api/admin/generate-assets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ type }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            alert(`${type} generated successfully!`);
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        } finally {
            setGenerating(null);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

    if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
        return (
            <div className="p-8 h-screen flex flex-col items-center justify-center space-y-4">
                <h1 className="text-xl font-bold">Admin Login</h1>
                {user && <p className="text-red-500">Unauthorized: {user.email}</p>}
                {user ? <Button onClick={handleLogout}>Logout</Button> : <Button onClick={handleLogin}>Sign in with Google</Button>}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 pb-24">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-[rgb(var(--meridian-blue))]">Admin Dashboard</h1>
                    <Button variant="outline" size="icon" onClick={handleLogout}><LogOut className="h-4 w-4" /></Button>
                </div>

                <Tabs defaultValue="requests" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="requests">Booking Requests</TabsTrigger>
                        <TabsTrigger value="visuals">Website Visuals</TabsTrigger>
                    </TabsList>

                    <TabsContent value="requests" className="space-y-4">
                        {requests.length === 0 && <p className="text-center text-slate-400 py-12">No pending requests.</p>}
                        {requests.map((req) => (
                            <Card key={req.id} className="border-l-4 border-l-[rgb(var(--meridian-gold))]">
                                <CardHeader className="flex flex-row justify-between pb-2">
                                    <div><CardTitle>{req.guestName}</CardTitle><p className="text-sm text-slate-500">{req.phone}</p></div>
                                    <Badge variant="secondary">Pending</Badge>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                                        <div><p className="text-slate-500">In</p><p>{req.checkIn}</p></div>
                                        <div><p className="text-slate-500">Out</p><p>{req.checkOut}</p></div>
                                        <div><p className="text-slate-500">Nights</p><p>{req.nights}</p></div>
                                        <div><p className="text-slate-500">Total</p><p>₹{req.totalAmount}</p></div>
                                    </div>
                                    {req.notes && <div className="bg-slate-100 p-2 rounded text-sm mb-4 italic">"{req.notes}"</div>}
                                    <div className="flex justify-end gap-3">
                                        <Button variant="outline" className="text-red-600" onClick={() => handleReject(req.id)}><X className="mr-1 h-4 w-4" /> Reject</Button>
                                        <Button className="bg-[rgb(var(--meridian-blue))]" onClick={() => handleApprove(req)}><Check className="mr-1 h-4 w-4" /> Approve</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </TabsContent>

                    <TabsContent value="visuals">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-amber-500" />
                                    AI Asset Generator
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {['hero', 'pool', 'bedroom'].map((type) => (
                                    <div key={type} className="flex flex-col md:flex-row gap-4 items-center justify-between border p-4 rounded-xl">
                                        <div className="flex items-center gap-4 w-full md:w-auto">
                                            <div className="relative w-32 h-20 bg-slate-100 rounded-lg overflow-hidden shrink-0 border">
                                                {assets[type]?.url ? (
                                                    <Image src={assets[type].url} alt={type} fill className="object-cover" />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-slate-300">
                                                        <ImageIcon className="w-6 h-6" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-bold capitalize">{type} Section</h3>
                                                <p className="text-xs text-slate-500">
                                                    {assets[type] ? `Updated: ${new Date(assets[type].updatedAt?.seconds * 1000).toLocaleDateString()}` : 'No custom asset'}
                                                </p>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={() => handleGenerate(type)}
                                            disabled={generating !== null}
                                            variant="outline"
                                            className="w-full md:w-auto border-[rgb(var(--meridian-gold))] text-[rgb(var(--meridian-gold))] hover:bg-amber-50"
                                        >
                                            {generating === type ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                            Generate New
                                        </Button>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
