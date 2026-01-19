'use client';

import * as React from 'react';
// Import Getters instead of instances
import { getFirebaseAuth, getFirestoreDb, getGoogleProvider } from '@/lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, LogOut, Check, X } from 'lucide-react';

// HOTFIX: Prevent build-time static generation errors
export const dynamic = "force-dynamic";

const ADMIN_EMAILS = ['luckysuganth@gmail.com', 'mbsujith23@gmail.com'];

export default function AdminDashboard() {
    const [user, setUser] = React.useState<User | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [requests, setRequests] = React.useState<any[]>([]);

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

    // 2. Data Listener (Only if user is logged in & authorized)
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
                phone: req.phone,
                email: req.email || '',
                checkIn: req.checkIn,
                checkOut: req.checkOut,
                nights: req.nights,
                totalAmount: req.totalAmount,
                pricePerNight: req.pricePerNight,
                requestId: req.id,
                status: 'confirmed',
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
            <div className="flex justify-between items-center mb-8 max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-[rgb(var(--meridian-blue))]">Requests</h1>
                <Button variant="outline" size="icon" onClick={handleLogout}><LogOut className="h-4 w-4" /></Button>
            </div>
            <div className="max-w-4xl mx-auto space-y-4">
                {requests.length === 0 && <p className="text-center text-slate-400">No pending requests.</p>}
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
            </div>
        </div>
    );
}
