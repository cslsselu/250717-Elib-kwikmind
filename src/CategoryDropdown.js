import React, { useState, useEffect } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

const CategoryDropdownComponent = () => {
  const [pdfsArray, setPdfsArray] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const categories = await fetchCategories();
      setPdfsArray(categories);
    };
    fetchData();
  }, []);

  const fetchCategories = async () => {
    try {
      const pdfsCollection = collection(db, 'pdfs');
      const pdfData = await getDocs(pdfsCollection);

      // Use a Set to store unique group values
      const uniqueCategories = new Set();

      pdfData.forEach((doc) => {
        const categories = doc.data().categories;
        categories.forEach((category) => {
          uniqueCategories.add(category);
        });
      });

      // console.log("#############################")
      // console.log(uniqueCategories)

      // Convert the Set back to an array
      const uniqueCategoriesArray = [...uniqueCategories].sort((a, b) => a.localeCompare(b))
      .map((categories, index) => ({
        id: index,
        categories: categories,
      }));

      return uniqueCategoriesArray;
    } catch (error) {
      console.error('Error fetching PDF groups:', error);
      return [];
    }
  };

  const handleDropdownItemClick = (category) => {
    // Set the selected group in session storage
    sessionStorage.setItem('selectedCategory', category);
    sessionStorage.setItem('type', 'category');
    // alert(category)
    
    // Navigate to pdflist.js
    window.location.href = 'categorypdfList'; 
  };

  return (
    <Dropdown>
      <Dropdown.Toggle variant="success" id="dropdown-basic">
        Select Category
      </Dropdown.Toggle>

      <Dropdown.Menu>
        {pdfsArray.map((pdf) => (
          <Dropdown.Item key={pdf.id} onClick={() => handleDropdownItemClick(pdf.categories)}>
            {pdf.categories}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default CategoryDropdownComponent;
