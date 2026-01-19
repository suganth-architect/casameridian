
import { adminAuth, adminDb } from './firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

export interface AdminProfile {
    uid: string;
    email: string;
    name: string;
    role: 'owner' | 'admin' | 'staff';
    active: boolean;
}

export type AdminRole = 'owner' | 'admin' | 'staff';

const ROLE_HIERARCHY: Record<AdminRole, number> = {
    'owner': 3,
    'admin': 2,
    'staff': 1
};

export async function verifyAdmin(req: NextRequest, requiredRole: AdminRole = 'staff') {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return { error: 'Missing or invalid token', status: 401 };
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(token);

        // Fetch admin profile from Firestore
        const adminDoc = await adminDb.collection('admins').doc(decodedToken.uid).get();

        if (!adminDoc.exists) {
            // FALLBACK/SEED: If user is "luckysuganth@gmail.com", allow them as Owner if doc doesn't exist
            // This prevents lockout during setup.
            if (decodedToken.email === 'luckysuganth@gmail.com') {
                const seedProfile: AdminProfile = {
                    uid: decodedToken.uid,
                    email: decodedToken.email!,
                    name: decodedToken.name || 'Admin',
                    role: 'owner',
                    active: true,
                };
                // Auto-seed
                await adminDb.collection('admins').doc(decodedToken.uid).set({
                    ...seedProfile,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    lastLoginAt: new Date()
                });
                return { admin: seedProfile };
            }

            return { error: 'Admin profile not found', status: 403 };
        }

        const adminData = adminDoc.data() as AdminProfile;

        if (!adminData.active) {
            return { error: 'Admin account is inactive', status: 403 };
        }

        // Check Role Hierarchy
        if (ROLE_HIERARCHY[adminData.role] < ROLE_HIERARCHY[requiredRole]) {
            return { error: 'Insufficient permissions', status: 403 };
        }

        // Update last login async
        adminDb.collection('admins').doc(decodedToken.uid).update({ lastLoginAt: new Date() }).catch(console.error);

        return { admin: adminData };

    } catch (error) {
        console.error('Admin verification error:', error);
        return { error: 'Unauthorized', status: 401 };
    }
}
