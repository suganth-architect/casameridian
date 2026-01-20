
import { getFirebaseAuth } from "@/lib/firebase";

export async function adminFetch(url: string, options: RequestInit = {}) {
    const auth = getFirebaseAuth();

    // hard wait for auth user
    const user = auth?.currentUser;
    if (!user) throw new Error("Not logged in. Please refresh.");

    const token = await user.getIdToken(true);

    const res = await fetch(url, {
        ...options,
        headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`,
        },
    });

    // handle HTML response bug
    const text = await res.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { }

    if (!res.ok) {
        const msg = data?.error || `Request failed (${res.status})`;
        const err = new Error(msg);
        // attach status for UI
        // @ts-ignore
        err.status = res.status;
        throw err;
    }

    return data;
}
