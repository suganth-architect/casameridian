
import * as React from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getFirebaseAuth, getFirestoreDb } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { normalizePhoneDigits, normalizePhoneE164 } from '@/lib/phone';

export function RequestsTab() {
    const [requests, setRequests] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const db = getFirestoreDb();
        if (!db) return;

        const q = query(
            collection(db, 'bookingRequests'),
            where('status', '==', 'pending'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snap) => {
            setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleApprove = async (req: any) => {
        const auth = getFirebaseAuth();
        if (!auth?.currentUser || !confirm(`Approve booking for ${req.guestName}?`)) return;

        try {
            const token = await auth.currentUser.getIdToken();
            const res = await fetch('/api/admin/approve-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ requestId: req.id }),
            });

            if (!res.ok) {
                const data = await res.json();
                if (res.status === 409) {
                    alert(`Conflict detected!\n\n${data.error}\nType: ${data.conflict.type}\nStart: ${data.conflict.startDate}\nEnd: ${data.conflict.endDate}`);
                } else {
                    alert(`Error: ${data.error || 'Failed to approve'}`);
                }
                return;
            }

            // Success (Firestore listener will update UI)

        } catch (err) {
            console.error(err);
            alert("Network error approving request");
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

    if (loading) return <div className="py-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

    return (
        <div className="space-y-4">
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
                            <Button variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleReject(req.id)}><X className="mr-1 h-4 w-4" /> Reject</Button>
                            <Button className="bg-[rgb(var(--meridian-blue))]" onClick={() => handleApprove(req)}><Check className="mr-1 h-4 w-4" /> Approve</Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
