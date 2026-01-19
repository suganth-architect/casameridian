
import * as React from 'react';
import { format } from 'date-fns';
import { Loader2, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { getFirebaseAuth } from '@/lib/firebase';
import { Input } from '@/components/ui/input';

interface BlockedDate {
    id: string;
    startDate: string;
    endDate: string;
    reason: string;
    notes?: string;
}

export function CalendarTab() {
    const [blocks, setBlocks] = React.useState<BlockedDate[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [isAddOpen, setIsAddOpen] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);

    const [form, setForm] = React.useState({
        startDate: undefined as Date | undefined,
        endDate: undefined as Date | undefined,
        reason: 'maintenance',
        notes: ''
    });

    const fetchBlocks = async () => {
        try {
            const token = await getFirebaseAuth()?.currentUser?.getIdToken();
            if (!token) return;
            const res = await fetch('/api/admin/blocked-dates', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.blocks) setBlocks(data.blocks);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => { fetchBlocks(); }, []);

    const handleCreate = async () => {
        if (!form.startDate || !form.endDate) return;
        setSubmitting(true);
        try {
            const token = await getFirebaseAuth()?.currentUser?.getIdToken();
            const res = await fetch('/api/admin/blocked-dates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    startDate: format(form.startDate, 'yyyy-MM-dd'),
                    endDate: format(form.endDate, 'yyyy-MM-dd'),
                    reason: form.reason,
                    notes: form.notes
                })
            });
            if (res.ok) {
                setIsAddOpen(false);
                setForm({ startDate: undefined, endDate: undefined, reason: 'maintenance', notes: '' });
                fetchBlocks();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Unblock these dates?")) return;
        try {
            const token = await getFirebaseAuth()?.currentUser?.getIdToken();
            await fetch(`/api/admin/blocked-dates?id=${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchBlocks();
        } catch (e) { console.error(e); }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
                <h2 className="font-bold text-lg">Calendar Locks</h2>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-[rgb(var(--meridian-blue))]">Block Dates</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Block Calendar Dates</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Start Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal">{form.startDate ? format(form.startDate, 'PPP') : <span>Pick date</span>}</Button></PopoverTrigger>
                                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={form.startDate} onSelect={d => setForm({ ...form, startDate: d })} initialFocus /></PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                    <Label>End Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal">{form.endDate ? format(form.endDate, 'PPP') : <span>Pick date</span>}</Button></PopoverTrigger>
                                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={form.endDate} onSelect={d => setForm({ ...form, endDate: d })} initialFocus /></PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                            <div className="space-y-2"><Label>Reason</Label>
                                <Select value={form.reason} onValueChange={v => setForm({ ...form, reason: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="maintenance">Maintenance</SelectItem>
                                        <SelectItem value="privateBooking">Private Booking</SelectItem>
                                        <SelectItem value="ownerBlocked">Owner Blocked</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2"><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                            <Button className="w-full bg-red-600 hover:bg-red-700 text-white" onClick={handleCreate} disabled={submitting}>
                                {submitting ? <Loader2 className="animate-spin mr-2" /> : null} Block Dates
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4">
                {loading ? <Loader2 className="animate-spin mx-auto" /> : blocks.map(block => (
                    <Card key={block.id}>
                        <CardContent className="p-4 flex justify-between items-center">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="border-red-200 text-red-600 bg-red-50 uppercase text-xs">{block.reason}</Badge>
                                    <span className="font-mono font-medium">{block.startDate} → {block.endDate}</span>
                                </div>
                                {block.notes && <p className="text-sm text-slate-500 italic">"{block.notes}"</p>}
                            </div>
                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600" onClick={() => handleDelete(block.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
