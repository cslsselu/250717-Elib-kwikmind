const admin = require('firebase-admin');

// Initialize Firebase Admin SDK with service account
admin.initializeApp({
  credential: admin.credential.cert(require('C:/Users/userselu/Documents/Lates ELib/std-secure-latest/src/helper/appconfig.json')),
  databaseURL: 'https://e-lib-6ae39.firebaseio.com' // Replace with your database URL
});

const db = admin.firestore();

async function updatePosts() {
  const postsRef = db.collection('pdfs');
  const snapshot = await postsRef.get();

  const batch = db.batch();

  snapshot.forEach(doc => {
    const docRef = postsRef.doc(doc.id);
    batch.update(docRef, {
      viewed_user: [], // Initialize with an empty array
      viewed_count: 0   // Initialize with zero
    });
  });

  await batch.commit();
  console.log('All posts updated successfully!');
}

// Call the function
updatePosts().catch(console.error);
