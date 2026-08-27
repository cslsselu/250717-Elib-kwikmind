
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";

import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase'; 

const adminEmail =
  process.env.REACT_APP_ADMIN_EMAIL || "admin_secure@gmail.com";

const password = process.env.REACT_APP_ADMIN_PASSWORD || "admin_secure";

let checkOnce = false;

const postCollectionRef = collection(db, process.env.REACT_APP_ADMIN_USERS);

const checkAdminEmail = async () => {
  if (!checkOnce) {
    checkOnce = true;
    const querySnapshot = await getDocs(
      query(postCollectionRef, where("email", "==", adminEmail))
    );

    if (querySnapshot.size > 0) {
      const userDoc = querySnapshot.docs[0];
      const isAdmin = await userDoc.data().isAdmin;
      if (!isAdmin) {
        const userDocRef = doc(postCollectionRef, userDoc.id);
        await updateDoc(userDocRef, { isAdmin: true });
        // console.log("User with email " + adminEmail + " is now a admin");
      } else if (isAdmin) {
        // console.log("User with email " + adminEmail + " is already an admin");
      }
    } else {
      //localStorage.setItem("isAuth", false);
      await addDoc(postCollectionRef, {
        date: new Date().toLocaleString(),
        id: 1,
        name: "Admin",
        email: adminEmail,
        isAdmin: true,
        isApproved: true,
        
      });
      localStorage.clear();
      // console.log("Admin with email " + adminEmail + " created successfully");
    }
  }
};

checkAdminEmail();
