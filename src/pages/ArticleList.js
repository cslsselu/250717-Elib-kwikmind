import React, { useEffect, useState, useMemo} from 'react';
import { useNavigate } from "react-router-dom";
import { db, auth } from '../firebase';
import { collection, getDocs, query, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Button, Table, FormControl, Modal } from 'react-bootstrap';
import { Document, Page } from "react-pdf";
import "./pdfList.css";
import UpdatePostViews from "../utils/updatePostViews";

const PdfList = ({totalTime}) => {
  const [pdfs, setPdfs] = useState([]);
  const [newSearch, setNewSearch] = useState('');
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showPdfModalNormal, setshowPdfModalNormal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [numPages, setNumPages] = useState(null);
  const selectedGroup = sessionStorage.getItem('selectedGroup');
  const selectedCategory = sessionStorage.getItem('selectedCategory');
  const [viewedCount, setViewedCount] = useState(null);
  // const type = sessionStorage.getItem('type');

  const [timeRemaining, setTimeRemaining] = useState(0);
  const navigate = useNavigate();

  useEffect(() => { 
    const fetchPdfs = async () => {
      try {
        const pdfsCollection = collection(db, 'pdfs');
        let querySnapshot;
        //alert(type)

        querySnapshot = await getDocs(pdfsCollection);

        const pdfsArray = [];

        querySnapshot.forEach((doc) => {
          const pdfData = doc.data();
          pdfsArray.push({
            docId: doc.id,
            ...pdfData,
          });
        });

        setPdfs(pdfsArray);
      } catch (error) {
        console.error('Error fetching PDFs:', error);
      }
    };

    fetchPdfs();

  }, [selectedGroup, selectedCategory]);


    const getPostViewCount = async (url) => {
        try {
            console.log("Fetching view count for:", url);

            const postsRef = collection(db, "pdfs");
            const q = query(postsRef, where("url", "==", url));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                let viewCount = 0;
                querySnapshot.forEach((doc) => {
                    viewCount = doc.data().viewed_count || 0;
                });

                setViewedCount(viewCount);
            } else {
                console.log("Post not found");
            }
        } catch (error) {
            console.error("Error fetching view count:", error);
        }
    };

    // if (url) {
    //     getPostViewCount(url);
    // };

  //   useEffect(() => {
  //     if (pdfUrl && showPdfModal) {
  //         const fetchViewCount = async () => {
  //             const count = await getPostViewCount(pdfUrl);
  //             setViewCount(count);
  //         };
  //         fetchViewCount();
  //     }
  // }, [pdfUrl, showPdfModal]);

  // Unlock the PDF when the session expires or the user closes it
  const unlockPdf = async (pdfId) => {
    const pdfDocRef = doc(db, 'pdfs', pdfId);
    await updateDoc(pdfDocRef, {
      isBeingViewed: false,
      currentViewer: "",
      expiryTime: ""
    });
  };

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
  
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  console.log(formatTime(10800))

  // Timer logic to expire session after 3 hours (10800 seconds)
  useEffect(() => {
    let timer;
    if (timeRemaining > 0) {
      timer = setInterval(() => {
        setTimeRemaining((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timeRemaining === 0) {

      if(showPdfModal === true){
        alert("Your session has expired!");

        // Unlock the PDF after the session expires
        const pdfId = sessionStorage.getItem("pdfId");
        unlockPdf(pdfId); // Unlock the PDF
        window.location.href = '/';
        setShowPdfModal(false)
      }
      else if(showPdfModalNormal === true){
        alert("Your session has expired!");
        window.location.href = '/';
        setshowPdfModalNormal(false)
      }
    }
    return () => clearInterval(timer);
  }, [timeRemaining, showPdfModal, navigate]);

  // Memoize the file prop to avoid unnecessary re-renders
  const memoizedFile = useMemo(() => ({
    url: pdfUrl
  }), [pdfUrl]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const viewpdf = async  (pdfId, pdfUrl, access) => {
    const currentUserId = auth.currentUser.uid; // Get the current user ID

    // Fetch the selected PDF's data from Firestore
    const pdfDocRef = doc(db, 'pdfs', pdfId);
    const pdfDocSnapshot = await getDoc(pdfDocRef);
    const pdfData = pdfDocSnapshot.data();

    // Check if the PDF is currently being viewed by another user
    if (pdfData.isBeingViewed && pdfData.currentViewer !== currentUserId) {
      alert("This PDF is currently being viewed by another user. Please try again later.");
    return; // Exit if another user is viewing the PDF
    }

    if(access === "restricted"){
      setPdfUrl(pdfUrl);
      getPostViewCount(pdfUrl);
      setShowPdfModal(true);
      setshowPdfModalNormal(false); // Close other modal if open
  
      if (timeRemaining <= 0) {
        setTimeRemaining(totalTime); 
      }
  
      // Set the PDF to being viewed by the current user and set expiry time
      const expiryTime = Date.now() + 3 * 60 * 60 * 1000; // 3 hours from now
      await updateDoc(pdfDocRef, {
        isBeingViewed: true,
        currentViewer: currentUserId,
        expiryTime: expiryTime
      });
    }
    else if(access === "unrestricted"){
      setPdfUrl(pdfUrl);
      setshowPdfModalNormal(true);
    }
    else{
      console.error("Invalid access type provided.");
    }

    UpdatePostViews(pdfUrl);
  }

  const handleCloseModal = async () => {
    const pdfId = sessionStorage.getItem("pdfId");
    await unlockPdf(pdfId);
    setShowPdfModal(false);
    setshowPdfModalNormal(false);
  };

  const handleSearch = (event) => {
    const search = event.target.value;
    setNewSearch(search);
  };

  // Filtering PDFs based on search term
  const showSearchResults = newSearch
    ? pdfs.filter((pdf) =>
        pdf.title.toUpperCase().includes(newSearch.toUpperCase()) ||
        (pdf.Author && pdf.Author.toUpperCase().includes(newSearch.toUpperCase()))
      )
    : pdfs;

  return (
    <div>
      <h2 style={{ textAlign: 'center' }}>PDF Lists</h2>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end' }}>
        <FormControl
          type="text"
          placeholder="Search PDFs..." 
          value={newSearch}
          onChange={handleSearch}
          style={{ width: '200px', marginRight: '10px', borderRadius: '20px' }}
        />
      </div>
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>#</th>
            <th>Title</th>
            <th>Author</th>
            <th>Access</th>
            <th>View</th>
          </tr>
        </thead>
        <tbody>
          {showSearchResults.map((pdf, index) => (
            <tr key={pdf.id}>
              <td>{index + 1}</td>
              <td>{pdf.title}</td>
              <td>{pdf.Author || ''}</td>
              <td>{pdf.access}</td>
              <td>
                <Button
                  style={{ fontSize: '12px' }}
                  onClick={() => {
                    sessionStorage.setItem("pdfId", pdf.docId);
                    viewpdf(pdf.docId, pdf.url, pdf.access)}}
                >
                  View
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal show={showPdfModal} onHide={handleCloseModal} className="custom-pdf-modal">
        <Modal.Header closeButton>
          <Modal.Title>PDF Viewer</Modal.Title>
        </Modal.Header>
        <Modal.Body>
        <div className="d-flex justify-content-between mb-3">
      <p className="mb-0">Time Remaining: {formatTime(timeRemaining)}</p>
      <p className="mb-0">Viewed Count: {viewedCount}</p>
    </div>
          <Document className="pdf-content"
            file={memoizedFile} // Use memoized file prop here
            onLoadSuccess={onDocumentLoadSuccess}
          >
            {[...Array(numPages).keys()].map((pageIndex) => (
              <Page key={`page_${pageIndex + 1}`} pageNumber={pageIndex + 1} renderAnnotationLayer={false} renderTextLayer={false} style={{ width: 1200}}/>
            ))}
          </Document>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPdfModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showPdfModalNormal} onHide={handleCloseModal} dialogClassName="pdf-modal-dialog">
        <Modal.Body>
          <iframe src={`${pdfUrl}#navpanes=0`} title="PDF Viewer" className="pdf-modal-iframe" />
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default PdfList;