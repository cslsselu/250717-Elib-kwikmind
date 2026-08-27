import React, { useState } from "react";
import { auth, db, provider } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { toast } from "react-toastify";
import Logger from './Logger';

function Login({ setIsAuth }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();
  const postCollectionRef = collection(db, process.env.REACT_APP_ADMIN_USERS);

  const signInWithGoogle = () => {
    signInWithPopup(auth, provider)
      .then(async (userCredential) => {
        Logger({ eventType: 'login'});
        setIsAuth(true);
        localStorage.setItem("isAuth", true);

        const name = auth.currentUser.displayName;
        const email = auth.currentUser.email;
        const id = auth.currentUser.uid;
        const date = serverTimestamp();
        const uid = auth.currentUser.uid;
        localStorage.setItem("email", email);

        const querySnapshot = await getDocs(
          query(postCollectionRef, where("email", "==", email))
        );
        if (querySnapshot.size > 0) {
          const docRef = doc(postCollectionRef, querySnapshot.docs[0].id);
          await updateDoc(docRef, {
            date,
            name,
            email,
          });
        } else {
          await addDoc(postCollectionRef, {
            date,
            name,
            email,
            isAdmin: false,
            isApproved: false,
          });
        }

        navigate("/posts");
      })
      .catch((error) => {
        toast.error(error.code.replace("auth/", ""));
      });
  };

  const signIn = (e) => {
    e.preventDefault();

    signInWithEmailAndPassword(auth, email, password)
      .then(async (userCredential) => {
        console.log({userCredential});
       // alert("hello")
        if (!userCredential.user.emailVerified) {
          toast.error("Unverified user. Please check your email.");
          sendEmailVerification(auth.currentUser);
        } else {
          
          
          localStorage.setItem("email", userCredential.user.email)
          setIsAuth(true);
          localStorage.setItem("isAuth", true);
          localStorage.setItem("uid", userCredential.user.uid);
          console.log(userCredential.user.email)
          //alert("inside else")
          //navigate("/login");
          // Logger({ eventType: 'login'});
        }
        const name = userCredential.user.displayName;
        const email = userCredential.user.email;
        const id = userCredential.user.uid;
        const date = serverTimestamp();

        const querySnapshot = await getDocs(
          query(postCollectionRef, where("email", "==", email))
        );
        if (querySnapshot.size > 0) {
          const docRef = doc(postCollectionRef, querySnapshot.docs[0].id);
          await updateDoc(docRef, {
            id,
            date,
            name,
            email,
          });
        } else {
          await addDoc(postCollectionRef, {
            id,
            date,
            name,
            email,
            isAdmin: false,
            isApproved: false,
          });
        }
        navigate("/posts");
      })

      
      .catch((error) => {
        toast.error(error.code.replace("auth/", ""));
      });
  };

  const resetPass = () => {
    sendPasswordResetEmail(auth, email)
      .then(() => {
        toast.info("Password reset email sent.", {
          position: toast.POSITION.TOP_CENTER,
          autoClose: 3000,
          theme: "colored",
          hideProgressBar: true,
          closeOnClick: true,
        });
      })
      .catch((error) => {
        console.log(error);
        if (error.code == "auth/missing-email") {
          const emailInput = document.getElementById("email");
          if (emailInput) {
            emailInput.focus();
            toast.error("Please input your email.", {
              position: toast.POSITION.TOP_CENTER,
              autoClose: 3000,
              theme: "colored",
              hideProgressBar: true,
              closeOnClick: true,
            });
            return;
          }
        }
      });
  };

  return (
    <div className="loginPage">
      <section className="signup">
        <div className="container">
          <div className="signin-content">
            <div className="signin-image">
              <figure>
                <img src="/signin.jpg" alt="sing up image" />
              </figure>
            </div>

            <div className="signin-form">
              <h2 className="form-title">Login</h2>
              <form className="register-form" id="login-form">
                <div className="form-group">
                  <label htmlFor="your_name">
                    <i className="zmdi zmdi-account material-icons-name"></i>
                  </label>
                  <input
                    type="text"
                    name="email"
                    id="email"
                    placeholder="Your Email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="your_pass">
                    <i className="zmdi zmdi-lock"></i>
                  </label>
                  <input
                    type="password"
                    name="your_pass"
                    id="your_pass"
                    placeholder="Password"
                    autoComplete="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <label
                  htmlFor="remember-me"
                  className="forget-pass"
                  onClick={resetPass}
                >
                  Forget Password?
                </label>
                <div className=" form-button">
                  <input
                    style={{
                      height: "50px",
                      fontWeight: "bold",
                      fontSize: "15px",
                      padding: "10px 30px", // Adjusting padding for spacing
                    }}
                    type="submit"
                    name="signin"
                    id="signin"
                    className="form-submit"
                    value="Log in"
                    onClick={signIn}
                  />
                </div>
              </form>
              <button
                className="login-with-google-btn"
                type="submit"
                onClick={signInWithGoogle}
              >
                Continue with Google
              </button>
              <hr />

              <div className="social-login">
                <a
                  href="/signup"
                  style={{ textDecoration: "none", marginTop: "-5px" }}
                >
                  <input
                    style={{
                      marginTop: "0px",
                      marginLeft: "35px",
                      color: "white",
                      fontSize: "15px",
                      backgroundColor: "#42b72a",
                      border: "1px solid transparent", // Adding 'solid' to fix border rendering
                      padding: "10px 35px", // Adjusting padding for spacing
                      fontWeight: "bold", // Making the text bold
                      display: "", // Making the input a block element
                      width: "80%", // Making the input take full width of the parent
                      boxSizing: "border-box", // Including padding and border in width
                    }}
                    type="text"
                    readOnly
                    className="form-submit"
                    value="Create a new account"
                  />
                </a>
                {/* <ul className="socials">
                 
        
                  <li>
                    <a href="/">
                      <i className="display-flex-center zmdi zmdi-facebook"></i>
                    </a>
                  </li>
                  <li>
                    <a href="/">
                      <i className="display-flex-center zmdi zmdi-twitter"></i>
                    </a>
                  </li>
                  <li>
                    <a href="/">
                      <i className="display-flex-center zmdi zmdi-google"></i>
                    </a>
                  </li>
                </ul> */}
              </div>
            </div>
          </div>
        </div>
      </section>
      <hr />
      <hr />
    </div>
  );
}

export default Login;
