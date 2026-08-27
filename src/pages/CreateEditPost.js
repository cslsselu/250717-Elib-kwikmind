import React, { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { useLocation, useNavigate } from "react-router-dom";
import "firebase/firestore";
import "firebase/storage"; // <----
import "../App.css";
import { toast } from "react-toastify";
import { DateTime } from "luxon";


function CreatePost(props) {
  let isEditing = false;
  let postid = "";
  let utcDateTime = "";
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuth } = props;
  const [title, setTitle] = useState("");
  const [postText, setPostText] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setconfirmPassword] = useState("");
  const [error, setError] = useState({});
  const [edate, setDate] = useState("");
  const [time, setTime] = useState("");
  const postCollectionRef = collection(db, process.env.REACT_APP_ADMIN_DATABSE);
  const combinedDateTime = `${edate}T${time}`;
  const[description, setDescription] = useState('');
  function SaveDescription (value){
    setDescription(value);
  }
  

  if (location && location.state && location.state.currentState) {
    isEditing = true;
    postid = location.state.id;
    console.log(postid, "id;;;;")
  }

  useEffect(() => {
    if (isEditing) {
      const getPosts = async () => {
        const postDoc = doc(db, process.env.REACT_APP_ADMIN_DATABSE, postid);
        const postData = await getDoc(postDoc);
        setTitle(postData.data().title);
        setPostText(postData.data().postText);
        if (postData.data().expiryDate) {
          setDate(
            DateTime.fromJSDate(new Date(postData.data().expiryDate)).toFormat(
              "yyyy-MM-dd"
            )
          );
          setTime(
            DateTime.fromJSDate(new Date(postData.data().expiryDate)).toFormat(
              "T"
            )
          );
        }
      };

      getPosts();
    }
  }, [isEditing, postid]);

  const createPost = async () => {
    if ((edate && !time) || (!edate && time)) {
      setError({ date: "Please fill both Date and Time or leave them empty." });
      return;
    }

    if (Object.keys(error).length === 0) {
      await addDoc(postCollectionRef, {
        title,
        postText,
        author: {
          name: auth.currentUser.displayName,
          id: auth.currentUser.uid,
        },
        password,
        date: serverTimestamp(),
        expiryDate: utcDateTime,
        isActive: false,
      });
      toast.success("Successfully Posted!", {
        position: "top-center",
        autoClose: 1000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
      });
      
      navigate("/posts");
    }
  };
  const savePost = async () => {
    const postRef = doc(postCollectionRef, postid);
    if (password !== confirmPassword) {
      setError({ password: "Passwords do not match" });
      return;
    }
    if ((edate && !time) || (!edate && time)) {
      setError({ date: "Please fill both Date and Time or leave them empty." });
      return;
    }
    if (Object.keys(error).length === 0) {
      await updateDoc(postRef, {
        title,
        postText,
        author: {
          name: auth.currentUser.displayName,
          id: auth.currentUser.uid,
        },
        password,
        date: serverTimestamp(),
        expiryDate: utcDateTime,

      });
      toast.success("Successfully Edited!", {
        position: "top-center",
        autoClose: 1000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
      });
     
      navigate("/posts");
    }
  };

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);
    if (event.target.value !== confirmPassword) {
      error.password = "Passwords do not match";
    }
    setError(error);
  };

  const changeDate = (e) => {
    let error = {};
    setDate(e.target.value);
    if (time === "") {
      error.date = "Please fill both Date and Time or leave them empty.";
    }
    setError(error);
  };

  const changeTime = (e) => {
    let error = {};
    setTime(e.target.value);
    if (edate === "") {
      error.date = "Please fill both Date and Time or leave them empty.";
    }
    setError(error);
  };

  const handleConfirmPasswordChange = (event) => {
    let error = {};
    setconfirmPassword(event.target.value);
    if (event.target.value !== password) {
      error.password = "Passwords do not match";
    }
    setError(error);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (combinedDateTime.length > 5) {
      utcDateTime = new Date(combinedDateTime).toUTCString();
    } else {
      utcDateTime = "";
    }
    if (isEditing) {
      savePost();
    } else {
      createPost();
    }
  };

  useEffect(() => {
    if (!isAuth) {
      navigate("/login");
    }
  }, [isAuth, navigate]);

  return (
    <>
      <form onSubmit={handleSubmit}>
        <div className="post-container">
          <div className="post-box">
            <h1 className="post-title">
              {isEditing ? "Edit Post" : "Create A Post"}
            </h1>
            <div className="form-group">
              {/* <label className="form-label">Title:</label> */}
              <input
                className="form-input"
                placeholder="Title..."
                value={title}
                autoComplete="title"
                required
                onChange={(event) => {
                  setTitle(event.target.value);
                }}
              />
            </div>
            <div className="form-group">
              {/* <label className="form-label">Post:</label> */}
              <textarea
                className="form-textarea"
                required
                style={{ width: "", height: "124px" }}
                placeholder="Description... "
                value={postText}
                onChange={(event) => {
                  setPostText(event.target.value);
                  
                }}
              />
            </div>

            <div className="form-group">
              <span className="date-label">Expiry Date:</span>
              &nbsp;&nbsp;
              <input
                type="date"
                className="input-date"
                name="date"
                id="date"
                placeholder=""
                value={edate}
                onChange={changeDate}
              ></input>
              <span className="time-label">Expiry Time:</span>
              &nbsp;&nbsp;
              <input
                type="time"
                className="input-time"
                name="time"
                id="time"
                placeholder=""
                value={time}
                onChange={changeTime}
              ></input>
            </div>

            {error && <p style={{ color: "red" }}>{error.date}</p>}

            <div>
              <div className="date-group">
                <strong className="form-label">
                  {isEditing ? "Reset Password:" : "Password:"}
                </strong>
                <input
                  className="form-input"
                  style={{ borderColor: error.password ? "red" : "" }}
                  type="password"
                  placeholder="Password..."
                  autoComplete="password"
                  onChange={handlePasswordChange}
                />
                <br />
                <strong className="form-label">
                  {isEditing ? "Confirm Reset Password" : "Confirm Password:"}
                </strong>
                <input
                  className="form-input"
                  type="password"
                  style={{ borderColor: error.password ? "red" : "" }}
                  placeholder="Confirm Password..."
                  autoComplete="new-password"
                  onChange={handleConfirmPasswordChange}
                />
                {error && <p style={{ color: "red" }}>{error.password}</p>}
              </div>
            </div>
            <br />
            <br />
            <button className="btn btn-primary" type="submit" >
              {isEditing ? "Save" : "Post"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}

export default CreatePost;

{/* <Page pageNumber={pageNumber}/> */}