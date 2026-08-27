import React, { useEffect, useState } from "react";
import "react-toastify/dist/ReactToastify.css";
import { toast } from "react-toastify";

import { Carousel, Row, Col } from "react-bootstrap";
import Student1 from "../assests/mobile.jpg";
import Student2 from "../assests/study.jpg";
import Library from "../assests/SchoolLibrary.jpg";
import "./Landing.css";

function Landing({ isAuth }) {
  const [notices, setNotices] = useState();

  useEffect(() => {
    if (!isAuth) {
      toast.warning("Logged out Successfully!!!", {
        position: toast.POSITION.TOP_CENTER,
        autoClose: 2000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
      });
    }
  }, [isAuth]);

  return (
    <div className="landing-container">
      <Carousel>
        <Carousel.Item>
          <img src={Library} alt="Library" />
        </Carousel.Item>
        <Carousel.Item>
          <img src={Student1} alt="Mobile Learning" />
        </Carousel.Item>
        <Carousel.Item>
          <img src={Student2} alt="Studying" />
        </Carousel.Item>
      </Carousel>

      <Row className="display-row justify-content-center align-items-center">
        <Col md={7} className="mb-4">
          <div className="gradient-card">
            <div className="card-content">
              <h2 className="title">About the Site</h2>
              <p>
                This platform provides a unique educational environment where
                students can log in using Google Sign-In to access posts shared
                by their teachers. Teachers can create a variety of content,
                including announcements, assignments, and e-books, with source
                links hidden for privacy. A special feature ensures that only
                one student can view a book at a time, disabling downloads for
                focused learning. Teachers can also embed online docs directly
                into posts, enhancing security and preventing sharing.
              </p>
            </div>
          </div>
        </Col>

        <Col md={4} className="notice-section mb-5">
          <div className="notice-container gradient-card">
            <div className="card-content">
              <h2 className="notice">Important Notice</h2>
              <p>
                <a
                  href="https://docs.google.com/document/d/e/2PACX-1vSr6lJ6Wtg6anxw_hDzDTegfDdPnrQ7fIBQftZlNVMYkojhXKGvqgHiTtAKB3SFk9Snx0Af8hOtYeyB/pub?urp=gmail_link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Click here to learn more.
                </a>
              </p>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
}

export default Landing;
