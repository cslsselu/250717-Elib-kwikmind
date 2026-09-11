import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { auth, db, provider } from "../firebase";
import {
  FaArrowRight,
  FaPencil,
  FaSquareCheck,
  FaSquareXmark,
  FaTrashCan,
} from "react-icons/fa6";
import { Button, Modal } from "react-bootstrap";


function Admin() {
  const [users, Setusers] = useState([]);
  const [selectOption, setSelectOption] = useState("all");
  const [isLoading, setisLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showConfirmModalDelete, setShowConfirmModalDelete] = useState(false);
  const [userToApprove, setUserToApprove] = useState("");
  const uid = localStorage.getItem("uid") || "";
  const [time, setTime] = useState("");
  const [placeholder, setPlaceholder] = useState("");

  useEffect(() => {
    const fetchTimerValue = async () => {
      try {
        const timerCollection = collection(db, "timer");
        const timerSnapshot = await getDocs(timerCollection);

        if (!timerSnapshot.empty) {
          const firstDoc = timerSnapshot.docs[0];
          const secondsValue = firstDoc.data().seconds; 
          //setTime(secondsValue);
          setPlaceholder(secondsValue);
        } else {
          console.log("No timer document found.");
        }
      } catch (error) {
        console.error("Error fetching timer value:", error);
      }
    };

    fetchTimerValue();
  }, []); // Empty dependency array to run only on mount


  const handleSetTimer = async () => {
    if (!time) {
      alert("Please enter a valid time.");
      return;
    }

    alert(time)

    try {
      const timerCollection = collection(db, "timer");
      const timerSnapshot = await getDocs(timerCollection);
      
      if (!timerSnapshot.empty) {
        const firstDoc = timerSnapshot.docs[0]; // Get the first document
        const timerRef = doc(db, "timer", firstDoc.id);

        await updateDoc(timerRef, {
          seconds: parseInt(time, 10), // Convert input to number
         // seconds: time,
        });

        alert("Timer updated successfully!");
        setTime(""); // Reset input
      } else {
        alert("No timer document found.");
      }
    } catch (error) {
      console.error("Error updating timer:", error);
      alert("Failed to update timer.");
    }
  }

  const fetchUser = async () => {
    const usersCollectionRef = collection(
      db,
      process.env.REACT_APP_ADMIN_USERS
    );
    const usersSnapshot = await getDocs(usersCollectionRef);
    const userdata = usersSnapshot.docs.map((doc) => doc.data());
    Setusers(userdata);
    setisLoading(false);
  };

  // async function deletePost(id) {
  //   const postDoc = doc(db, process.env.REACT_APP_ADMIN_DATABSE, id);
  //   await deleteDoc(postDoc);
  //   getPosts();
  // }

  const handleViewLogs = (user) => {
    sessionStorage.setItem("userEmail", user.email);
    window.open("/viewLogs", "_blank");
};

  let filteredUsers = users;
  if (selectOption === "admin") {
    filteredUsers = users.filter((user) => user.isAdmin && user.id !== uid);
  } else if (selectOption === "user") {
    filteredUsers = users.filter((user) => !user.isAdmin && user.id !== uid);
  } else if (selectOption === "all") {
    filteredUsers = users.filter((user) => user.id !== uid);
  }

  const handleOptionChange = (event) => {
    setSelectOption(event.target.value);
  };

  //   async function deletePost(id) {
  //   const postDoc = doc(db, process.env.REACT_APP_ADMIN_DATABSE, id);
  //   await deleteDoc(postDoc);
  //   getPosts();
  // }

  const toggleApprove = async (user) => {
    try {
      const usersCollectionRef = collection(
        db,
        process.env.REACT_APP_ADMIN_USERS
      );
      const querySnapshot = await getDocs(
        query(usersCollectionRef, where("email", "==", user.email))
      );
      const userRef = doc(usersCollectionRef, querySnapshot.docs[0].id);
      const currentIsApproved = querySnapshot.docs[0].data().isApproved;
      const updatedIsApproved = !currentIsApproved; // Toggle the value

      await updateDoc(userRef, { isApproved: updatedIsApproved });
      setShowConfirmModal(false);
      fetchUser();
    } catch (error) {
      console.error("Error updating user approval", error);
    }
  };
  


  const toggleDelete = async (user) => {
    if (user.isAdmin) {
      alert("The user is an admin and cannot be deleted.");
      return;
    }

    try {
      const usersCollectionRef = collection(
        db,
        process.env.REACT_APP_ADMIN_USERS
      );
      const querySnapshot = await getDocs(
        query(usersCollectionRef, where("id", "==", user.id))
      );
      const userRef = doc(usersCollectionRef, querySnapshot.docs[0].id);

      await deleteDoc(userRef);
      auth.deleteuser()
      setShowConfirmModalDelete(false);

      fetchUser();
    } catch (error) {
      console.error("Error updating user approval", error);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  if (isLoading) {
    return <div></div>;
  }

  return (
    <>
      <div className="admin-container">
      <div className="timer-container" 
  style={{ 
    marginTop: "20px",  
    marginBottom: "15px", 
    display: "flex", 
    alignItems: "center", 
    gap: "10px" 
  }}>
  
  <input
    type="text"
    placeholder={`current: ${placeholder} sec`}
    onChange={(e) => setTime(e.target.value)}
    className="form-control"
    style={{ 
      width: "160px", 
      padding: "8px", 
      borderRadius: "8px", 
      border: "1px solid #ccc",
      fontSize: "14px"
    }}
  />
  
  <button 
    className="btn btn-primary"
    style={{
      padding: "8px 15px", 
      fontSize: "14px",
      fontWeight: "bold",
      borderRadius: "8px", 
      backgroundColor: "#007bff", 
      border: "none", 
      boxShadow: "0px 2px 5px rgba(0, 0, 0, 0.2)", 
      transition: "0.3s ease",
      cursor: "pointer"
    }}
    onMouseOver={(e) => e.target.style.backgroundColor = "#0056b3"}
    onMouseOut={(e) => e.target.style.backgroundColor = "#007bff"}
    onClick={handleSetTimer}
  >
    Set Timer
  </button>

</div>


        <center>
          <h2> Admin Dashboard</h2>
          <hr />
        </center>
        <div className="option-container" style={{ float: "right" }}>
          <select value={selectOption} onChange={handleOptionChange}>
            <option value="all">Sort by: Show All</option>
            <option value="admin">Sort by: Show Admins</option>
            <option value="user">Sort by: Show Users</option>
          </select>
        </div>
        <div className="admin-list">
          <table className="table table-hover" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Last Login</th>
                <th scope="col">Role</th>
                <th scope="col">Approved</th>
                <th scope="col">Actions</th>
                <th scope="col">Logs</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, index) => (
                <tr key={index}>
                  <th scope="row">{index + 1}</th>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td style={{ fontSize: "13px" }}>
                    {user.date ? user.date.toDate().toLocaleString() : 'N/A'}
                  </td>
                  <td>{user.isAdmin ? "Admin" : "User"}</td>
                  <td>
                    {user.isApproved ? (
                      <div>
                        &nbsp; &nbsp; &nbsp;
                        <FaSquareCheck style={{ color: "#17c200", fontSize: "20px" }} />
                      </div>
                    ) : (
                      <div>
                        &nbsp; &nbsp; &nbsp;
                        <FaSquareXmark style={{ color: "red", fontSize: "20px" }} />
                      </div>
                    )}
                  </td>
                  <td>
                    <div>
                      <button
                        className="btn edit-button"
                        style={{ padding: "0px", color: "orange" }}
                        onClick={() => {
                          setUserToApprove(user);
                          setShowConfirmModal(true);
                        }}
                      >
                        <FaPencil />
                      </button>
                      &nbsp; &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                      <button
                        className="btn edit-button"
                        style={{ padding: "0px", color: "red" }}
                        onClick={() => {
                          setUserToApprove(user);
                          setShowConfirmModalDelete(true);
                        }}
                      >
                        <FaTrashCan />
                      </button>
                    </div>
                  </td>
                  <td>
                    <button
                      className="btn edit-button"
                      style={{ padding: "0px", color: "blue" }}
                      onClick={() => handleViewLogs(user)}
                    >
                      View Logs
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Modal
          show={showConfirmModal}
          keyboard={false}
          onHide={() => setShowConfirmModal(false)}
        >
          <Modal.Header>
            <Modal.Title>Edit Permission</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <strong>User: </strong>
            {userToApprove.name} <br />
            <strong>Change Permission </strong>
            {userToApprove.isApproved ? (
              <div>
                <FaSquareCheck style={{ color: "green", fontSize: "20px" }} />
                <FaArrowRight style={{ fontSize: "25px" }} />
                <FaSquareXmark style={{ color: "red", fontSize: "20px" }} />
              </div>
            ) : (
              <div>
                <FaSquareXmark style={{ color: "red", fontSize: "20px" }} />{" "}
                <FaArrowRight style={{ fontSize: "25px" }} />
                <FaSquareCheck style={{ color: "green", fontSize: "20px" }} />
              </div>
            )}
            <hr />
            Are you sure to approve these changes?
            <br />
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="success"
              onClick={() => toggleApprove(userToApprove)}
            >
              Save
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setShowConfirmModal(false);
              }}
            >
              Cancel
            </Button>
          </Modal.Footer>
        </Modal>
        {/* Delete Modal */}

<Modal
  show={showConfirmModalDelete}
  keyboard={false}
  onHide={() => setShowConfirmModalDelete(false)}
  dialogClassName="custom-modal"
>
  <Modal.Header>
    <Modal.Title>Delete</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    <strong>User: </strong>
    {userToApprove.name} <br />
    <strong>Change Permission </strong>
    <hr />
    Are you sure to delete this user?
    <br />
  </Modal.Body>
  <Modal.Footer>
    <Button
      variant="success"
      onClick={() => toggleDelete(userToApprove)}
    >
      Save
    </Button>
    <Button
      variant="danger"
      onClick={() => {
        setShowConfirmModalDelete(false);
      }}
    >
      Cancel
    </Button>
  </Modal.Footer>
</Modal>

      </div>
    </>
  );
}

export default Admin;
