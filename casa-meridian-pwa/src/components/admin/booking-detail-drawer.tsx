import * as React from 'react';
import { format } from 'date-fns';
import {
    CalendarDays, CreditCard, User, Mail, Phone,
    CheckCircle, XCircle, Clock, ShieldCheck, ShieldAlert,
    LogIn, LogOut, FileText, ExternalLink, AlertTriangle, Eye, UploadCloud
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getFirebaseAuth } from '@/lib/firebase';
import { Booking, KycDocument } from '@/lib/types';

interface BookingDetailDrawerProps {
    booking: Booking | null;
    open: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export function BookingDetailDrawer({ booking, open, onClose, onUpdate }: BookingDetailDrawerProps) {
    const [processing, setProcessing] = React.useState(false);
    const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false);
    const [rejectReason, setRejectReason] = React.useState('');

    // Cancel / No-Show State
    const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
    const [cancelReason, setCancelReason] = React.useState('');
    const [cancelType, setCancelType] = React.useState('cancelled_by_admin');

    const [noShowDialogOpen, setNoShowDialogOpen] = React.useState(false);

    // OTA Details State
    const [otaSource, setOtaSource] = React.useState(booking?.source || 'direct');
    const [extId, setExtId] = React.useState(booking?.externalBookingId || '');
    const [extRef, setExtRef] = React.useState(booking?.externalReservationCode || '');
    const [otaCommission, setOtaCommission] = React.useState(booking?.channelCommissionPct?.toString() || '');
    const [payout, setPayout] = React.useState(booking?.payoutAmount?.toString() || '');

    React.useEffect(() => {
        if (booking) {
            setOtaSource(booking.source || 'direct');
            setExtId(booking.externalBookingId || '');
            setExtRef(booking.externalReservationCode || '');
            setOtaCommission(booking.channelCommissionPct?.toString() || '');
            setPayout(booking.payoutAmount?.toString() || '');
        }
    }, [booking]);

    if (!booking) return null;

    // --- Actions ---
    const callApi = async (url: string, method: 'POST' | 'PATCH', body?: any) => {
        setProcessing(true);
        try {
            const token = await getFirebaseAuth()?.currentUser?.getIdToken();
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: body ? JSON.stringify(body) : undefined
            });
            if (!res.ok) {
                const err = await res.json();
                alert(err.error || "Operation failed"); // Ideally toast
            } else {
                onUpdate();
                if (url.includes('reject')) setRejectDialogOpen(false);
            }
        } catch (e: any) {
            console.error(e);
            alert(e.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleVerifyKyc = () => callApi(`/api/admin/bookings/${booking.id}/verify-kyc`, 'POST', { action: 'verify' });
    const handleRejectKyc = () => callApi(`/api/admin/bookings/${booking.id}/verify-kyc`, 'POST', { action: 'reject', reason: rejectReason });
    const handleCheckIn = () => callApi(`/api/admin/bookings/${booking.id}/check-in`, 'POST');
    const handleCheckOut = () => callApi(`/api/admin/bookings/${booking.id}/check-out`, 'POST');

    const handleCancel = async () => {
        await callApi(`/api/admin/bookings/${booking.id}/cancel`, 'POST', {
            reason: cancelReason,
            cancellationType: cancelType
        });
        setCancelDialogOpen(false);
    };

    const handleNoShow = async () => {
        await callApi(`/api/admin/bookings/${booking.id}/no-show`, 'POST', {});
        setNoShowDialogOpen(false);
    };

    const handleUpdateSource = async () => {
        await callApi(`/api/admin/bookings/${booking.id}/source`, 'PATCH', {
            source: otaSource,
            externalBookingId: extId,
            externalReservationCode: extRef,
            channelCommissionPct: otaCommission ? Number(otaCommission) : undefined,
            payoutAmount: payout ? Number(payout) : undefined
        });
    };

    // --- Helpers ---
    const formatDate = (ts: any) => {
        if (!ts) return null;
        const date = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
        return format(date, "MMM d, yyyy h:mm a");
    };

    // --- Timeline Data ---
    const timelineEvents = [
        { label: 'Booking Created', date: booking.createdAt, icon: Clock, color: 'text-slate-500' },
        { label: 'Approved', date: booking.approvedAt, icon: CheckCircle, color: 'text-blue-500' }, // Assuming approvedAt exists or logic implies it
        { label: 'KYC Submitted', date: booking.kycDocuments?.[0]?.uploadedAt, icon: UploadCloud, color: 'text-amber-500' }, // Proxy for submission
        { label: 'KYC Verified', date: booking.verifiedAt, icon: ShieldCheck, color: 'text-emerald-500' },
        { label: 'KYC Rejected', date: booking.rejectedAt, icon: ShieldAlert, color: 'text-red-500', note: booking.rejectionReason },
        { label: 'Checked In', date: booking.checkedInAt, icon: LogIn, color: 'text-indigo-500' },
        { label: 'Checked Out', date: booking.checkedOutAt, icon: LogOut, color: 'text-slate-700' },
    ].filter(e => e.date).sort((a, b) => {
        const tA = (a.date as any).seconds || new Date(a.date as any).getTime();
        const tB = (b.date as any).seconds || new Date(b.date as any).getTime();
        return tA - tB;
    });

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <DialogTitle className="text-2xl font-bold">{booking.guestName}</DialogTitle>
                            <DialogDescription className="text-base mt-1 flex items-center gap-2">
                                <span className={booking.status === 'confirmed' ? 'text-green-600' : 'text-slate-600'}>
                                    {booking.status.toUpperCase().replace('_', ' ')}
                                </span>
                                <span>•</span>
                                <span className="font-mono">{booking.id.slice(0, 8)}</span>
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
                    {/* Left Column: Details */}
                    <div className="md:col-span-2 space-y-6">

                        {/* Guest & Stay Info */}
                        <Card>
                            <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Phone className="w-4 h-4 text-slate-400" /> {booking.phone}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Mail className="w-4 h-4 text-slate-400" /> {booking.email || 'N/A'}
                                    </div>
                                </div>
                                <Separator />
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-slate-500 text-xs uppercase">Check In</Label>
                                        <div className="font-semibold">{booking.checkIn}</div>
                                    </div>
                                    <div>
                                        <Label className="text-slate-500 text-xs uppercase">Check Out</Label>
                                        <div className="font-semibold">{booking.checkOut}</div>
                                    </div>
                                    <div>
                                        <Label className="text-slate-500 text-xs uppercase">Total</Label>
                                        <div className="font-semibold text-lg">₹{booking.totalAmount}</div>
                                    </div>
                                    <div>
                                        <Label className="text-slate-500 text-xs uppercase">Nights</Label>
                                        <div className="font-semibold text-lg">
                                            {Math.ceil((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 3600 * 24))}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* OTA Details */}
                        <Card>
                            <CardHeader><CardTitle className="text-base">Source & OTA Details</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Source</Label>
                                        <Select value={otaSource} onValueChange={(v) => setOtaSource(v as any)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="direct">Direct</SelectItem>
                                                <SelectItem value="walkin">Walk-in</SelectItem>
                                                <SelectItem value="ota_booking_com">Booking.com</SelectItem>
                                                <SelectItem value="ota_agoda">Agoda</SelectItem>
                                                <SelectItem value="ota_mmt">MakeMyTrip</SelectItem>
                                                <SelectItem value="other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Ext. Ref Code</Label>
                                        <Input value={extRef} onChange={e => setExtRef(e.target.value)} placeholder="e.g. 123456" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Ext. Booking ID</Label>
                                        <Input value={extId} onChange={e => setExtId(e.target.value)} placeholder="Official ID" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Payout Amount</Label>
                                        <Input type="number" value={payout} onChange={e => setPayout(e.target.value)} placeholder="Amount" />
                                    </div>
                                </div>
                                <Button size="sm" variant="outline" onClick={handleUpdateSource} disabled={processing}>Save Changes</Button>
                            </CardContent>
                        </Card>

                        {/* KYC Section */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-base">Identity Verification</CardTitle>
                                <Badge variant="outline" className={
                                    booking.kycStatus === 'verified' ? 'bg-emerald-100 text-emerald-800' :
                                        booking.kycStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                                            booking.kycStatus === 'submitted' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                                                'bg-slate-100'
                                }>
                                    {booking.kycStatus?.toUpperCase() || 'NOT SUBMITTED'}
                                </Badge>
                            </CardHeader>
                            <CardContent>
                                {booking.kycDocuments && booking.kycDocuments.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                                        {booking.kycDocuments.map((doc, idx) => (
                                            <div key={idx} className="group relative aspect-video bg-slate-100 rounded-lg overflow-hidden border cursor-pointer hover:ring-2 ring-blue-500 transition-all" onClick={() => window.open(doc.url, '_blank')}>
                                                {(doc.contentType?.startsWith('image/') || doc.url.match(/\.(jpeg|jpg|png|webp)/i)) ? (
                                                    <img src={doc.url} alt={doc.type} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-slate-400">
                                                        <FileText className="w-8 h-8" />
                                                    </div>
                                                )}
                                                <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[10px] p-1 truncate flex justify-between items-center">
                                                    <span className="capitalize">{doc.type}</span>
                                                    <ExternalLink className="w-3 h-3" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-sm text-slate-500 italic py-4">No documents uploaded yet.</div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Timeline & Actions */}
                    <div className="space-y-6">
                        {/* Timeline */}
                        <Card className="h-fit">
                            <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
                            <CardContent className="relative pl-6 border-l-2 border-slate-100 ml-4 space-y-6">
                                {timelineEvents.map((event, i) => (
                                    <div key={i} className="relative">
                                        <div className={`absolute -left-[31px] bg-white p-1 rounded-full border ${event.color === 'text-slate-500' ? 'border-slate-200' : 'border-current'}`}>
                                            <event.icon className={`w-4 h-4 ${event.color}`} />
                                        </div>
                                        <div className="text-sm font-medium">{event.label}</div>
                                        <div className="text-xs text-slate-500">{formatDate(event.date)}</div>
                                        {event.note && (
                                            <div className="mt-1 text-xs bg-red-50 text-red-800 p-2 rounded border border-red-100">
                                                {event.note}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {timelineEvents.length === 0 && <div className="text-sm text-slate-400">No events recorded.</div>}
                            </CardContent>
                        </Card>

                        {/* Operations Actions */}
                        <div className="space-y-3">
                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Operations</Label>

                            {/* Verify / Reject */}
                            {booking.kycStatus === 'submitted' && booking.status === 'confirmed' && (
                                <div className="grid grid-cols-2 gap-2">
                                    <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleVerifyKyc} disabled={processing}>
                                        <ShieldCheck className="w-4 h-4 mr-2" /> Verify
                                    </Button>
                                    <Button variant="destructive" onClick={() => setRejectDialogOpen(true)} disabled={processing}>
                                        <ShieldAlert className="w-4 h-4 mr-2" /> Reject
                                    </Button>
                                </div>
                            )}

                            {/* Check In */}
                            <Button
                                className="w-full bg-blue-600 hover:bg-blue-700"
                                onClick={handleCheckIn}
                                disabled={processing || booking.status !== 'confirmed' || booking.kycStatus !== 'verified'}
                            >
                                <LogIn className="w-4 h-4 mr-2" /> Check In
                            </Button>
                            {booking.status === 'confirmed' && booking.kycStatus !== 'verified' && (
                                <p className="text-[10px] text-amber-600 flex items-center justify-center">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    KYC Verification Required
                                </p>
                            )}

                            {/* Check Out */}
                            <Button
                                className="w-full"
                                variant="outline"
                                onClick={handleCheckOut}
                                disabled={processing || booking.status !== 'checked_in'}
                            >
                                <LogOut className="w-4 h-4 mr-2" /> Check Out
                            </Button>

                        </div>

                        {/* Dangerous Actions */}
                        <div className="space-y-3 pt-4 border-t">
                            <Label className="text-xs font-semibold text-red-500 uppercase tracking-wider">Cancellations</Label>

                            {/* Cancel Button */}
                            {booking.status === 'confirmed' && (
                                <Button variant="destructive" className="w-full" onClick={() => setCancelDialogOpen(true)} disabled={processing}>
                                    Cancel Booking
                                </Button>
                            )}

                            {/* No Show Button */}
                            {booking.status === 'confirmed' && !booking.noShow && (
                                <Button variant="destructive" className="w-full bg-red-700 hover:bg-red-800" onClick={() => setNoShowDialogOpen(true)} disabled={processing}>
                                    Mark No-Show
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Rejection Dialog */}
                <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Reject KYC Documents</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-2">
                            <Label>Reason for rejection</Label>
                            <Textarea
                                placeholder="e.g. ID blurry, Name mismatch..."
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                            />
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
                                <Button variant="destructive" onClick={handleRejectKyc} disabled={!rejectReason || processing}>Confirm Rejection</Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Cancel Dialog */}
                <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Cancel Booking</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-2">
                            <Label>Cancellation Reason</Label>
                            <Textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Why is this being cancelled?" />
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <Select value={cancelType} onValueChange={(v) => setCancelType(v as any)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cancelled_by_admin">By Admin</SelectItem>
                                        <SelectItem value="cancelled_by_guest">By Guest</SelectItem>
                                        <SelectItem value="cancelled_by_ota">By OTA</SelectItem>
                                        <SelectItem value="payment_failed">Payment Failed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => setCancelDialogOpen(false)}>Back</Button>
                                <Button variant="destructive" onClick={handleCancel} disabled={!cancelReason || processing}>Confirm Cancellation</Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* No Show Dialog */}
                <Dialog open={noShowDialogOpen} onOpenChange={setNoShowDialogOpen}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Mark No-Show</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-2">
                            <p className="text-sm text-slate-500">
                                This will cancel the booking and mark it as a No-Show. The dates will be freed immediately.
                            </p>
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => setNoShowDialogOpen(false)}>Back</Button>
                                <Button variant="destructive" onClick={handleNoShow} disabled={processing}>Confirm No-Show</Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
}
