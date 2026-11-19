import React, { useState, useEffect } from "react";
import Dropdown from "react-bootstrap/Dropdown";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

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
      const pdfsCollection = collection(db, "pdfs");
      const pdfData = await getDocs(pdfsCollection);

      const uniqueGroups = new Set();

      pdfData.forEach((doc) => {
        const group = doc.data().group;

        if (typeof group === "string" && group.trim()) {
          uniqueGroups.add(group.trim());
        }
      });

      const uniqueGroupsArray = [...uniqueGroups]
        .sort((a, b) => a.localeCompare(b))
        .map((group, index) => ({
          id: index + 1,
          group: group,
        }));

      uniqueGroupsArray.unshift({
        id: 0,
        group: "All Groups",
      });

      return uniqueGroupsArray;
    } catch (error) {
      console.error("Error fetching PDF groups:", error);
      return [];
    }
  };

  const handleDropdownItemClick = (group) => {
    if (group === "all") {
      sessionStorage.removeItem("selectedGroup");
      sessionStorage.removeItem("type");
    } else {
      sessionStorage.setItem("selectedGroup", group);
      sessionStorage.setItem("type", "group");
    }

    window.location.href = "pdfList";
  };

  return (
    <Dropdown>
      <Dropdown.Toggle variant="success" id="dropdown-basic">
        Select Group
      </Dropdown.Toggle>

      <Dropdown.Menu>
        {pdfsArray.map((pdf) => (
          <Dropdown.Item
            key={pdf.id}
            onClick={() =>
              handleDropdownItemClick(pdf.id === 0 ? "all" : pdf.group)
            }
          >
            {pdf.group}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default DropdownComponent;
