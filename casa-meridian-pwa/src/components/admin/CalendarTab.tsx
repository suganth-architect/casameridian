
import * as React from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameDay,
    isSameMonth,
    addMonths,
    subMonths,
    isWithinInterval,
    parseISO,
    startOfDay,
    endOfDay
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, AlertCircle, Calendar as CalendarIcon, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { getFirebaseAuth, getFirestoreDb } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, Timestamp, orderBy } from 'firebase/firestore';

// Types
interface Booking {
    id: string;
    guestName: string;
    phone: string;
    checkIn: string; // YYYY-MM-DD
    checkOut: string; // YYYY-MM-DD
    status: string;
    totalAmount: number;
    nights: number;
}

interface CalendarBlock {
    id: string;
    type: 'maintenance' | 'ownerHold';
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    note: string;
    createdBy: string;
}

export function CalendarTab() {
    const [currentDate, setCurrentDate] = React.useState(new Date());
    const [bookings, setBookings] = React.useState<Booking[]>([]);
    const [blocks, setBlocks] = React.useState<CalendarBlock[]>([]);
    const [loading, setLoading] = React.useState(false);

    // Interactions
    const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
    const [isAddBlockOpen, setIsAddBlockOpen] = React.useState(false);

    // Form State
    const [blockForm, setBlockForm] = React.useState({
        startDate: undefined as Date | undefined,
        endDate: undefined as Date | undefined,
        type: 'maintenance',
        note: ''
    });
    const [submittingBlock, setSubmittingBlock] = React.useState(false);

    // Fetch Data
    const fetchData = async () => {
        setLoading(true);
        const db = getFirestoreDb();
        if (!db) { setLoading(false); return; }

        // Visual Range (include overlap)
        const rangeStart = format(startOfMonth(currentDate), 'yyyy-MM-dd');
        const rangeEnd = format(endOfMonth(currentDate), 'yyyy-MM-dd');

        try {
            // 1. Fetch Bookings (checkIn <= rangeEnd)
            // Client filter: checkOut >= rangeStart
            const bookingsRef = collection(db, 'bookings');
            const bQuery = query(
                bookingsRef,
                where('checkIn', '<=', rangeEnd),
                orderBy('checkIn', 'asc')
            );
            const bSnap = await getDocs(bQuery);
            const loadedBookings: Booking[] = [];
            bSnap.forEach(doc => {
                const d = doc.data();
                if (d.checkOut >= rangeStart && ['confirmed', 'active'].includes(d.status)) {
                    loadedBookings.push({ id: doc.id, ...d } as Booking);
                }
            });
            setBookings(loadedBookings);

            // 2. Fetch Blocks (startDate <= rangeEnd)
            // Client filter: endDate >= rangeStart
            const blocksRef = collection(db, 'calendarBlocks');
            const blQuery = query(
                blocksRef,
                where('startDate', '<=', rangeEnd),
                orderBy('startDate', 'asc')
            );
            const blSnap = await getDocs(blQuery);
            const loadedBlocks: CalendarBlock[] = [];
            blSnap.forEach(doc => {
                const d = doc.data();
                if (d.endDate >= rangeStart) {
                    loadedBlocks.push({ id: doc.id, ...d } as CalendarBlock);
                }
            });
            setBlocks(loadedBlocks);

        } catch (error) {
            console.error("Error loading calendar data:", error);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchData();
    }, [currentDate]);

    // Calendar Grid Generation
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Helper to get events for a day
    const getEventsForDay = (day: Date) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayBookings = bookings.filter(b => dateStr >= b.checkIn && dateStr < b.checkOut);
        // Note: Booking checkOut is exclusive for stay, but visually we might want to show it as half day?
        // Requirement: "booked ranges as solid highlight". usually [checkIn, checkOut).

        const dayBlocks = blocks.filter(b => dateStr >= b.startDate && dateStr <= b.endDate);
        // Blocks are typically inclusive [start, end].

        return { dayBookings, dayBlocks };
    };

    const handleAddBlock = async () => {
        if (!blockForm.startDate || !blockForm.endDate) return;
        setSubmittingBlock(true);
        try {
            const db = getFirestoreDb();
            const auth = getFirebaseAuth();
            if (!db || !auth?.currentUser) return;

            await addDoc(collection(db, 'calendarBlocks'), {
                startDate: format(blockForm.startDate, 'yyyy-MM-dd'),
                endDate: format(blockForm.endDate, 'yyyy-MM-dd'),
                type: blockForm.type,
                note: blockForm.note,
                createdBy: auth.currentUser.email,
                createdAt: serverTimestamp()
            });

            setIsAddBlockOpen(false);
            setBlockForm({ startDate: undefined, endDate: undefined, type: 'maintenance', note: '' });
            fetchData();
        } catch (e) {
            console.error(e);
            alert("Failed to add block");
        } finally {
            setSubmittingBlock(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-200px)]">

            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold bg-white px-4 py-2 rounded-lg border shadow-sm">
                        {format(currentDate, 'MMMM yyyy')}
                    </h2>
                    <div className="flex gap-1">
                        <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => setCurrentDate(new Date())}>
                            Today
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <Dialog open={isAddBlockOpen} onOpenChange={setIsAddBlockOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-red-600 hover:bg-red-700 text-white"><Plus className="w-4 h-4 mr-2" /> Block Dates</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Block Dates (Maintenance / Hold)</DialogTitle></DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Start Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild><Button variant="outline" className="w-full text-left font-normal">{blockForm.startDate ? format(blockForm.startDate, 'PPP') : <span>Pick date</span>}</Button></PopoverTrigger>
                                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={blockForm.startDate} onSelect={d => setBlockForm({ ...blockForm, startDate: d })} initialFocus /></PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2">
                                    <Label>End Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild><Button variant="outline" className="w-full text-left font-normal">{blockForm.endDate ? format(blockForm.endDate, 'PPP') : <span>Pick date</span>}</Button></PopoverTrigger>
                                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={blockForm.endDate} onSelect={d => setBlockForm({ ...blockForm, endDate: d })} initialFocus /></PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <Select value={blockForm.type} onValueChange={v => setBlockForm({ ...blockForm, type: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="maintenance">Maintenance</SelectItem>
                                        <SelectItem value="ownerHold">Owner Hold</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Note</Label>
                                <Textarea value={blockForm.note} onChange={e => setBlockForm({ ...blockForm, note: e.target.value })} placeholder="Reason for blocking..." />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddBlockOpen(false)}>Cancel</Button>
                            <Button className="bg-red-600 hover:bg-red-700" onClick={handleAddBlock} disabled={submittingBlock}>
                                {submittingBlock && <Loader2 className="animate-spin mr-2 h-4 w-4" />} Block Dates
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex gap-6 h-full overflow-hidden">
                {/* Calendar Grid */}
                <div className="flex-1 overflow-y-auto bg-white rounded-xl border shadow-sm p-4">
                    <div className="grid grid-cols-7 gap-2 mb-2 text-center text-sm font-medium text-slate-500 uppercase tracking-wider">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
                    </div>

                    <div className="grid grid-cols-7 gap-2 auto-rows-fr">
                        {/* Empty cells for padding start of month */}
                        {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                            <div key={`empty-${i}`} className="min-h-[100px] bg-slate-50/50 rounded-lg p-2 opacity-50"></div>
                        ))}

                        {daysInMonth.map((day) => {
                            const { dayBookings, dayBlocks } = getEventsForDay(day);
                            const isSelected = selectedDate && isSameDay(day, selectedDate);
                            const isToday = isSameDay(day, new Date());

                            return (
                                <div
                                    key={day.toISOString()}
                                    onClick={() => setSelectedDate(day)}
                                    className={`
                                        min-h-[100px] rounded-lg border p-2 cursor-pointer transition-all hover:shadow-md flex flex-col gap-1 relative overflow-hidden
                                        ${isSelected ? 'ring-2 ring-[rgb(var(--meridian-blue))] border-[rgb(var(--meridian-blue))] z-10' : 'border-slate-100'}
                                        ${isToday ? 'bg-amber-50' : 'bg-white'}
                                    `}
                                >
                                    <span className={`text-sm font-medium ${isToday ? 'text-[rgb(var(--meridian-gold))]' : 'text-slate-700'}`}>
                                        {format(day, 'd')}
                                    </span>

                                    {/* Indicators */}
                                    <div className="flex flex-col gap-1 mt-1">
                                        {dayBookings.map(b => (
                                            <div key={b.id} className="text-[10px] bg-[rgb(var(--meridian-blue))] text-white px-1.5 py-0.5 rounded truncate opacity-90">
                                                {b.guestName}
                                            </div>
                                        ))}
                                        {dayBlocks.map(b => (
                                            <div key={b.id} className={`text-[10px] px-1.5 py-0.5 rounded truncate text-white ${b.type === 'maintenance' ? 'bg-red-500' : 'bg-orange-400'}`}>
                                                {b.note || b.type}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Sidebar Details Panel */}
                <div className="w-80 shrink-0 flex flex-col gap-4">
                    <Card className="h-full border-none shadow-none bg-slate-50">
                        <CardContent className="p-4 h-full overflow-y-auto">
                            {!selectedDate ? (
                                <div className="h-full flex items-center justify-center text-center text-slate-400 text-sm p-4">
                                    <p>Select a date to view details</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-[rgb(var(--meridian-blue))]">{format(selectedDate, 'EEEE, MMMM d')}</h3>
                                        <p className="text-xs text-slate-500 uppercase font-medium tracking-wider">Daily Summary</p>
                                    </div>

                                    {/* Bookings on this day */}
                                    <div className="space-y-3">
                                        <p className="text-sm font-semibold text-slate-700">Bookings</p>
                                        {getEventsForDay(selectedDate).dayBookings.length === 0 ? (
                                            <p className="text-xs text-slate-400 italic">No bookings for this day.</p>
                                        ) : (
                                            getEventsForDay(selectedDate).dayBookings.map(b => (
                                                <Card key={b.id} className="shadow-sm border-l-4 border-l-[rgb(var(--meridian-gold))]">
                                                    <CardContent className="p-3 space-y-2">
                                                        <div className="flex justify-between items-start">
                                                            <div className="font-bold text-sm truncate">{b.guestName}</div>
                                                            <Badge variant="outline" className="text-[10px] h-5">{b.status}</Badge>
                                                        </div>
                                                        <div className="text-xs text-slate-500 space-y-1">
                                                            <div className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> {b.nights} Nights</div>
                                                            <div>{b.phone}</div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))
                                        )}
                                    </div>

                                    {/* Blocks on this day */}
                                    <div className="space-y-3">
                                        <p className="text-sm font-semibold text-slate-700">Blocked / Maintenance</p>
                                        {getEventsForDay(selectedDate).dayBlocks.length === 0 ? (
                                            <p className="text-xs text-slate-400 italic">No blocks for this day.</p>
                                        ) : (
                                            getEventsForDay(selectedDate).dayBlocks.map(b => (
                                                <Card key={b.id} className={`shadow-sm border-l-4 ${b.type === 'maintenance' ? 'border-l-red-500' : 'border-l-orange-400'}`}>
                                                    <CardContent className="p-3 space-y-2">
                                                        <div className="flex justify-between items-start">
                                                            <div className="font-bold text-sm capitalize">{b.type}</div>
                                                        </div>
                                                        <p className="text-xs text-slate-600">{b.note}</p>
                                                        <div className="text-[10px] text-slate-400">
                                                            {b.startDate} → {b.endDate}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))
                                        )}
                                    </div>

                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
