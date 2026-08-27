import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from 'react-bootstrap';
import { useLocation } from 'react-router-dom';

import '../PdfViewerPage.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

const PdfViewerPage = () => {
  const [numPages, setNumPages] = useState(null);
  const selectedPdf = sessionStorage.getItem('url');

  const renderPdfPages = () => {
    return (
      <>
        {[...Array(numPages).keys()].map((pageIndex) => (
          <Page key={`page_${pageIndex + 1}`} pageNumber={pageIndex + 1} renderAnnotationLayer={false} renderTextLayer={false}/>
        ))}
      </>
    );
  };

  return (
    <div className="pdf-viewer-container">
      <h2 className="pdf-viewer-title">PDF Viewer</h2>
      <div className="pdf-viewer-navigation">
      </div>
      <div className="pdf-document">
        <Document
          file={selectedPdf}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        >
          {renderPdfPages()}
        </Document>
      </div>
    </div>
  );
};

export default PdfViewerPage;
