
import * as React from 'react';
import { Loader2, Search, Upload, FileText, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { getFirebaseAuth } from '@/lib/firebase';

interface CheckinDocs {
    guestIdProofUrl?: string;
    signedAgreementUrl?: string;
    updatedAt?: string;
}

export function CheckinTab() {
    const [search, setSearch] = React.useState('');
    const [bookingId, setBookingId] = React.useState('');
    const [docs, setDocs] = React.useState<CheckinDocs | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [uploading, setUploading] = React.useState(false);

    const handleSearch = async () => {
        if (!search) return;
        setLoading(true);
        // Requirement: Search by phone or bookingId. 
        // Admin API currently gets docs by BookingId.
        // We might need a lookup step if searching by phone.
        // For now, let's assume search IS BookingId (UI Requirement: "Search booking by phone / bookingId")
        // If it's phone, we need to find the active booking for that phone.
        // Let's implement Booking Lookup locally here?
        // Or just ask user for Booking ID.
        // For MVP 2.0, let's defer phone lookup and stick to Booking ID or implement a basic filter in "Bookings Tab" to get ID.
        // Actually, let's try to fetch docs directly.
        setBookingId(search);

        try {
            const token = await getFirebaseAuth()?.currentUser?.getIdToken();
            const res = await fetch(`/api/admin/checkin/${search}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.documents) {
                setDocs(data.documents);
            } else {
                setDocs({}); // Empty but found
            }
        } catch (e) {
            console.error(e);
            setDocs(null); // Not found or error
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (file: File, type: 'guestIdProof' | 'signedAgreement') => {
        if (!bookingId) return;
        setUploading(true);
        try {
            const token = await getFirebaseAuth()?.currentUser?.getIdToken();
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', type);

            const res = await fetch(`/api/admin/checkin/${bookingId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                handleSearch(); // Refresh
                alert("Uploaded successfully");
            } else {
                alert("Upload failed");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex gap-2 max-w-md">
                <Input placeholder="Enter Booking ID" value={search} onChange={e => setSearch(e.target.value)} />
                <Button onClick={handleSearch} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : <Search className="w-4 h-4" />}</Button>
            </div>

            {docs && (
                <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <FileText className="w-5 h-5 text-[rgb(var(--meridian-blue))]" />
                                Guest ID Proof
                                {docs.guestIdProofUrl && <CheckCircle className="w-4 h-4 text-green-500" />}
                            </h3>

                            {docs.guestIdProofUrl ? (
                                <div className="space-y-2">
                                    <a href={docs.guestIdProofUrl} target="_blank" className="text-blue-600 underline text-sm break-all">View Document</a>
                                    <p className="text-xs text-slate-400">Click to open in new tab</p>
                                </div>
                            ) : (
                                <div className="h-32 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-sm">No Document</div>
                            )}

                            <div className="pt-4 border-t">
                                <Label>Upload / Replace</Label>
                                <Input type="file" className="mt-2" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'guestIdProof')} disabled={uploading} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <FileText className="w-5 h-5 text-[rgb(var(--meridian-blue))]" />
                                Signed Agreement
                                {docs.signedAgreementUrl && <CheckCircle className="w-4 h-4 text-green-500" />}
                            </h3>

                            {docs.signedAgreementUrl ? (
                                <div className="space-y-2">
                                    <a href={docs.signedAgreementUrl} target="_blank" className="text-blue-600 underline text-sm break-all">View Document</a>
                                </div>
                            ) : (
                                <div className="h-32 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-sm">No Document</div>
                            )}

                            <div className="pt-4 border-t">
                                <Label>Upload / Replace</Label>
                                <Input type="file" className="mt-2" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'signedAgreement')} disabled={uploading} />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
