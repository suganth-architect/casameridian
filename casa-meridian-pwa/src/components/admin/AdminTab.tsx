
import * as React from 'react';
import { Loader2, UserPlus, Shield, UserX, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getFirebaseAuth } from '@/lib/firebase';

interface AdminUser {
    uid: string;
    email: string;
    name: string;
    role: 'owner' | 'admin' | 'staff';
    active: boolean;
}

export function AdminTab({ currentUserEmail }: { currentUserEmail: string | null }) {
    const [admins, setAdmins] = React.useState<AdminUser[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');

    // Create State
    const [newEmail, setNewEmail] = React.useState('');
    const [newName, setNewName] = React.useState('');
    const [newRole, setNewRole] = React.useState('staff');
    const [creating, setCreating] = React.useState(false);

    const fetchAdmins = async () => {
        try {
            const token = await getFirebaseAuth()?.currentUser?.getIdToken();
            const res = await fetch('/api/admin/admins', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setAdmins(data.admins);
            } else {
                setError("You are not authorized to view admins.");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => { fetchAdmins(); }, []);

    const handleCreate = async () => {
        setCreating(true);
        try {
            const token = await getFirebaseAuth()?.currentUser?.getIdToken();
            const res = await fetch('/api/admin/admins', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ email: newEmail, name: newName, role: newRole })
            });
            const data = await res.json();
            if (res.ok) {
                alert("Admin added successfully. They must login with this email.");
                setNewEmail(''); setNewName('');
                fetchAdmins();
            } else {
                alert(data.error);
            }
        } catch (e) { console.error(e); } finally { setCreating(false); }
    };

    const handleDelete = async (uid: string) => {
        if (!confirm("Permanently remove this admin?")) return;
        try {
            const token = await getFirebaseAuth()?.currentUser?.getIdToken();
            await fetch(`/api/admin/admins/${uid}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchAdmins();
        } catch (e) {
            console.error(e);
        }
    };

    if (error) return <div className="text-red-500 font-medium text-center p-8 bg-red-50 rounded-lg">{error}</div>;

    return (
        <div className="space-y-8">
            <Card className="border-l-4 border-l-[rgb(var(--meridian-blue))]">
                <CardContent className="p-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><UserPlus className="h-5 w-5" /> Add New Admin</h3>
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="space-y-1 flex-1 w-full">
                            <label className="text-xs font-medium uppercase text-slate-500">Email (Must match Google Auth)</label>
                            <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="user@gmail.com" />
                        </div>
                        <div className="space-y-1 flex-1 w-full">
                            <label className="text-xs font-medium uppercase text-slate-500">Name</label>
                            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full Name" />
                        </div>
                        <div className="space-y-1 w-full md:w-32">
                            <label className="text-xs font-medium uppercase text-slate-500">Role</label>
                            <Select value={newRole} onValueChange={setNewRole}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="staff">Staff</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="owner">Owner</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button className="w-full md:w-auto bg-[rgb(var(--meridian-blue))]" onClick={handleCreate} disabled={creating || !newEmail || !newName}>
                            {creating && <Loader2 className="animate-spin mr-2 h-4 w-4" />} Add
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <h3 className="font-bold text-lg text-slate-600">Active Admins</h3>
                {loading ? <Loader2 className="animate-spin" /> : admins.map(admin => (
                    <Card key={admin.uid}>
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-[rgb(var(--meridian-blue))] font-bold text-lg">
                                    {admin.name.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="font-bold">{admin.name} {admin.email === currentUserEmail && <span className="text-xs text-slate-400">(You)</span>}</h4>
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                        <span>{admin.email}</span>
                                        <Badge variant="outline" className="uppercase text-[10px]">{admin.role}</Badge>
                                    </div>
                                </div>
                            </div>
                            {admin.email !== currentUserEmail && (
                                <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(admin.uid)}>
                                    <UserX className="h-4 w-4" />
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
