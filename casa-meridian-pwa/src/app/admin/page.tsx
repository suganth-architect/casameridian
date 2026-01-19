'use client';

import * as React from 'react';
import { auth, db, googleProvider } from '@/lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, LogOut, Check, X } from 'lucide-react';

const ADMIN_EMAILS = ['luckysuganth@gmail.com', 'mbsujith23@gmail.com'];

export default function AdminDashboard() {
    const [user, setUser] = React.useState<User | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [requests, setRequests] = React.useState<any[]>([]);

    React.useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
        return () => unsubscribe();
    }, []);

    React.useEffect(() => {
        if (!user || !ADMIN_EMAILS.includes(user.email || '')) return;
        const q = query(collection(db, 'bookingRequests'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
        return onSnapshot(q, (snap) => setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    }, [user]);

    const handleApprove = async (req: any) => {
        if (!confirm(`Approve booking for ${req.guestName}?`)) return;
        try {
            // 1. Create Clean Booking Doc
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
            alert("Error approving request.");
        }
    };

    const handleReject = async (id: string) => {
        if (!confirm("Reject this request?")) return;
        await updateDoc(doc(db, 'bookingRequests', id), { status: 'rejected', updatedAt: serverTimestamp() });
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
    if (!user || !ADMIN_EMAILS.includes(user.email || '')) return <div className="p-8 text-center"><Button onClick={() => signInWithPopup(auth, googleProvider)}>Admin Login</Button></div>;

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 pb-24">
            <div className="flex justify-between items-center mb-8 max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-[rgb(var(--meridian-blue))]">Requests</h1>
                <Button variant="outline" size="icon" onClick={() => signOut(auth)}><LogOut className="h-4 w-4" /></Button>
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
                                <div><p className="text-slate-500">Check-In</p><p>{req.checkIn}</p></div>
                                <div><p className="text-slate-500">Check-Out</p><p>{req.checkOut}</p></div>
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
