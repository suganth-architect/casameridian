
import * as React from 'react';
import { Loader2, Sparkles, Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getFirebaseAuth, getFirestoreDb } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import Image from 'next/image';

export function VisualsTab() {
    const [generating, setGenerating] = React.useState<string | null>(null);
    const [uploading, setUploading] = React.useState<string | null>(null);
    const [assets, setAssets] = React.useState<Record<string, any>>({});

    React.useEffect(() => {
        const db = getFirestoreDb();
        if (!db) return;
        const unsub = onSnapshot(collection(db, 'siteAssets'), (snap) => {
            const data: Record<string, any> = {};
            snap.forEach(doc => { data[doc.id] = doc.data(); });
            setAssets(data);
        });
        return () => unsub();
    }, []);

    const handleGenerate = async (type: string) => {
        const auth = getFirebaseAuth();
        if (!auth?.currentUser) return;
        if (!confirm(`Regenerate ${type} image using AI? This will replace the current image.`)) return;

        setGenerating(type);
        try {
            const token = await auth.currentUser.getIdToken();
            const res = await fetch('/api/admin/generate-assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ type }),
            });
            if (res.ok) alert("Generated!");
            else alert("Error generating");
        } catch (e) {
            console.error(e);
        } finally {
            setGenerating(null);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const auth = getFirebaseAuth();
        if (!auth?.currentUser) return;

        setUploading(type);
        try {
            const token = await auth.currentUser.getIdToken();
            const formData = new FormData();
            formData.append('file', file);
            formData.append('category', type);

            const res = await fetch('/api/admin/visuals/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                // Success - Firestore listener will auto-update the UI
                alert("Uploaded successfully!");
            } else {
                const err = await res.json();
                alert(err.error || "Upload failed");
            }
        } catch (e) {
            console.error(e);
            alert("Upload Error");
        } finally {
            setUploading(null);
            // Reset input
            e.target.value = '';
        }
    };

    const categories = ['hero', 'pool', 'bedroom'];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-[rgb(var(--meridian-blue))]" />
                    Site Visuals
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {categories.map((type) => (
                    <div key={type} className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border p-4 rounded-xl bg-slate-50/50">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="relative w-32 h-20 bg-slate-200 rounded-lg overflow-hidden border shadow-sm">
                                {assets[type]?.url ? (
                                    <Image src={assets[type].url} alt={type} fill className="object-cover" />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-400 text-xs">No Image</div>
                                )}
                            </div>
                            <div>
                                <h4 className="font-bold capitalize text-lg">{type}</h4>
                                <p className="text-xs text-slate-500">
                                    {assets[type]?.source === 'upload' ? 'Uploaded Manually' : 'AI Generated'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            {/* Upload Button */}
                            <div className="relative">
                                <Input
                                    type="file"
                                    id={`upload-${type}`}
                                    className="hidden"
                                    accept="image/png, image/jpeg, image/webp"
                                    onChange={(e) => handleUpload(e, type)}
                                    disabled={uploading === type || generating === type}
                                />
                                <Label htmlFor={`upload-${type}`}>
                                    <Button variant="outline" className="cursor-pointer" asChild disabled={uploading === type}>
                                        <span>
                                            {uploading === type ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                                            Upload
                                        </span>
                                    </Button>
                                </Label>
                            </div>

                            {/* Regenerate Button */}
                            <Button
                                onClick={() => handleGenerate(type)}
                                disabled={generating === type || uploading === type}
                                variant="outline"
                                className="border-amber-200 text-amber-700 hover:bg-amber-50"
                            >
                                {generating === type ? <Loader2 className="animate-spin w-4 h-4" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                Regenerate
                            </Button>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
