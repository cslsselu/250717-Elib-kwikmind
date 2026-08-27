import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore';

import '../ViewLogs.css';

function ViewLogs() {
  const userEmail = sessionStorage.getItem('userEmail');
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const logsCollectionRef = collection(db, process.env.REACT_APP_ADMIN_LOG);
        const logsQuery = query(
          logsCollectionRef,
          where('email', '==', userEmail),
          orderBy('timestamp', 'desc')
        );
        const snapshot = await getDocs(logsQuery);

        const logsData = [];
        snapshot.forEach((doc) => {
          logsData.push({ id: doc.id, ...doc.data() });
        });

        setLogs(logsData);
      } catch (error) {
        console.error('Error fetching logs:', error);
      }
    };

    fetchLogs();
  }, [userEmail]); // Include userEmail in the dependency array to re-run effect on userEmail change

  return (
    <div className="view-logs-container">
      <h2 className="view-logs-header">View Logs for {userEmail}</h2>
      <table className="logs-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Email</th>
            <th>Type</th>
            <th>Timestamp</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="log-row">
              <td>{log.username}</td>
              <td>{log.email}</td>
              <td>{log.type}</td>
              <td>{log.timestamp}</td>
              <td>{log.remarks || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ViewLogs;
