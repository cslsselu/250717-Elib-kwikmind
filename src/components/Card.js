import React, { useState } from "react";
import { FaPencil, FaTrashCan, FaUserTie, FaMagnifyingGlass, FaThumbsUp, FaRegThumbsUp } from "react-icons/fa6";
import Linkify from "react-linkify";
import { Link } from "react-router-dom";
import { Button, Modal } from "react-bootstrap";
import Countdown from "react-countdown";
import { Document, Page, pdfjs } from "react-pdf";
import "./Card.css";


pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function Card({
  postLists,
  onDelete,
  isAuth,
  isAdmin,
  setPostLists,
  getPosts,
}) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState("");
  const [search, setSearch] = useState("");
  const [active, setIsActive] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [numPages, setNumPages] = useState(null);

  const uid = localStorage.getItem("uid") || "";

  const openPost = async (postId, postUrl) => {
  setPdfUrl(postUrl);
  setShowPdfModal(true);

  try {
    const uid = localStorage.getItem("uid");

    if (!uid) return;

    // 1. Log the view under a subcollection `views` of the post
    const viewRef = doc(db, "posts", postId, "views", uid);
    await setDoc(viewRef, {
      viewedAt: serverTimestamp()
    });

    // 2. Increment a view count on the post (optional)
    const postRef = doc(db, "posts", postId);
    await updateDoc(postRef, {
      viewCount: increment(1)
    });

  } catch (error) {
    console.error("Error logging view in Firestore:", error);
  }
};

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };
  const onChangeSearch = (e) => {
    const searchValue = e.target.value;
    setSearch(searchValue);
    e.preventDefault();
    const searchRegex = new RegExp(search, "i");
    const filteredPosts = postLists.filter((post) =>
      post.title.match(searchRegex)
    );
    if (filteredPosts.length !== 0) {
      setPostLists(filteredPosts);
    }
    if (searchValue === "") {
      getPosts();
    }
  };

  const handleDelete = (props) => {
    onDelete(props);
    setShowDeleteModal(false);
  };

  const handleLikeClick = (postId) => {
    const updatedPostLists = postLists.map((post) =>
      post.id === postId ? { ...post, liked: !post.liked } : post
    );
    setPostLists(updatedPostLists);
  };

  const renderer = ({ days, hours, minutes, seconds, completed }) => {
    if (completed) {
      return;
    } else {
      return (
        <div>
          <div className="countdown-timer">
            <span style={{ color: "black", opacity: "0.8" }}>
              Time Remaining &nbsp;
            </span>
            {days > 0 ? `${days}:` : ""}
            {hours > 0 ? `${hours}:` : ""}
            &nbsp;{minutes}:&nbsp;
            {seconds} &nbsp;&nbsp;
          </div>
        </div>
      );
    }
  };

  return (
    <div className="homePage">
      <form onSubmit={onChangeSearch}>
        <div className="search-bar">
          <input
            type="text"
            value={search}
            onChange={onChangeSearch}
            style={{ width: "160px" }}
            placeholder="Search Topic..."
          />
          <span className="search-icon">
            <FaMagnifyingGlass />
          </span>
        </div>
      </form>
      {postLists.map((post, index) => {
        return (
          <div className="post" key={index}>
            {post.expiryDate === "" ||
            new Date(post.expiryDate).getTime() > new Date() ? (
              <div className="postWrapper">
                <div className="postTop">
                  <div className="postTopLeft">
                    <FaUserTie />
                    <span className="postUsername">{post.author.name}</span>
                    <span className="postDate">
                      {post.date.toDate().toLocaleString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "numeric",
                        minute: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="postTopRight">
                    <Countdown date={post.expiryDate} renderer={renderer} />
                    {isAuth && (post.author.id === uid || isAdmin) && (
                      <div>
                        <button
                          style={{ padding: "5px 5px" }}
                          className="btn delete-button"
                          onClick={() => {
                            setDeleteId(post.id);
                            setShowDeleteModal(true);
                          }}
                        >
                          <FaTrashCan />
                        </button>
                        &nbsp;&nbsp;&nbsp;
                        <Link
                          to={"/createpost"}
                          state={{ currentState: "edit", id: post.id }}
                        >
                          <button
                            className="btn edit-button"
                            style={{ padding: "0px" }}
                          >
                            <FaPencil />
                          </button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
                <div className="postHeader">
                  <div className="title">
                    <h3>
                      <strong> {post.title}</strong>
                    </h3>
                  </div>
                </div>
                <div className="postCenter">
                  <div className="postTextContainer">
                    <Linkify
                      componentDecorator={(
                        decoratedHref,
                        decoratedText,
                        key
                      ) => (
                        <a
                          key={key}
                          href={decoratedHref}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {decoratedText}
                        </a>
                      )}
                    ></Linkify>
                  </div>
                  <center>
                    <button
                      type="button"
                      className="btn btn-outline-info"
                      onClick={() => openPost(post.id, post.postText)}
                    >
                      Open Post
                    </button>
                  </center>
                </div>
                <div className="postBottom">
                  <div className="postBottomLeft">
                    <span
                      className="postLikeCounter"
                      onClick={() => handleLikeClick(post.id)}
                    >
                      {post.liked ? (
                        <FaThumbsUp color="green" />
                      ) : (
                        <FaRegThumbsUp />
                      )}
                    </span>
                  </div>
                  <div className="postBottomRight">
                    <span className="postCommenttext"> </span>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="postWrapper">
                  <div className="postTop">
                    <div className="postTopLeft">
                      <FaUserTie />
                      <span className="postUsername">{post.author.name}</span>
                      <span className="postDate" style={{ color: "red" }}>
                        {new Date(post.expiryDate).toLocaleString("en-US", {
                          month: "long",
                          day: "numeric",
                          weekday: "long",
                          year: "numeric",
                          hour: "numeric",
                          minute: "numeric",
                          hour12: true,
                        })}
                      </span>
                      <div className="hover-message">
                        <strong>Expired at</strong>
                      </div>
                    </div>
                    <div className="postTopRight">
                      {isAuth && (post.author.id === uid || isAdmin) && (
                        <div>
                          <button
                            style={{ padding: "5px 5px" }}
                            className="btn delete-button"
                            onClick={() => {
                              setDeleteId(post.id);
                              setShowDeleteModal(true);
                            }}
                          >
                            <FaTrashCan />
                          </button>
                          &nbsp;&nbsp;&nbsp;
                          <Link
                            to={"/createpost"}
                            state={{ currentState: "edit", id: post.id }}
                          >
                            <button
                              className="btn edit-button"
                              style={{ padding: "0px" }}
                            >
                              <FaPencil />
                            </button>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="postHeader" style={{ opacity: "0.5" }}>
                    <div className="title">
                      <h3>
                        <strong> {post.title}</strong>
                      </h3>
                    </div>
                  </div>
                  <div className="postCenter" style={{ opacity: "0.5" }}>
                    <div className="postTextContainer">
                      <center>
                        <p style={{ color: "red", fontSize: "20px" }}>
                          The post has been expired
                        </p>
                      </center>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <Modal
        show={showDeleteModal}
        keyboard={false}
        onHide={() => setShowDeleteModal(false)}
      >
        <Modal.Header>
          <Modal.Title>Delete Confirmation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure to delete this post?
          <br />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="danger" onClick={() => handleDelete(deleteId)}>
            Delete
          </Button>
          <Button
            variant="info"
            onClick={() => {
              setShowDeleteModal(false);
            }}
          >
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showPdfModal} onHide={() => setShowPdfModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>PDF Viewer</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Document
            file={{
              url: pdfUrl,
            }}
            onLoadSuccess={onDocumentLoadSuccess}
          >
            {[...Array(numPages).keys()].map((pageIndex) => (
              <Page
                key={`page_${pageIndex + 1}`}
                pageNumber={pageIndex + 1}
                renderAnnotationLayer={false}
                renderTextLayer={false}
              />
            ))}
          </Document>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPdfModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
