import React, { useState, useEffect } from "react";
import Dropdown from "react-bootstrap/Dropdown";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

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
      const pdfsCollection = collection(db, "pdfs");
      const pdfData = await getDocs(pdfsCollection);

      const uniqueCategories = new Set();

      pdfData.forEach((doc) => {
        const categories = doc.data().categories || [];

        categories.forEach((category) => {
          uniqueCategories.add(category);
        });
      });

      const uniqueCategoriesArray = [...uniqueCategories]
        .sort((a, b) => a.localeCompare(b))
        .map((category, index) => ({
          id: index + 1,
          categories: category,
        }));

      uniqueCategoriesArray.unshift({
        id: 0,
        categories: "All Categories",
      });

      return uniqueCategoriesArray;
    } catch (error) {
      console.error("Error fetching PDF categories:", error);
      return [];
    }
  };

  const handleDropdownItemClick = (category) => {
    if (category === "all") {
      sessionStorage.removeItem("selectedCategory");
      sessionStorage.removeItem("type");
    } else {
      sessionStorage.setItem("selectedCategory", category);
      sessionStorage.setItem("type", "category");
    }

    window.location.href = "categorypdfList";
  };

  return (
    <Dropdown>
      <Dropdown.Toggle variant="success" id="dropdown-basic">
        Select Category
      </Dropdown.Toggle>

      <Dropdown.Menu>
        {pdfsArray.map((pdf) => (
          <Dropdown.Item
            key={pdf.id}
            onClick={() =>
              handleDropdownItemClick(pdf.id === 0 ? "all" : pdf.categories)
            }
          >
            {pdf.categories}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default CategoryDropdownComponent;
