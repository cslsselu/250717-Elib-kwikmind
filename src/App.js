import "bootstrap/dist/css/bootstrap.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./App.css";

import {
  Routes,
  Route,
  Link,
  useNavigate,
  Navigate,
  useLocation,
} from "react-router-dom";

import { useEffect, useState } from "react";

import { Button, Modal } from "react-bootstrap";

import { signOut, onAuthStateChanged } from "firebase/auth";

import { collection, getDocs } from "firebase/firestore";

import { auth, db } from "./firebase";

import Login from "./pages/Login";
import CreatePost from "./pages/CreateEditPost";
import Landing from "./pages/Landing";
import Posts from "./pages/Posts";
import ViewPost from "./pages/ViewPost";
import ViewLogs from "./pages/ViewLogs";
import Admin from "./pages/AdminDashboard";
import SignUp from "./pages/SignUp";
import Team from "./pages/Team";
import PdfList from "./pages/PdfList";
import ArticleList from "./pages/ArticleList";
import CategoryPdfList from "./pages/categoryPdfList";
import Logger from "../src/pages/Logger";
import PdfViewerPage from "./pages/PdfViewerPage";

import DropdownComponent from "../src/Dropdown";
import CategoryDropdownComponent from "../src/CategoryDropdown";

import { pdfjs } from "react-pdf";

import { ToastContainer, toast } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";

import "./auth/create-admin";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

function App() {
  const postId = sessionStorage.getItem("postId");

  const navigate = useNavigate();

  const AUTO_LOGOUT_TIME = 60 * 30 * 10000;

  /*
   * STATES
   */

  const [isAuth, setIsAuth] = useState(
    localStorage.getItem("isAuth") === "true"
  );

  const [isApproved, setIsApproved] = useState(null);

  const [isAdmin, setisAdmin] = useState(false);

  const [pdfTimer, setPdfTimer] = useState("");

  const uid = localStorage.getItem("uid") || "";

  const email = localStorage.getItem("email") || "";

  const [loading, setLoading] = useState(true);

  const [isCollapsed, setIsCollapsed] = useState(true);

  const [username, setUsername] = useState("");

  /*
   * Logout modal
   */
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  /*
   * Fetch PDF timer value
   */
  useEffect(() => {
    const fetchTimerValue = async () => {
      try {
        const timerCollection = collection(db, "timer");

        const timerSnapshot = await getDocs(timerCollection);

        if (!timerSnapshot.empty) {
          const firstDoc = timerSnapshot.docs[0];

          const secondsValue = firstDoc.data().seconds;

          setPdfTimer(secondsValue);
        } else {
          console.log("No timer document found.");
        }
      } catch (error) {
        console.error("Error fetching timer value:", error);
      }
    };

    fetchTimerValue();
  }, []);

  /*
   * Firebase authentication state listener
   */
  useEffect(() => {
    const handleAuthChange = (user) => {
      if (user && localStorage.getItem("isAuth")) {
        checkUserStatus();
      } else {
        setIsAuth(false);

        setIsApproved(false);

        localStorage.setItem("isAuth", JSON.stringify(false));
      }
    };

    const unsubscribe = auth.onAuthStateChanged(handleAuthChange);

    return () => unsubscribe();
  }, [localStorage.getItem("email")]);

  /*
   * Check user status and approval
   */
  const checkUserStatus = async () => {
    try {
      const userDocRef = collection(db, process.env.REACT_APP_ADMIN_USERS);

      const getUserDocs = await getDocs(userDocRef);

      let userData = null;

      const currentEmail = localStorage.getItem("email");

      getUserDocs.forEach((doc) => {
        if (doc.data().email === currentEmail) {
          userData = doc.data();
        }
      });

      if (userData) {
        setIsApproved(userData.isApproved);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error fetching user data:", error);

      setLoading(false);
    }
  };

  /*
   * Get currently authenticated user's username
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUsername(user.displayName || user.email);
      } else {
        setUsername("");
      }
    });

    return () => unsubscribe();
  }, []);

  /*
   * Check admin and approval status
   */
  useEffect(() => {
    const checkUserAdminStatus = async () => {
      try {
        const userDocRef = collection(db, process.env.REACT_APP_ADMIN_USERS);

        const getUserDocs = await getDocs(userDocRef);

        let userData = null;

        getUserDocs.forEach((doc) => {
          if (doc.data().email === email) {
            userData = doc.data();
          }
        });

        if (userData) {
          setisAdmin(userData.isAdmin);

          setIsApproved(userData.isApproved);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching user data:", error);

        setLoading(false);
      }
    };

    if (email) {
      checkUserAdminStatus();
    } else {
      setLoading(false);
    }
  }, [email]);

  /*
   * Toggle mobile navbar
   */
  const handleToggle = () => {
    setIsCollapsed(!isCollapsed);
  };

  /*
   * Unauthorized message
   */
  const Unauthorized = () => {
    toast.error("Unauthorized!!!", {
      position: toast.POSITION.TOP_CENTER,
    });
  };

  /*
   * Unverified user message
   */
  const Unverified = () => {
    toast.error(
      "USER NOT APPROVED!!! Please contact with the admin to get the approval !!!",
      {
        position: toast.POSITION.TOP_CENTER,

        autoClose: false,

        theme: "colored",
      }
    );
  };

  /*
   * Footer
   */
  const Footer = () => {
    const location = useLocation();

    const isViewPost = location.pathname.includes("/view");

    return (
      <>
        {isViewPost ? null : (
          <footer className="footer">
            <p>Copyright © SRD 2024</p>
          </footer>
        )}
      </>
    );
  };

  /*
   * ==========================================
   * LOGOUT MODAL
   * ==========================================
   */

  /*
   * Open logout confirmation modal
   */
  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  /*
   * Close logout confirmation modal
   */
  const handleCloseLogout = () => {
    setShowLogoutModal(false);
  };

  /*
   * User confirmed logout
   */
  const handleConfirmLogout = () => {
    setShowLogoutModal(false);

    signUserOut(true);
  };

  /*
   * Sign user out
   *
   * manualLogout = true
   * means the user manually clicked Log Out.
   *
   * manualLogout = false
   * means automatic inactivity logout.
   */
  const signUserOut = async (manualLogout = false) => {
    try {
      /*
       * Save logout event
       */
      await Logger({
        eventType: "logout",
      });

      /*
       * Sign out from Firebase
       */
      await signOut(auth);

      /*
       * Update React authentication state
       */
      setIsApproved(false);

      setIsAuth(false);

      setisAdmin(false);

      setUsername("");

      /*
       * Clear browser storage
       */
      localStorage.clear();

      sessionStorage.clear();

      /*
       * Manual logout
       */
      if (manualLogout) {
        toast.success("Logged out successfully!", {
          position: toast.POSITION.TOP_CENTER,

          autoClose: 2000,

          hideProgressBar: true,

          closeOnClick: true,

          pauseOnHover: true,

          draggable: true,

          theme: "light",
        });

        /*
         * Allow the toast to be visible
         * before redirecting.
         */
        setTimeout(() => {
          window.location.pathname = "/";
        }, 2000);
      } else {
        /*
         * Automatic inactivity logout.
         *
         * No "Logged out successfully"
         * toast is shown.
         */
        window.location.pathname = "/";
      }
    } catch (error) {
      console.error("Error signing out:", error);

      /*
       * Show logout error to user
       */
      toast.error("Unable to log out. Please try again.", {
        position: toast.POSITION.TOP_CENTER,

        autoClose: 3000,

        hideProgressBar: true,

        closeOnClick: true,

        pauseOnHover: true,

        draggable: true,

        theme: "light",
      });
    }
  };

  /*
   * Automatic logout based on inactivity
   */
  useEffect(() => {
    let timer;

    const handleUserActivity = () => {
      clearTimeout(timer);

      timer = setTimeout(() => signUserOut(), AUTO_LOGOUT_TIME);
    };

    document.addEventListener("mousemove", handleUserActivity);

    document.addEventListener("keydown", handleUserActivity);

    /*
     * Start timer immediately.
     */
    handleUserActivity();

    return () => {
      clearTimeout(timer);

      document.removeEventListener("mousemove", handleUserActivity);

      document.removeEventListener("keydown", handleUserActivity);
    };
  }, [AUTO_LOGOUT_TIME]);

  /*
   * Loading state
   */
  if (loading) {
    return <div></div>;
  }

  return (
    <>
      {/* ======================================
          NAVBAR
          ====================================== */}

      <nav
        className="navbar navbar-expand-md navbar-dark bg-dark"
        style={{ position: "fixed" }}
      >
        <div className="container-fluid">
          <div
            className="logo"
            style={{
              position: "absolute",
              top: "1px",
            }}
          >
            <img
              src="/secure.png"
              alt="Secure Logo"
              height="50px"
              width="50px"
            />
          </div>

          <Link
            className="navbar-brand"
            to="/"
            style={{
              marginLeft: "55px",
              color: "orange",
            }}
            onClick={handleToggle}
          >
            E-Lib
          </Link>

          <button
            className="navbar-toggler"
            style={{
              paddingBottom: "20px",
            }}
            type="button"
            onClick={handleToggle}
            aria-expanded={!isCollapsed}
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div
            className={`bg-dark collapse navbar-collapse${
              isCollapsed ? "" : " show"
            }`}
            id="navbarNavAltMarkup"
          >
            <div className="bg-dark navbar-nav ms-auto">
              {/* HOME */}

              <Link
                to="/"
                className="nav-link"
                aria-current="page"
                onClick={handleToggle}
              >
                Home
              </Link>

              {/* FEATURED ARTICLE */}

              <Link to="/posts" className="nav-link" onClick={handleToggle}>
                Featured Article
              </Link>

              {/* AUTHENTICATED USER */}

              {isAuth ? (
                <>
                  {isApproved && (
                    <>
                      {/* ADMIN LINKS */}

                      {isAdmin && (
                        <>
                          <Link
                            to="/createpost"
                            className="nav-link"
                            onClick={handleToggle}
                          >
                            Create Post
                          </Link>

                          <Link
                            to="/admindashboard"
                            className="nav-link"
                            onClick={handleToggle}
                          >
                            Admin
                          </Link>
                        </>
                      )}

                      {/* TEAM */}

                      <Link
                        to="/team"
                        className="nav-link"
                        onClick={handleToggle}
                      >
                        Team
                      </Link>

                      {/* ARTICLE LIST */}

                      <Link
                        to="/articleList"
                        className="nav-link"
                        onClick={handleToggle}
                      >
                        Article List
                      </Link>

                      {/* PDF DROPDOWN */}

                      <Link className="nav-link">
                        <DropdownComponent />
                      </Link>

                      {/* CATEGORY DROPDOWN */}

                      <Link className="nav-link">
                        <CategoryDropdownComponent />
                      </Link>

                      {/* ==========================
                          USER PROFILE DROPDOWN
                          ========================== */}

                      <div className="nav-item dropdown">
                        <button
                          className="nav-link dropdown-toggle btn btn-link"
                          id="profileDropdown"
                          type="button"
                          data-bs-toggle="dropdown"
                          aria-expanded="false"
                          style={{
                            cursor: "pointer",
                            textDecoration: "none",
                          }}
                        >
                          {username}
                        </button>

                        <ul
                          className="dropdown-menu dropdown-menu-end"
                          aria-labelledby="profileDropdown"
                        >
                          <li>
                            <Link
                              className="dropdown-item"
                              to="/profile"
                              onClick={handleToggle}
                            >
                              Profile
                            </Link>
                          </li>

                          <li>
                            <hr className="dropdown-divider" />
                          </li>

                          <li>
                            <button
                              type="button"
                              className="dropdown-item"
                              onClick={handleLogout}
                              style={{
                                cursor: "pointer",
                              }}
                            >
                              Log Out
                            </button>
                          </li>
                        </ul>
                      </div>
                    </>
                  )}
                </>
              ) : null}

              {/* LOGIN */}

              {!isAuth || !isApproved ? (
                <Link to="/login" className="nav-link" onClick={handleToggle}>
                  Login
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </nav>

      {/* ======================================
          LOGOUT CONFIRMATION MODAL
          ====================================== */}

      <Modal
        show={showLogoutModal}
        onHide={handleCloseLogout}
        centered
        dialogClassName="logout-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm Logout</Modal.Title>
        </Modal.Header>

        <Modal.Body>Are you sure you want to log out?</Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseLogout}>
            Cancel
          </Button>

          <Button variant="danger" onClick={handleConfirmLogout}>
            Log Out
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ======================================
          TOAST NOTIFICATIONS
          ====================================== */}

      <ToastContainer
        position="top-center"
        autoClose={3000}
        theme="colored"
        hideProgressBar={true}
        closeOnClick={true}
      />

      {/* ======================================
          ROUTES
          ====================================== */}

      {isAuth ? (
        <>
          {isApproved ? (
            <Routes>
              <Route
                path="/login"
                element={<PdfViewerPage setIsAuth={setIsAuth} />}
              />

              <Route path="/signup" element={<SignUp />} />

              <Route path="/" element={<Landing isAuth={isAuth} />} />

              <Route path="/team" element={<Team isAuth={isAuth} />} />

              <Route
                path="/pdfList"
                element={<PdfList isAuth={isAuth} isApproved={isApproved} />}
              />

              <Route
                path="/articleList"
                element={<ArticleList isAuth={isAuth} totalTime={pdfTimer} />}
              />

              <Route
                path="/categorypdfList"
                element={<CategoryPdfList isAuth={isAuth} />}
              />

              <Route path="/posts" element={<Posts isAuth={isAuth} />} />

              <Route path="/view" element={<ViewPost />} />

              <Route path="/viewLogs" element={<ViewLogs />} />

              {isAdmin ? (
                <>
                  <Route
                    path="/createpost"
                    element={<CreatePost isAuth={isAuth} />}
                  />

                  <Route
                    path="/admindashboard"
                    element={<Admin isAuth={isAuth} />}
                  />
                </>
              ) : (
                <Route path="/createpost" element={<Unauthorized />} />
              )}
            </Routes>
          ) : (
            <Routes>
              <Route
                path="/"
                element={
                  <>
                    <Landing isAuth={isAuth} />

                    <Unverified />
                  </>
                }
              />

              <Route
                path="/team"
                element={
                  <>
                    <Team isAuth={isAuth} />

                    <Unverified />
                  </>
                }
              />

              <Route
                path="/articleList"
                element={<ArticleList isAuth={isAuth} totalTime={pdfTimer} />}
              />

              <Route
                path="/pdfList"
                element={
                  <>
                    <PdfList isAuth={isAuth} />

                    <Unverified />
                  </>
                }
              />

              <Route
                path="/posts"
                element={
                  <>
                    <Navigate to="/login" />

                    <Unverified />
                  </>
                }
              />

              <Route path="/login" element={<Login setIsAuth={setIsAuth} />} />
            </Routes>
          )}
        </>
      ) : (
        <Routes>
          <Route path="/signup" element={<SignUp />} />

          <Route path="/" element={<Landing isAuth={isAuth} />} />

          <Route path="/team" element={<Team isAuth={isAuth} />} />

          <Route path="/pdfList" element={<PdfList isAuth={isAuth} />} />

          <Route
            path="/categorypdfList"
            element={<CategoryPdfList isAuth={isAuth} />}
          />

          <Route path="/login" element={<Login setIsAuth={setIsAuth} />} />

          <Route
            path="/PdfViewerPage"
            element={<PdfViewerPage isAuth={isAuth} />}
          />

          <Route
            path="/posts"
            element={<Posts isAuth={isAuth} isAdmin={isAdmin} />}
          />

          <Route path="/view" element={<ViewPost />} />
        </Routes>
      )}

      <Footer />
    </>
  );
}

export default App;
