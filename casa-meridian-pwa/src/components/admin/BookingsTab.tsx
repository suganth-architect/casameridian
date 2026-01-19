import * as React from 'react';
import { format } from 'date-fns';
import { Plus, Search, Calendar as CalendarIcon, Loader2, CheckCircle, XCircle, LogIn, LogOut, ShieldCheck, ShieldAlert, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { getFirebaseAuth } from '@/lib/firebase';
import { Booking } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';

export function BookingsTab() {
    const [bookings, setBookings] = React.useState<Booking[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [search, setSearch] = React.useState('');
    const [isAddOpen, setIsAddOpen] = React.useState(false);

    // Rejection Dialog State
    const [rejectId, setRejectId] = React.useState<string | null>(null);
    const [rejectReason, setRejectReason] = React.useState('');
    const [processingId, setProcessingId] = React.useState<string | null>(null); // For loading states on specific rows

    // Form State for Manual Booking
    const [formData, setFormData] = React.useState({
        guestName: '',
        phone: '',
        email: '',
        checkIn: undefined as Date | undefined,
        checkOut: undefined as Date | undefined,
        amount: '',
        status: 'confirmed'
    });
    const [submitting, setSubmitting] = React.useState(false);

    const fetchBookings = async () => {
        try {
            const token = await getFirebaseAuth()?.currentUser?.getIdToken();
            if (!token) return;
            const res = await fetch('/api/admin/bookings', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.bookings) setBookings(data.bookings);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchBookings();
    }, []);

    const handleCreate = async () => {
        if (!formData.guestName || !formData.phone || !formData.checkIn || !formData.checkOut) return;
        setSubmitting(true);
        try {
            const token = await getFirebaseAuth()?.currentUser?.getIdToken();
            const res = await fetch('/api/admin/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    guestName: formData.guestName,
                    phone: formData.phone,
                    email: formData.email,
                    checkIn: format(formData.checkIn, 'yyyy-MM-dd'),
                    checkOut: format(formData.checkOut, 'yyyy-MM-dd'),
                    totalAmount: formData.amount,
                    status: formData.status
                })
            });

            if (res.ok) {
                setIsAddOpen(false);
                setFormData({ guestName: '', phone: '', email: '', checkIn: undefined, checkOut: undefined, amount: '', status: 'confirmed' });
                fetchBookings();
            } else {
                alert("Failed to create booking");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSubmitting(false);
        }
    };

    const handleVerifyKyc = async (id: string, action: 'verify' | 'reject') => {
        if (action === 'reject') {
            setRejectId(id);
            return;
        }

        if (!confirm("Confirm KYC verification?")) return;

        setProcessingId(id);
        try {
            const token = await getFirebaseAuth()?.currentUser?.getIdToken();
            await fetch(`/api/admin/bookings/${id}/verify-kyc`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ action: 'verify' })
            });
            fetchBookings();
        } catch (e) { console.error(e); } finally { setProcessingId(null); }
    };

    const confirmReject = async () => {
        if (!rejectId || !rejectReason) return;
        setProcessingId(rejectId);
        try {
            const token = await getFirebaseAuth()?.currentUser?.getIdToken();
            await fetch(`/api/admin/bookings/${rejectId}/verify-kyc`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ action: 'reject', reason: rejectReason })
            });
            setRejectId(null);
            setRejectReason('');
            fetchBookings();
        } catch (e) { console.error(e); } finally { setProcessingId(null); }
    };

    const handleLink = (url: string) => {
        window.open(url, '_blank');
    };

    const handleCheckIn = async (id: string) => {
        if (!confirm("Confirm Check-in? This will activate the stay.")) return;
        setProcessingId(id);
        try {
            const token = await getFirebaseAuth()?.currentUser?.getIdToken();
            const res = await fetch(`/api/admin/bookings/${id}/check-in`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                const err = await res.json();
                alert(err.error || "Check-in failed");
            } else {
                fetchBookings();
            }
        } catch (e) { console.error(e); } finally { setProcessingId(null); }
    };

    const handleCheckOut = async (id: string) => {
        if (!confirm("Confirm Check-out? This will end the stay.")) return;
        setProcessingId(id);
        try {
            const token = await getFirebaseAuth()?.currentUser?.getIdToken();
            const res = await fetch(`/api/admin/bookings/${id}/check-out`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                const err = await res.json();
                alert(err.error || "Check-out failed");
            } else {
                fetchBookings();
            }
        } catch (e) { console.error(e); } finally { setProcessingId(null); }
    };

    const bookingStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'bg-green-600 hover:bg-green-700';
            case 'checked_in': return 'bg-blue-600 hover:bg-blue-700';
            case 'checked_out': return 'bg-slate-500 hover:bg-slate-600';
            case 'cancelled': return 'bg-red-500 hover:bg-red-600';
            default: return 'bg-slate-500';
        }
    };

    const kycStatusColor = (status: string) => {
        switch (status) {
            case 'verified': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'submitted': return 'bg-amber-100 text-amber-800 border-amber-200 animate-pulse';
            case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-slate-100 text-slate-500 border-slate-200';
        }
    };

    const filtered = bookings.filter(b =>
        b.guestName.toLowerCase().includes(search.toLowerCase()) ||
        b.phone.includes(search)
    );

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
                <div className="relative w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                    <Input placeholder="Search bookings..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-[rgb(var(--meridian-blue))]"><Plus className="mr-2 h-4 w-4" /> New Booking</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Create Manual Booking</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Guest Name</Label><Input value={formData.guestName} onChange={e => setFormData({ ...formData, guestName: e.target.value })} /></div>
                                <div className="space-y-2"><Label>Phone</Label><Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} /></div>
                            </div>
                            <div className="space-y-2"><Label>Email</Label><Input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Check In</Label>
                                    <Popover>
                                        <PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal">{formData.checkIn ? format(formData.checkIn, 'PPP') : <span>Pick date</span>}</Button></PopoverTrigger>
                                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.checkIn} onSelect={d => setFormData({ ...formData, checkIn: d })} initialFocus /></PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                    <Label>Check Out</Label>
                                    <Popover>
                                        <PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal">{formData.checkOut ? format(formData.checkOut, 'PPP') : <span>Pick date</span>}</Button></PopoverTrigger>
                                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.checkOut} onSelect={d => setFormData({ ...formData, checkOut: d })} initialFocus /></PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Total Amount</Label><Input type="number" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} /></div>
                                <div className="space-y-2"><Label>Status</Label>
                                    <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent><SelectItem value="confirmed">Confirmed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <Button className="w-full bg-[rgb(var(--meridian-blue))]" onClick={handleCreate} disabled={submitting}>
                                {submitting ? <Loader2 className="animate-spin mr-2" /> : null} Create Booking
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Rejection Dialog */}
            <Dialog open={!!rejectId} onOpenChange={(open) => !open && setRejectId(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Reject KYC</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <Label>Reason for rejection</Label>
                        <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="e.g. Blurry image, Name mismatch" />
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setRejectId(null)}>Cancel</Button>
                            <Button variant="destructive" onClick={confirmReject} disabled={!rejectReason}>Reject Document</Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            <div className="grid gap-4">
                {loading ? <div className="text-center py-8"><Loader2 className="animate-spin mx-auto" /></div> : filtered.map(booking => (
                    <Card key={booking.id} className="overflow-hidden">
                        <CardContent className="p-0">
                            <div className="flex flex-col md:flex-row items-start md:items-center p-4 gap-4">
                                {/* Booking Info */}
                                <div className="flex-1 min-w-[200px]">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <h3 className="font-bold text-lg">{booking.guestName}</h3>
                                        <Badge className={`${bookingStatusColor(booking.status)}`}>
                                            {booking.status.replace('_', ' ')}
                                        </Badge>
                                        <Badge variant="outline" className={`${kycStatusColor(booking.kycStatus || 'not_submitted')}`}>
                                            KYC: {(booking.kycStatus || 'pending').replace('_', ' ')}
                                        </Badge>
                                    </div>
                                    <div className="text-sm text-slate-500 flex flex-col md:flex-row gap-2 md:gap-4">
                                        <span>{booking.phone}</span>
                                        <span className="flex items-center"><CalendarIcon className="w-3 h-3 mr-1" /> {booking.checkIn} → {booking.checkOut}</span>
                                    </div>
                                    {/* KYC Documents Links */}
                                    {booking.kycDocuments && booking.kycDocuments.length > 0 && (
                                        <div className="flex gap-2 mt-2">
                                            {booking.kycDocuments.map((doc, i) => (
                                                <Button key={i} variant="ghost" size="sm" className="h-6 px-2 text-xs text-blue-600 underline" onClick={() => handleLink(doc.url)}>
                                                    {doc.type} ({doc.fileName.slice(0, 10)}...)
                                                </Button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 flex-wrap justify-end">
                                    {processingId === booking.id && <Loader2 className="animate-spin text-slate-400" />}

                                    {/* KYC Actions */}
                                    {['submitted', 'not_submitted', 'rejected'].includes(booking.kycStatus || 'not_submitted') && booking.status === 'confirmed' && (
                                        <>
                                            {booking.kycStatus === 'submitted' && (
                                                <>
                                                    <Button size="sm" variant="default" className="bg-emerald-600 hover:bg-emerald-700 h-8" onClick={() => handleVerifyKyc(booking.id, 'verify')}>
                                                        <BadgeCheck className="w-4 h-4 mr-1" /> Verify
                                                    </Button>
                                                    <Button size="sm" variant="destructive" className="h-8" onClick={() => handleVerifyKyc(booking.id, 'reject')}>
                                                        <ShieldAlert className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            )}
                                        </>
                                    )}

                                    {/* Check-In Action */}
                                    {booking.status === 'confirmed' && booking.kycStatus === 'verified' && (
                                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-8" onClick={() => handleCheckIn(booking.id)}>
                                            <LogIn className="w-4 h-4 mr-1" /> Check-in
                                        </Button>
                                    )}

                                    {/* Check-Out Action */}
                                    {booking.status === 'checked_in' && (
                                        <Button size="sm" variant="outline" className="text-slate-700 text-xs uppercase tracking-wider font-bold h-8 border-2" onClick={() => handleCheckOut(booking.id)}>
                                            <LogOut className="w-4 h-4 mr-1" /> Check-out
                                        </Button>
                                    )}

                                    <div className="text-sm font-mono font-medium ml-2">
                                        ₹{booking.totalAmount}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
