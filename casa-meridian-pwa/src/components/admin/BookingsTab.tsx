
import * as React from 'react';
import { format } from 'date-fns';
import { Plus, Search, MoreHorizontal, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { getFirebaseAuth } from '@/lib/firebase';

interface Booking {
    id: string;
    guestName: string;
    phone: string;
    checkIn: string;
    checkOut: string;
    status: string;
    totalAmount: number;
    email?: string;
    notes?: string;
}

export function BookingsTab() {
    const [bookings, setBookings] = React.useState<Booking[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [search, setSearch] = React.useState('');
    const [isAddOpen, setIsAddOpen] = React.useState(false);

    // Form State
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

    const handleCancel = async (id: string) => {
        if (!confirm("Are you sure you want to cancel this booking?")) return;
        try {
            const token = await getFirebaseAuth()?.currentUser?.getIdToken();
            await fetch(`/api/admin/bookings/${id}`, {
                method: 'PATCH', // Soft cancel or DELETE for hard? Let's use PATCH status
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'cancelled' })
            });
            fetchBookings();
        } catch (e) {
            console.error(e);
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

            <div className="grid gap-4">
                {loading ? <div className="text-center py-8"><Loader2 className="animate-spin mx-auto" /></div> : filtered.map(booking => (
                    <Card key={booking.id} className="overflow-hidden">
                        <CardContent className="p-0">
                            <div className="flex flex-col md:flex-row items-center p-4 gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-lg">{booking.guestName}</h3>
                                        <Badge
                                            variant={booking.status === 'cancelled' ? 'destructive' : 'default'}
                                            className={
                                                booking.status === 'confirmed' ? 'bg-green-600 hover:bg-green-700' :
                                                    booking.status === 'checked_in' ? 'bg-blue-600 hover:bg-blue-700' :
                                                        booking.status === 'checked_out' ? 'bg-slate-500 hover:bg-slate-600' :
                                                            booking.status === 'active' ? 'bg-blue-600 hover:bg-blue-700' : // Legacy support
                                                                ''
                                            }>
                                            {booking.status.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                    <div className="text-sm text-slate-500 flex gap-4">
                                        <span>{booking.phone}</span>
                                        <span className="flex items-center"><CalendarIcon className="w-3 h-3 mr-1" /> {booking.checkIn} → {booking.checkOut}</span>
                                    </div>
                                </div>
                                <div className="text-right font-mono font-medium">
                                    ₹{booking.totalAmount}
                                </div>
                                <div className="flex gap-2">
                                    {/* Hide Cancel button if checked_out or cancelled */}
                                    {!['checked_out', 'cancelled'].includes(booking.status) && (
                                        <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => handleCancel(booking.id)}>
                                            Cancel
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
