import { auth, db, database, provider } from "../firebase";
import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";


async function Logger({ eventType, remarks = null }) {
  if(auth.currentUser){
  const postCollectionUser = collection(db, process.env.REACT_APP_ADMIN_USERS);


  const querySnapshot = await getDocs(
    query(postCollectionUser, where("email", "==", auth.currentUser.email))
  );

  const isAuth = JSON.parse(localStorage.getItem("isAuth"));

  const userDoc = querySnapshot.docs[0];
  if(userDoc && userDoc.data){
  const isAdmin = await userDoc.data().isAdmin;
  console.log(isAdmin);
  if (isAdmin || !isAuth) {
    return;
  }
}

  const postCollectionRef = collection(db, process.env.REACT_APP_ADMIN_LOG);

  try {
    await addDoc(postCollectionRef, {
      username: auth.currentUser.displayName,
      email: auth.currentUser.email,
      type: eventType,
      timestamp: new Date().toLocaleString("en-US", { timeZone: "America/Chicago" }),
      remarks: remarks,
    });

    console.log("Value inserted successfully.");
  } catch (error) {
    console.error(`Error inserting value: ${error}`);
  }
}
}

export default Logger;
