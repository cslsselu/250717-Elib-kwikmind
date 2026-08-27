import React, { useState, useEffect } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

const DropdownComponent = () => {
  const [pdfsArray, setPdfsArray] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const groups = await fetchGroups();
      setPdfsArray(groups);
    };
    fetchData();
  }, []);

  const fetchGroups = async () => {
    try {
      const pdfsCollection = collection(db, 'pdfs');
      const pdfData = await getDocs(pdfsCollection);

      // Use a Set to store unique group values
      const uniqueGroups = new Set();

      pdfData.forEach((doc) => {
        const group = doc.data().group;
        uniqueGroups.add(group);
      });

      // Convert the Set back to an array
      const uniqueGroupsArray = [...uniqueGroups].sort((a, b) => a.localeCompare(b))
      .map((group, index) => ({
        id: index, // You can set any unique identifier here
        group: group,
      }));

      return uniqueGroupsArray;
    } catch (error) {
      console.error('Error fetching PDF groups:', error);
      return [];
    }
  };

  const handleDropdownItemClick = (group) => {
    // Set the selected group in session storage
    sessionStorage.setItem('selectedGroup', group);
    sessionStorage.setItem('type', 'group');
    
    // Navigate to pdflist.js
    window.location.href = 'pdfList'; // Assuming pdflist.js is a valid route in your application
  };

  return (
    <Dropdown>
      <Dropdown.Toggle variant="success" id="dropdown-basic">
        Select Group
      </Dropdown.Toggle>

      <Dropdown.Menu>
        {pdfsArray.map((pdf) => (
          <Dropdown.Item key={pdf.id} onClick={() => handleDropdownItemClick(pdf.group)}>
            {pdf.group}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default DropdownComponent;
