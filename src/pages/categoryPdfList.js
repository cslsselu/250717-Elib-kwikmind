import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Button, Table, FormControl, Modal } from 'react-bootstrap';
import { Document, Page } from "react-pdf";
import "./pdfList.css";
import UpdatePostViews from "../utils/updatePostViews";

const PdfList = () => {
  const [pdfs, setPdfs] = useState([]);
  const [newSearch, setNewSearch] = useState('');
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showPdfModalNormal, setshowPdfModalNormal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [numPages, setNumPages] = useState(null);
  const selectedCategory = sessionStorage.getItem('selectedCategory');
  

  useEffect(() => { 
    const fetchPdfs = async () => {
      try {
        const pdfsCollection = collection(db, 'pdfs');
        let querySnapshot;

         if (selectedCategory) {
          // alert(selectedCategory)
          querySnapshot = await getDocs(query(pdfsCollection, where('categories', 'array-contains', selectedCategory)));
        } else {
          // If neither selectedGroup nor selectedCategory is present, fetch all PDFs
          querySnapshot = await getDocs(pdfsCollection);
        }

        const pdfsArray = [];

        querySnapshot.forEach((doc) => {
          const pdfData = doc.data();
          pdfsArray.push({
            id: doc.id,
            ...pdfData,
          });
        });

        setPdfs(pdfsArray);
      } catch (error) {
        console.error('Error fetching PDFs:', error);
      }
    };

    fetchPdfs();
  }, [selectedCategory]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const viewpdf = (pdfUrl, access) => {
    sessionStorage.setItem("url", pdfUrl);

    access = String(access).toLowerCase();
    if (access === "restricted") {
      setPdfUrl(pdfUrl);
      setShowPdfModal(true);
    } else if (access === "unrestricted") {   
      setPdfUrl(pdfUrl);
      setshowPdfModalNormal(true);
    } else {
      console.error("Invalid access type provided.");
    }

    UpdatePostViews(pdfUrl);
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
                  onClick={() => viewpdf(pdf.url, pdf.access)}
                >
                  View
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal show={showPdfModal} onHide={() => setShowPdfModal(false)} className="custom-pdf-modal">
        <Modal.Header closeButton>
          <Modal.Title>PDF Viewer</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Document className="pdf-content"
            file={{
              url: pdfUrl
            }}
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

      <Modal show={showPdfModalNormal} onHide={() => setshowPdfModalNormal(false)} dialogClassName="pdf-modal-dialog">
        <Modal.Body>
          <iframe src={`${pdfUrl}#navpanes=0`} title="PDF Viewer" className="pdf-modal-iframe" />
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default PdfList;
