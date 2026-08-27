import { auth, db } from "../firebase";
import { collection, query, where, getDocs, updateDoc, arrayUnion, increment } from 'firebase/firestore';

const updatePostViews = async (url) => {
    try {

        console.log("###################")
        console.log("")

        console.log(url);
        
        if (!auth.currentUser) {
            console.log("No user");
            return;
        }

        const user = auth.currentUser.email;
        const postsRef = collection(db, "pdfs");
        const q = query(postsRef, where('url', '==', url));
        const querySnapshot = await getDocs(q);
        
        console.log("######################### Query Snapshot:", querySnapshot);
        
        if (!querySnapshot.empty) {
            console.log("Post found, updating...");
            querySnapshot.forEach(async (doc) => {
                const postRef = doc.ref;
                const postData = doc.data();
                
                  if (!postData.viewed_user || !Array.isArray(postData.viewed_user) || !postData.viewed_user.includes(user)) {
                    await updateDoc(postRef, {
                        viewed_count: increment(1),
                        viewed_user: arrayUnion(user)
                    });
                } else {
                    await updateDoc(postRef, {
                        viewed_count: increment(1)
                    });
                }
                console.log('Post updated successfully');
            });
        } else {
            console.log('Post not found');
        }
    } catch (error) {
        console.error('Error updating post:', error);
    }
};

export default updatePostViews;
