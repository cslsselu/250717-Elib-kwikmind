import React, { useEffect, useState } from "react";
import {
  getDocs,
  collection,
  deleteDoc,
  doc,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import { ToastContainer } from "react-bootstrap";

function Posts({ isAuth, isAdmin }) {
  const navigate = useNavigate();
  const [postLists, setPostLists] = useState([]);
  const [loading, isLoading] = useState(true);
  const postsCollectionRef = collection(db, process.env.REACT_APP_ADMIN_DATABSE);

  async function deletePost(id) {
    const postDoc = doc(db, process.env.REACT_APP_ADMIN_DATABSE, id);
    await deleteDoc(postDoc);
    getPosts();
  }

  const getPosts = async () => {
    const q = query(postsCollectionRef, orderBy("date", "desc"));
    const data = await getDocs(q);
    setPostLists(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    isLoading(false);
  };

  useEffect(() => {
    getPosts();
    // if (!isAuth) {
    //   navigate("/login");
    // } else {
    //   getPosts();
    // }
  }, [setPostLists]);
  if (loading) {
    return <div> </div>;
  }

  return (
    <div className="homePage">
      <ToastContainer />

      {postLists.length === 0 ? (
        <div className="homepage-announcement">
          <strong>
            At this time, we do not have any new announcements to share.
            <br />
            Please check back later for updates
          </strong>
        </div>
      ) : (
        <Card
          postLists={postLists}
          onDelete={deletePost}
          isAuth={isAuth}
          isAdmin={isAdmin}
          setPostLists={setPostLists}
          getPosts={getPosts}
        />
      )}
    </div>
  );
}

export default Posts;
