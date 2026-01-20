import * as React from 'react';
import { format } from 'date-fns';
import { Plus, Search, Calendar as CalendarIcon, Loader2, Eye, Copy } from 'lucide-react';
import { safeParseDate } from '@/lib/date';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { getFirebaseAuth } from '@/lib/firebase';
import { Booking } from '@/lib/types';
import { BookingDetailDrawer } from './booking-detail-drawer';

export function BookingsTab() {
    const [bookings, setBookings] = React.useState<Booking[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [search, setSearch] = React.useState('');
    const [isAddOpen, setIsAddOpen] = React.useState(false);

    // Detail Drawer State
    const [selectedBooking, setSelectedBooking] = React.useState<Booking | null>(null);

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

    const bookingStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'bg-green-600 hover:bg-green-700';
            case 'checked_in': return 'bg-blue-600 hover:bg-blue-700';
            case 'checked_out': return 'bg-slate-500 hover:bg-slate-600';
            case 'cancelled': return 'bg-red-500 hover:bg-red-600';
            default: return 'bg-slate-500';
        }
    };

    const kycStatusColor = (status: string | undefined) => {
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
                                        <PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal">{formData.checkIn ? format(safeParseDate(formData.checkIn)!, 'PPP') : <span>Pick date</span>}</Button></PopoverTrigger>
                                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.checkIn} onSelect={d => setFormData({ ...formData, checkIn: d })} initialFocus /></PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                    <Label>Check Out</Label>
                                    <Popover>
                                        <PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal">{formData.checkOut ? format(safeParseDate(formData.checkOut)!, 'PPP') : <span>Pick date</span>}</Button></PopoverTrigger>
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
                    <Card key={booking.id} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedBooking(booking)}>
                        <CardContent className="p-0">
                            <div className="flex flex-col md:flex-row items-start md:items-center p-4 gap-4">
                                {/* Booking Info */}
                                <div className="flex-1 min-w-[200px]">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <h3 className="font-bold text-lg">{booking.guestName}</h3>
                                        <Badge variant="outline" className="font-mono text-[10px] flex items-center gap-1">
                                            ID: {booking.id}
                                            <Button variant="ghost" size="icon" className="h-3 w-3 ml-1" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(booking.id); }}>
                                                <Copy className="h-2 w-2 text-slate-500" />
                                            </Button>
                                        </Badge>
                                        <Badge className={`${bookingStatusColor(booking.status)}`}>
                                            {booking.status.replace('_', ' ')}
                                        </Badge>
                                        {booking.noShow && <Badge variant="destructive">No-Show</Badge>}
                                        {booking.source && booking.source.startsWith('ota_') && (
                                            <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200">
                                                {booking.source.replace('ota_', '').toUpperCase()}
                                            </Badge>
                                        )}
                                        <Badge variant="outline" className={`${kycStatusColor(booking.kycStatus || 'not_submitted')}`}>
                                            KYC: {(booking.kycStatus || 'not_submitted').replace('_', ' ')}
                                        </Badge>
                                    </div>
                                    <div className="text-sm text-slate-500 flex flex-col md:flex-row gap-2 md:gap-4">
                                        <span>{booking.phone}</span>
                                        <span className="flex items-center">
                                            <CalendarIcon className="w-3 h-3 mr-1" />
                                            {safeParseDate(booking.checkIn) ? format(safeParseDate(booking.checkIn)!, 'PPP') : '—'}
                                            {' → '}
                                            {safeParseDate(booking.checkOut) ? format(safeParseDate(booking.checkOut)!, 'PPP') : '—'}
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 flex-wrap justify-end">
                                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedBooking(booking); }}>
                                        <Eye className="w-4 h-4 mr-2" /> View Details
                                    </Button>
                                    <div className="text-sm font-mono font-medium ml-2 border-l pl-2">
                                        ₹{booking.totalAmount}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <BookingDetailDrawer
                booking={selectedBooking}
                open={!!selectedBooking}
                onClose={() => setSelectedBooking(null)}
                onUpdate={() => { fetchBookings(); setSelectedBooking(null); }}
            />
        </div>
    );
}
