import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

interface RegisterTeacherRequest {
  displayName: string;
  email: string;
  password: string;
  masterKey: string;
}

export async function POST(request: NextRequest) {
  try {
    let body: RegisterTeacherRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { displayName, email, password, masterKey } = body;

    if (!displayName || !email || !password || !masterKey) {
      return NextResponse.json(
        { error: "Missing required fields: displayName, email, password, masterKey" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const configRef = adminDb.doc("appConfig/teacherRegistration");
    const configSnap = await configRef.get();

    if (!configSnap.exists) {
      return NextResponse.json(
        { error: "Teacher registration configuration is missing" },
        { status: 500 }
      );
    }

    const config = configSnap.data() as { enabled?: boolean; masterKey?: string };
    if (!config.enabled) {
      return NextResponse.json(
        { error: "Teacher registration is currently disabled" },
        { status: 403 }
      );
    }

    if (masterKey !== config.masterKey) {
      return NextResponse.json({ error: "Invalid master key" }, { status: 403 });
    }

    let userRecord;
    try {
      userRecord = await adminAuth.createUser({
        email,
        password,
        displayName,
      });
    } catch (authError: unknown) {
      const authErr = authError as { code?: string; message?: string };
      if (authErr.code === "auth/email-already-exists") {
        return NextResponse.json({ error: "Email is already registered" }, { status: 400 });
      }
      return NextResponse.json(
        { error: `Failed to create user account: ${authErr.message || authErr.code || "Unknown error"}` },
        { status: 500 }
      );
    }

    try {
      await adminDb.doc(`users/${userRecord.uid}`).set({
        role: "teacher",
        displayName,
        email,
        createdAt: new Date(),
      });
    } catch (firestoreError) {
      console.error("Firestore profile creation error:", firestoreError);
      try {
        await adminAuth.deleteUser(userRecord.uid);
      } catch (deleteError) {
        console.error("Failed to rollback Auth account deletion:", deleteError);
      }
      return NextResponse.json(
        { error: "Failed to create user profile. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      userId: userRecord.uid,
    });
  } catch (error) {
    console.error("Unexpected error in register-teacher API:", error);
    const err = error as { message?: string };
    return NextResponse.json(
      { error: `An unexpected error occurred: ${err.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}

