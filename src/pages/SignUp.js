import React from "react";
import "../Signup.css";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ToastContainer, toast } from "react-toastify";

function SignUp() {
  const navigate = useNavigate();
  const [name, setName] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const postCollectionRef = collection(db, process.env.REACT_APP_ADMIN_USERS);

  const signUp = (e) => {
    createUserWithEmailAndPassword(auth, email, password)
      .then(async (userCredential) => {
        console.log("here is the signup", userCredential);
        if (!userCredential.user.emailVerified) {
          sendEmailVerification(auth.currentUser);
          toast.info("Please check your email to verify", {
            position: toast.POSITION.TOP_CENTER,
            autoClose: 3000,
            theme: "colored",
            hideProgressBar: true,
            closeOnClick: true,
          });
          setTimeout(() => {
            window.location.pathname = "/";
          }, 1000);
        }
        const email = auth.currentUser.email;
        const id = auth.currentUser.uid;
        const date = serverTimestamp();
        const uid = auth.currentUser.uid;
        // localStorage.setItem("uid", uid);
        await addDoc(postCollectionRef, {
          id,
          date,
          name,
          email,
          isAdmin: false,
          isApproved: false,
        });
        navigate("/login");
      })
      .catch((error) => {
        console.log(error);
        toast.error(error.code, {
          position: toast.POSITION.TOP_CENTER,
          autoClose: 3000,
          theme: "colored",
          hideProgressBar: true,
          closeOnClick: true,
        });
      });
  };
  const onSubmit = (e) => {
    e.preventDefault();
    console.log("SUBMITTED");
    signUp();
  };

  return (
    <div>
      <section className="signup">
        <ToastContainer />
        <div className="container">
          <div className="signup-content">
            <div className="signup-form">
              <h2 className="form-title">Sign up</h2>
              <form
                onSubmit={onSubmit}
                className="register-form"
                id="register-form"
              >
                <div className="form-group">
                  {/* <label for="name">
                    <i className="zmdi zmdi-account material-icons-name"></i>
                  </label> */}
                  <input
                    type="text"
                    name="name"
                    id="name"
                    placeholder="Your Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">
                    <i className="zmdi zmdi-email"></i>
                  </label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    placeholder="Your Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="pass">
                    <i className="zmdi zmdi-lock"></i>
                  </label>
                  <input
                    type="password"
                    name="pass"
                    id="pass"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="re-pass">
                    <i className="zmdi zmdi-lock-outline"></i>
                  </label>
                  <input
                    type="password"
                    name="re_pass"
                    id="re_pass"
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                  />
                </div>
                <div className="form-group">
                  <input
                    type="checkbox"
                    name="agree-term"
                    id="agree-term"
                    className="agree-term"
                  />
                </div>
                <div className="form-group form-button">
                  <input
                    style={{
                      position: "fixed",
                    }}
                    type="submit"
                    name="signup"
                    id="signup"
                    className="form-submit"
                    value="Register"
                  />
                </div>
              </form>
            </div>
            {/* <div className="vertical-line"></div> */}

            <div className="signup-image">
              <figure>
                <img src="/signup.jpg" alt="sing up image" />
              </figure>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default SignUp;
