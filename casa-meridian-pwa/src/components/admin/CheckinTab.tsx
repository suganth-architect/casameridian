
import * as React from 'react';
import { format } from 'date-fns';
import { safeParseDate } from '@/lib/date';
import { Search, Loader2, LogIn, LogOut, ShieldCheck, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getFirebaseAuth } from '@/lib/firebase';
import { Booking } from '@/lib/types';
import { BookingDetailDrawer } from './booking-detail-drawer';

export function CheckinTab() {
    const [bookings, setBookings] = React.useState<Booking[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [search, setSearch] = React.useState('');
    const [processing, setProcessing] = React.useState<string | null>(null);

    // Drawer State
    const [selectedBooking, setSelectedBooking] = React.useState<Booking | null>(null);

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const token = await getFirebaseAuth()?.currentUser?.getIdToken();
            if (!token) return;
            const res = await fetch('/api/admin/bookings', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.bookings) {
                // Filter relevant bookings for check-in/out
                const relevant = data.bookings.filter((b: Booking) =>
                    ['confirmed', 'checked_in'].includes(b.status)
                );
                setBookings(relevant);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchBookings();
    }, []);

    const handleAction = async (e: React.MouseEvent, bookingId: string, action: 'check-in' | 'check-out') => {
        e.stopPropagation();
        if (!confirm(`Are you sure you want to ${action}?`)) return;
        setProcessing(bookingId);
        try {
            const token = await getFirebaseAuth()?.currentUser?.getIdToken();
            const res = await fetch(`/api/admin/bookings/${bookingId}/${action}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchBookings();
            } else {
                const err = await res.json();
                alert(err.error || "Action failed");
            }
        } catch (e) {
            console.error(e);
            alert("Error");
        } finally {
            setProcessing(null);
        }
    };

    // Filter by search
    const filtered = bookings.filter(b =>
        (b.guestName?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (b.phone || '').includes(search)
    );

    const kycStatusColor = (status: string | undefined) => {
        switch (status) {
            case 'verified': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'submitted': return 'bg-amber-100 text-amber-800 border-amber-200 animate-pulse';
            case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-slate-100 text-slate-500 border-slate-200';
        }
    };

    return (
        <div className="space-y-6">
            <div className="relative max-w-md">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Search by Guest Name or Phone..."
                    className="pl-8"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-8"><Loader2 className="animate-spin mx-auto" /></div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">No matching bookings found.</div>
                ) : (
                    filtered.map(booking => (
                        <Card key={booking.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedBooking(booking)}>
                            <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4 justify-between">
                                {/* Info */}
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-lg">{booking.guestName}</h3>
                                        <Badge variant="outline" className={kycStatusColor(booking.kycStatus)}>
                                            KYC: {(booking.kycStatus || 'pending').replace('_', ' ')}
                                        </Badge>
                                        <Badge className={booking.status === 'confirmed' ? 'bg-green-600' : 'bg-blue-600'}>
                                            {booking.status.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                    <div className="text-sm text-slate-500 flex gap-4">
                                        <span>{booking.phone}</span>
                                        <span>
                                            {safeParseDate(booking.checkIn) ? format(safeParseDate(booking.checkIn)!, 'MMM d') : '-'}
                                            {' → '}
                                            {safeParseDate(booking.checkOut) ? format(safeParseDate(booking.checkOut)!, 'MMM d') : '-'}
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    {booking.status === 'confirmed' && (
                                        <>
                                            <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={(e) => { e.stopPropagation(); setSelectedBooking(booking); }}>
                                                <ShieldCheck className="w-4 h-4 mr-2" /> Verify KYC
                                            </Button>
                                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" disabled={processing === booking.id || booking.kycStatus !== 'verified'} onClick={(e) => handleAction(e, booking.id, 'check-in')}>
                                                {processing === booking.id ? <Loader2 className="animate-spin w-4 h-4" /> : <LogIn className="w-4 h-4 mr-2" />}
                                                Check In
                                            </Button>
                                        </>
                                    )}

                                    {booking.status === 'checked_in' && (
                                        <Button size="sm" variant="outline" onClick={(e) => handleAction(e, booking.id, 'check-out')} disabled={processing === booking.id}>
                                            {processing === booking.id ? <Loader2 className="animate-spin w-4 h-4" /> : <LogOut className="w-4 h-4 mr-2" />}
                                            Check Out
                                        </Button>
                                    )}

                                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedBooking(booking); }}>
                                        <Eye className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
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
