import { createContext, useEffect, useMemo, useState } from "react";

import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";

import { auth, db } from "../firebase";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("visitor");
  const [isApproved, setIsApproved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!active) return;

      setLoading(true);
      setUser(firebaseUser);
      setRole("visitor");
      setIsApproved(false);
      setProfile(null);

      if (!firebaseUser) {
        setLoading(false);
        return;
      }

      if (firebaseUser.isAnonymous) {
        setRole("guest");
        setLoading(false);
        return;
      }

      try {
        const collectionName = process.env.REACT_APP_ADMIN_USERS;

        if (!collectionName) {
          throw new Error("REACT_APP_ADMIN_USERS is not configured");
        }

        // Temporary compatibility with existing
        // Firestore documents stored by email.
        const usersRef = collection(db, collectionName);

        const snapshot = await getDocs(
          query(usersRef, where("email", "==", firebaseUser.email))
        );

        if (!active) return;

        const userData = snapshot.empty ? null : snapshot.docs[0].data();

        setProfile(userData);
        setIsApproved(userData?.isApproved === true);

        setRole(userData?.isAdmin === true ? "admin" : "user");
      } catch (error) {
        console.error("Failed to load user permissions:", error);

        if (!active) return;

        // Fail closed if permissions cannot load.
        setRole("user");
        setIsApproved(false);
      } finally {
        if (active) setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      role,
      loading,
      isApproved,
      isAdmin: role === "admin" && isApproved,
      isGuest: role === "guest",
      isAuthenticated: !!user,
      isRegistered: !!user && !user.isAnonymous,
    }),
    [user, profile, role, loading, isApproved]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
