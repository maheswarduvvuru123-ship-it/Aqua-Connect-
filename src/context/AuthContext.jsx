import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile as fbUpdateProfile
} from 'firebase/auth';
import { doc, getDoc as fbGetDoc } from 'firebase/firestore';
import { auth, db, isLiveFirebaseConfigured } from '../services/firebase';
import { getDoc, setDoc, getCollection } from '../services/firestoreData';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'supplier' | 'customer' | null
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Load persisted active session if any
  useEffect(() => {
    const savedUser = localStorage.getItem('aquaconnect_auth_user');
    const savedRole = localStorage.getItem('aquaconnect_auth_role');

    if (savedUser && savedRole) {
      try {
        setCurrentUser(JSON.parse(savedUser));
        setUserRole(savedRole);
      } catch (e) {
        console.error("Failed to restore session", e);
      }
    }

    // If live Firebase configured, wire up auth state listener
    if (isLiveFirebaseConfigured() && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          let profile = null;
          if (db) {
            try {
              const snap = await fbGetDoc(doc(db, 'users', fbUser.uid));
              if (snap.exists()) {
                profile = snap.data();
              }
            } catch (e) {
              console.warn("Could not fetch remote user profile in auth state change:", e);
            }
          }
          if (!profile) {
            profile = getDoc('users', 'uid', fbUser.uid);
          }
          if (profile) {
            setCurrentUser({ ...profile, email: fbUser.email, uid: fbUser.uid });
            setUserRole(profile.role);
            localStorage.setItem('aquaconnect_auth_user', JSON.stringify(profile));
            localStorage.setItem('aquaconnect_auth_role', profile.role);
          }
        } else {
          setCurrentUser(null);
          setUserRole(null);
          localStorage.removeItem('aquaconnect_auth_user');
          localStorage.removeItem('aquaconnect_auth_role');
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password, expectedRole) => {
    setLoading(true);
    setAuthError(null);
    try {
      const cleanEmail = email.trim().toLowerCase();

      if (isLiveFirebaseConfigured() && auth) {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        
        // Fetch authoritative profile directly from Cloud Firestore
        let profile = null;
        if (db) {
          try {
            const snap = await fbGetDoc(doc(db, 'users', cred.user.uid));
            if (snap.exists()) {
              profile = snap.data();
            }
          } catch (e) {
            console.warn("Could not read remote user profile from Firestore:", e);
          }
        }

        // Fallback to local cache if Firestore was unreachable
        if (!profile) {
          profile = getDoc('users', 'uid', cred.user.uid) || 
                    getCollection('users').find(u => u.email?.toLowerCase() === cleanEmail);
        }

        if (!profile) {
          // If user exists in Firebase Auth but profile document is missing, create it
          profile = {
            uid: cred.user.uid,
            name: cred.user.displayName || cleanEmail.split('@')[0],
            email: cleanEmail,
            role: expectedRole || 'customer',
            createdAt: new Date().toISOString()
          };
          setDoc('users', 'uid', profile);
        }

        // STRICT ROLE ENFORCEMENT: A Supplier cannot log into Customer, and a Customer cannot log into Supplier!
        if (expectedRole && profile.role !== expectedRole) {
          await fbSignOut(auth);
          localStorage.removeItem('aquaconnect_auth_user');
          localStorage.removeItem('aquaconnect_auth_role');
          throw new Error(`Access Denied: This account is registered as a ${profile.role.toUpperCase()}.\nYou cannot sign in as a ${expectedRole.toUpperCase()}. Please switch to the ${profile.role.toUpperCase()} tab.`);
        }

        // Ensure customer record exists in customer directory
        if (profile.role === 'customer') {
          const cust = getDoc('customers', 'customerId', profile.uid);
          if (!cust) {
            setDoc('customers', 'customerId', {
              customerId: profile.uid,
              userId: profile.uid,
              name: profile.name,
              phone: profile.phone || '',
              email: profile.email,
              address: profile.address || '',
              totalOrders: 0,
              totalAmount: 0,
              pendingPayment: 0,
              status: 'Active',
              createdAt: profile.createdAt || new Date().toISOString()
            });
          }
        }

        setCurrentUser(profile);
        setUserRole(profile.role);
        localStorage.setItem('aquaconnect_auth_user', JSON.stringify(profile));
        localStorage.setItem('aquaconnect_auth_role', profile.role);
        return profile;
      } else {
        // Local verified mode
        const allUsers = getCollection('users');
        const found = allUsers.find(u => u.email.toLowerCase() === cleanEmail);

        if (!found) {
          throw new Error('No account found with this email. Please check your credentials or click "Create Account" below.');
        }

        if (found.password && password && found.password !== password) {
          throw new Error('Incorrect password. Please verify your password and try again.');
        }

        if (expectedRole && found.role !== expectedRole) {
          throw new Error(`Access Denied: This account is registered as a ${found.role.toUpperCase()}.\nYou cannot sign in as a ${expectedRole.toUpperCase()}. Please switch to the ${found.role.toUpperCase()} tab.`);
        }

        // Ensure customer record exists in customer directory
        if (found.role === 'customer') {
          const cust = getDoc('customers', 'customerId', found.uid);
          if (!cust) {
            setDoc('customers', 'customerId', {
              customerId: found.uid,
              userId: found.uid,
              name: found.name,
              phone: found.phone || '',
              email: found.email,
              address: found.address || '',
              totalOrders: 0,
              totalAmount: 0,
              pendingPayment: 0,
              status: 'Active',
              createdAt: found.createdAt || new Date().toISOString()
            });
          }
        }

        setCurrentUser(found);
        setUserRole(found.role);
        localStorage.setItem('aquaconnect_auth_user', JSON.stringify(found));
        localStorage.setItem('aquaconnect_auth_role', found.role);
        return found;
      }
    } catch (err) {
      const friendlyMessage = err.message.includes('auth/invalid-credential') || err.message.includes('auth/user-not-found') || err.message.includes('auth/wrong-password')
        ? 'No account found with this email, or incorrect password. Please check your credentials or click "Create Account" below.' 
        : err.message.includes('auth/invalid-email')
        ? 'Please enter a valid email address.'
        : err.message.includes('auth/too-many-requests')
        ? 'Too many failed login attempts. Please try again later.'
        : err.message;
      setAuthError(friendlyMessage);
      throw new Error(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const signup = async ({ name, email, password, phone, role, address }) => {
    setLoading(true);
    setAuthError(null);
    try {
      let uid = `usr_${Date.now()}`;
      if (isLiveFirebaseConfigured() && auth) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        uid = cred.user.uid;
      }

      const newUser = {
        uid,
        name,
        email,
        password,
        phone: phone || '',
        role: role || 'customer',
        profileImage: role === 'supplier' 
          ? 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        address: address || '',
        city: 'Hyderabad',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setDoc('users', 'uid', newUser);

      // If supplier, also initialize supplier document
      if (role === 'supplier') {
        setDoc('suppliers', 'supplierId', {
          supplierId: uid,
          businessName: `${name}'s Aqua Services`,
          ownerName: name,
          phone,
          email,
          address: address || 'Water Plant Facility',
          city: 'Hyderabad',
          logo: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
          createdAt: new Date().toISOString()
        });
      } else {
        // If customer, initialize customer directory record
        setDoc('customers', 'customerId', {
          customerId: uid,
          userId: uid,
          name,
          phone,
          email,
          address,
          totalOrders: 0,
          totalAmount: 0,
          pendingPayment: 0,
          status: 'Active',
          createdAt: new Date().toISOString()
        });
      }

      setCurrentUser(newUser);
      setUserRole(newUser.role);
      localStorage.setItem('aquaconnect_auth_user', JSON.stringify(newUser));
      localStorage.setItem('aquaconnect_auth_role', newUser.role);
      return newUser;
    } catch (err) {
      const friendlyMessage = err.message.includes('auth/email-already-in-use')
        ? 'This email is already registered. Please sign in.'
        : err.message.includes('auth/weak-password')
        ? 'Password must be at least 6 characters.'
        : err.message;
      setAuthError(friendlyMessage);
      throw new Error(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (isLiveFirebaseConfigured() && auth) {
        await fbSignOut(auth);
      }
    } catch (e) {
      console.warn("Sign out error:", e);
    }
    setCurrentUser(null);
    setUserRole(null);
    localStorage.removeItem('aquaconnect_auth_user');
    localStorage.removeItem('aquaconnect_auth_role');
  };

  const resetPassword = async (emailToReset) => {
    setLoading(true);
    setAuthError(null);
    try {
      if (isLiveFirebaseConfigured() && auth) {
        await sendPasswordResetEmail(auth, emailToReset);
      }
      return true;
    } catch (err) {
      const friendlyMessage = err.message.includes('auth/user-not-found')
        ? 'No registered account found with this email address.'
        : err.message.includes('auth/invalid-email')
        ? 'Please enter a valid email address.'
        : err.message;
      setAuthError(friendlyMessage);
      throw new Error(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateCurrentUser = (updates) => {
    if (!currentUser) return null;
    const updated = { ...currentUser, ...updates, updatedAt: new Date().toISOString() };
    setCurrentUser(updated);
    setDoc('users', 'uid', updated);
    localStorage.setItem('aquaconnect_auth_user', JSON.stringify(updated));
    return updated;
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      userRole,
      loading,
      authError,
      login,
      signup,
      logout,
      resetPassword,
      updateCurrentUser,
      isLiveFirebase: isLiveFirebaseConfigured()
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
