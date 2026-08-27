import {
  doc,
  getDoc,
  updateDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import Linkify from "react-linkify";
import { Button, Modal } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { Document, Page, pdfjs } from "react-pdf";
import { useTimer } from 'react-timer-hook';
import { FaMagnifyingGlass } from "react-icons/fa6";
import Logger from './Logger';


// pdfjs.GlobalWorkerOptions.workerSrc = new URL(
//   "pdfjs-dist/build/pdf.worker.min.js",
//   import.meta.url
// ).toString();


function ViewPost() {
  const aceessTimer = 1000 *4; // 5 sec
  const postId = sessionStorage.getItem("postId");
  const [documentLoaded, setDocumentLoaded] = useState(false);

  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [show, setShow] = useState(false);
  const [password, setPassword] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(true);
  const postDoc = doc(db, process.env.REACT_APP_ADMIN_DATABSE, postId);
  const [isOnline, setIsOnline] = useState(window.navigator.onLine);
  const [active, setActive] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const postCollectionRef = collection(db, process.env.REACT_APP_ADMIN_DATABSE);
  const postRef = doc(postCollectionRef, postId);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [isTimeUp, setTimeUp] = useState(false);

  const showModal = () => {
    setShowAccessModal(true);
  };

  const updateIsActive = async () => {
    setActive(false);
    await updateDoc(postRef, {
      isActive: false,
    });
    console.log("SUBIN ROCKSSSS");
    console.log(postId)
    setTimeUp(true);
  };

  const returnBack = () => {
    navigate("/posts");
  };
  useEffect(() => {
    let timer;
    const userSession = () => {
      timer = setTimeout(() => updateIsActive(), aceessTimer);
    };
    userSession();
    return () => {
      clearTimeout(timer);
    };
  }, [aceessTimer, updateIsActive]);

  useEffect(() => {
    const worker = new Worker(
      URL.createObjectURL(
        new Blob(
          [
            `
      self.onmessage = function(e) {
        setTimeout(function() {
          self.postMessage('Time is up!');
        }, e.data);
      }
    `,
          ],
          { type: "text/javascript" }
        )
      )
    );

    worker.onmessage = function (e) {
      console.log(e.data); // 'Time is up!'
      updateIsActive(); // Call your function when the timer is up
    };

    worker.postMessage(aceessTimer); // Start the timer

    return () => {
      worker.terminate(); // Terminate the worker when the component unmounts
    };
  }, [aceessTimer, updateIsActive]);

  const getPosts = async () => {
    const postData = await getDoc(postDoc);
    const postDetails = postData.data();
    if (postDetails && !postDetails.isActive) {
      await updateDoc(postDoc, { isActive: true });
    }
    setPost(postData.data());

    if (postData.data().password.length === 0) {
      setShowPasswordModal(false);
      setShow(true);
    }
  };

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(window.navigator.onLine);
    };

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    const fetchData = async () => {
      await getPosts();
    };

    fetchData();
    const handleContextmenu = (e) => {
      e.preventDefault();
    };

    document.addEventListener("contextmenu", handleContextmenu);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
      document.removeEventListener("contextmenu", handleContextmenu);
    };
  }, []);

  const handlePasswordSubmit = () => {
    let correctPassword = post.password;
    if (password === correctPassword) {
      setShow(true);
      setShowPasswordModal(false);
    } else {
      alert("Incorrect password. Access denied.");
    }
  };
  const onDocumentLoadSuccess = ({ numPages, title }) => {
    if (!documentLoaded) {
     // alert(numPages);
      Logger({ eventType: 'view post', remarks: title });
      setNumPages(numPages);
      setDocumentLoaded(true);
    }
  };
  // const {
  //   totalSeconds,
  //   seconds,
  //   minutes,
  //   hours,
  //   days,
   
  // } = useStopwatch({ autoStart: true });

  return (
    <>
     <style type="text/css">
        {`
          @media print {
            * {
              display: none;
            }
          }
        `}
      </style>
      {isOnline ? (
        <>
          {post && post.isActive ? (
            <Modal show={showModal}>
              <Modal.Header>
                <Modal.Title>Access denied</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                Someone is viewing this page. Please come back later
              </Modal.Body>
              <Modal.Footer>
                <Button variant="primary" onClick={returnBack}>
                  Return Back
                </Button>
              </Modal.Footer>
            </Modal>
          ) : (
            <>
              <Modal show={showPasswordModal} keyboard={false}>
                <Modal.Header>
                  <Modal.Title>Password</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  Enter the password to get access
                  <br />
                  <input
                    style={{
                      borderRadius: "4px",
                      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                      padding: "5px",
                      width: "100%",
                      maxWidth: "200px",
                      boxSizing: "border-box",
                    }}
                    type="password"
                    placeholder="******"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  ></input>
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="primary" onClick={handlePasswordSubmit}>
                    Submit
                  </Button>
                </Modal.Footer>
              </Modal>

              {show && (
                <div className="homepage">
                  <div className="view-post" style={{ height: "90vh" }}>
                    <div className="postHeader">
                      <div className="title">
                        <h1> {post.title}</h1>
                      </div>
                      <form >
        <div className="search-bar">
          <input
            type="text"
            style={{ width: "160px" }}
            placeholder="Search Topic..."
          />
          <span className="search-icon">
            <FaMagnifyingGlass />
          </span>
        </div>
      </form>
                    </div>
                    
        
                    <div
                      className="postTextContainer"
                      style={{ height: "auto",display:'flex', alignContent:'center', justifyContent:'center',  padding:'20px',
                      marginTop:'50px'}}
                      onContextMenu={(e) => e.preventDefault()}
                    >
                      {isTimeUp ? (
                        <div>
                          <h2 style={{ marginBottom: "20px" }}>
                            Your Time is Up ⌛
                          </h2>
                          <Button onClick={returnBack}>Return Back</Button>
                        </div>
                      ) : (
                        <>
                        <Document
                      file={{
                        url: post.postText,
                      }}
                  
                     onLoadSuccess={({ numPages }) => onDocumentLoadSuccess({ numPages, title: `${post.title}` })}
                      
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        position: "relative",
                       
                        height: "100%",
                        width: "80%",
                        margin: "0 auto"
                    
                      }}
                    >
                    {console.log("here is what i need",post.postText)}
                    {[...Array(numPages).keys()].map((pageIndex) => (
    <Page key={`page_${pageIndex + 1}`} pageNumber={pageIndex + 1} renderAnnotationLayer={false} renderTextLayer={false} />
  ))}
                      <div
                        style={{
                          position: "absolute",
                          top: "10px",
                          right: "10px",
                          backgroundColor: "#f0f0f0",
                          border: "1px solid black",
                          padding: "10px",
                          borderRadius: "4px",
                        }}
                      >
                        {/* <div style={{ fontSize: "20px",  marginTop:'50px' }}>
                        <span>{hours}</span>:
                          <span>{minutes}</span>:<span>{seconds}</span>
                        </div> */}
                      </div>
                    </Document>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <div>You are offline</div>
      )}
    </>
  );
}

export default ViewPost;
