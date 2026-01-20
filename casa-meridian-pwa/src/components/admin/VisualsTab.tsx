
import * as React from 'react';
import { Loader2, Sparkles, Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getFirebaseAuth, getFirestoreDb } from '@/lib/firebase';
import { adminFetch } from '@/lib/admin-api';
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
        if (!confirm(`Regenerate ${type} image using AI? This will replace the current image.`)) return;

        setGenerating(type);
        try {
            await adminFetch('/api/admin/generate-assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type }),
            });
            alert("Generated!");
        } catch (e: any) {
            console.error(e);
            alert(e.message || "Error generating");
        } finally {
            setGenerating(null);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(type);
        try {
            // 1. Get Signed URL
            const { uploadUrl, storagePath, publicUrl } = await adminFetch('/api/admin/visuals/create-upload-url', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    key: type,
                    filename: file.name,
                    contentType: file.type
                })
            });

            // 2. Upload to Storage (PUT) - DIRECT FETCH (Not Admin API)
            const uploadRes = await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': file.type },
                body: file
            });

            if (!uploadRes.ok) throw new Error("Storage upload failed");

            // 3. Confirm Upload
            await adminFetch('/api/admin/visuals/confirm-upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ key: type, storagePath, publicUrl })
            });

            alert("Uploaded successfully!");

        } catch (e: any) {
            console.error(e);
            alert(e.message || "Upload Error");
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
