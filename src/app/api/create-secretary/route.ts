import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

interface CreateSecretaryRequest {
  displayName: string;
  email: string;
  password: string;
  lrn: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    let body: CreateSecretaryRequest;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }
    
    const { displayName, email, password, lrn } = body;

    // Validate required fields
    if (!displayName || !email || !password || !lrn) {
      return NextResponse.json(
        { error: 'Missing required fields: displayName, email, password, lrn' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    let userRecord;
    
    try {
      // Step 1: Create user in Firebase Auth using Admin SDK
      // This creates the user server-side WITHOUT signing them in
      userRecord = await adminAuth.createUser({
        email,
        password,
        displayName,
      });
      
      console.log('Firebase Auth user created:', userRecord.uid);
    } catch (authError: unknown) {
      const authErr = authError as { code?: string; message?: string; stack?: string };
      
      console.error('Firebase Auth creation error:', authErr);
      
      // Handle specific Firebase Auth errors
      if (authErr.code === 'auth/email-already-exists') {
        return NextResponse.json(
          { error: 'This email is already registered' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: `Failed to create user account: ${authErr.message || authErr.code || 'Unknown error'}` },
        { status: 500 }
      );
    }

    // Step 2: Create Firestore profile
    // If this fails, we'll rollback by deleting the Auth account
    try {
      const userRef = adminDb.doc(`users/${userRecord.uid}`);
      
      await userRef.set({
        role: 'secretary',
        displayName,
        email,
        lrn,
        createdAt: new Date(),
      });
      
      console.log('Firestore profile created for:', userRecord.uid);
    } catch (firestoreError) {
      console.error('Firestore profile creation error:', firestoreError);
      
      // ROLLBACK: Delete the Auth account since Firestore profile failed
      try {
        await adminAuth.deleteUser(userRecord.uid);
        console.log('Rolled back: Deleted Auth account due to Firestore failure');
      } catch (deleteError) {
        console.error('Failed to rollback Auth account deletion:', deleteError);
      }
      
      return NextResponse.json(
        { error: 'Failed to create user profile. Please try again.' },
        { status: 500 }
      );
    }

    // Success - return the credentials to the client
    return NextResponse.json({
      success: true,
      credentials: {
        email,
        password,
      },
      userId: userRecord.uid,
    });

  } catch (error) {
    console.error('Unexpected error in create-secretary API:', error);
    const err = error as { message?: string; stack?: string };
    return NextResponse.json(
      { error: `An unexpected error occurred: ${err.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
