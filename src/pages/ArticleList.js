import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  updateDoc,
  where,
  increment,
} from "firebase/firestore";
import {
  Alert,
  Button,
  Form,
  FormControl,
  Modal,
  Spinner,
  Table,
} from "react-bootstrap";
import { Document, Page } from "react-pdf";
import "./pdfList.css";
import "./modalStyle.css";

const DEFAULT_MINUTES = 180;
const MAX_MINUTES = 180;
const LEASE_MS = 90_000;
const HEARTBEAT_MS = 20_000;
const IDLE_WARNING_MS = 1 * 60_000;
const IDLE_GRACE_MS = 60_000;

const normalizeAccess = (value) => String(value || "restricted").toLowerCase();
const validMinutes = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= MAX_MINUTES
    ? n
    : DEFAULT_MINUTES;
};
const formatTime = (seconds) => {
  const s = Math.max(0, seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const newSessionId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID)
    return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export default function PdfList() {
  const [pdfs, setPdfs] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyPdfId, setBusyPdfId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  const [restrictedOpen, setRestrictedOpen] = useState(false);
  const [unrestrictedOpen, setUnrestrictedOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [numPages, setNumPages] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [idleWarning, setIdleWarning] = useState(false);
  const [closing, setClosing] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [readingMinutes, setReadingMinutes] = useState(DEFAULT_MINUTES);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [selectedAccess, setSelectedAccess] = useState("restricted");

  const sessionRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const idlePromptRef = useRef(null);
  const closingRef = useRef(false);
  const mountedRef = useRef(true);

  const selectedGroup = sessionStorage.getItem("selectedGroup");
  const selectedCategory = sessionStorage.getItem("selectedCategory");
  const type = sessionStorage.getItem("type");

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let live = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!live) return;

      setIsAdmin(false);
      setCheckingAdmin(true);

      if (!user) {
        setCheckingAdmin(false);
        return;
      }

      try {
        const q = query(collection(db, "users"), where("id", "==", user.uid));

        const snapshot = await getDocs(q);

        if (live && auth.currentUser?.uid === user.uid) {
          if (!snapshot.empty) {
            const userData = snapshot.docs[0].data();

            setIsAdmin(userData.isAdmin === true);
          } else {
            setIsAdmin(false);
          }
        }
      } catch (e) {
        console.error("Admin check failed:", e);

        if (live) {
          setIsAdmin(false);
        }
      } finally {
        if (live && auth.currentUser?.uid === user.uid) {
          setCheckingAdmin(false);
        }
      }
    });

    return () => {
      live = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      setLoading(true);
      try {
        const base = collection(db, "pdfs");
        let q = base;
        if (type === "group" && selectedGroup) {
          q = query(base, where("group", "array-contains", selectedGroup));
        } else if (type === "category" && selectedCategory) {
          q = query(
            base,
            where("categories", "array-contains", selectedCategory)
          );
        }
        const snap = await getDocs(q);
        if (live) setPdfs(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
      } catch (e) {
        console.error(e);
        if (live)
          setError(
            "Could not load PDFs. Check Firestore permissions and indexes."
          );
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [type, selectedGroup, selectedCategory]);

  const filtered = useMemo(
    () =>
      pdfs.filter((p) =>
        `${p.title || ""} ${p.Author || ""}`
          .toLowerCase()
          .includes(search.trim().toLowerCase())
      ),
    [pdfs, search]
  );
  const pdfFile = useMemo(() => (pdfUrl ? { url: pdfUrl } : null), [pdfUrl]);
  // A transaction is essential: a read followed by a normal update allows races.
  const acquireLock = useCallback(async (pdfId) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Sign in to read restricted PDFs.");
    const pdfRef = doc(db, "pdfs", pdfId);
    const sessionId = newSessionId();
    return runTransaction(db, async (tx) => {
      const snap = await tx.get(pdfRef);
      if (!snap.exists()) throw new Error("This PDF no longer exists.");
      const data = snap.data();
      if (normalizeAccess(data.access) !== "restricted") {
        throw new Error("Access settings changed. Refresh and try again.");
      }
      const now = Date.now();
      const active =
        data.isBeingViewed === true &&
        Number(data.expiryTime) > now &&
        Number(data.sessionEndsAt) > now;
      if (active)
        throw new Error("This PDF is currently being read by another user.");
      const endsAt = now + validMinutes(data.maxReadingMinutes) * 60_000;
      tx.update(pdfRef, {
        isBeingViewed: true,
        currentViewer: user.uid,
        currentSessionId: sessionId,
        expiryTime: Math.min(now + LEASE_MS, endsAt),
        sessionEndsAt: endsAt,
        viewed_count: increment(1),
      });
      return { pdfId, userId: user.uid, sessionId, endsAt };
    });
  }, []);

  const releaseLock = useCallback(async (session) => {
    if (!session) return false;
    return runTransaction(db, async (tx) => {
      const ref = doc(db, "pdfs", session.pdfId);
      const snap = await tx.get(ref);
      if (!snap.exists()) return false;
      const data = snap.data();
      if (
        data.currentViewer !== session.userId ||
        data.currentSessionId !== session.sessionId
      )
        return false;
      tx.update(ref, {
        isBeingViewed: false,
        currentViewer: "",
        currentSessionId: "",
        expiryTime: 0,
        sessionEndsAt: 0,
      });
      return true;
    });
  }, []);

  const renewLock = useCallback(async (session) => {
    return runTransaction(db, async (tx) => {
      const ref = doc(db, "pdfs", session.pdfId);
      const snap = await tx.get(ref);
      if (!snap.exists()) return false;
      const data = snap.data();
      const now = Date.now();
      if (
        data.currentViewer !== session.userId ||
        data.currentSessionId !== session.sessionId ||
        data.isBeingViewed !== true ||
        Number(data.expiryTime) <= now ||
        Number(data.sessionEndsAt) <= now ||
        normalizeAccess(data.access) !== "restricted"
      )
        return false;
      tx.update(ref, {
        expiryTime: Math.min(now + LEASE_MS, Number(data.sessionEndsAt)),
      });
      return true;
    });
  }, []);

  const closeRestricted = useCallback(
    async (reason = "") => {
      if (closingRef.current) return;
      closingRef.current = true;
      setClosing(true);
      const session = sessionRef.current;
      // Stop showing content immediately, but don't permit a new session until release finishes.
      setRestrictedOpen(false);
      setIdleWarning(false);
      setPdfUrl("");
      setNumPages(0);
      try {
        if (session) {
          const released = await releaseLock(session);
          if (!released)
            console.warn("Session was already replaced or released.");
        }
        if (reason && mountedRef.current) setMessage(reason);
      } catch (e) {
        console.error("Failed to release restricted PDF", e);
        if (mountedRef.current)
          setError(
            "PDF closed, but Firestore could not confirm lock release. It will expire if not renewed."
          );
      } finally {
        if (sessionRef.current?.sessionId === session?.sessionId)
          sessionRef.current = null;
        idlePromptRef.current = null;
        closingRef.current = false;
        if (mountedRef.current) setClosing(false);
      }
    },
    [releaseLock]
  );

  const closeUnrestricted = () => {
    setUnrestrictedOpen(false);
    setPdfUrl("");
    setNumPages(0);
  };

  const openPdf = async (pdf) => {
    if (busyPdfId || closingRef.current || sessionRef.current) return;
    setError("");
    setMessage("");
    setNumPages(0);
    const access = normalizeAccess(pdf.access);
    if (access === "unrestricted") {
      setPdfUrl(pdf.url);
      setUnrestrictedOpen(true);
      try {
        await updateDoc(doc(db, "pdfs", pdf.id), {
          viewed_count: increment(1),
        });
        setPdfs((old) =>
          old.map((p) =>
            p.id === pdf.id
              ? { ...p, viewed_count: Number(p.viewed_count || 0) + 1 }
              : p
          )
        );
      } catch (e) {
        console.warn("View count not updated", e);
      }
      return;
    }
    if (access !== "restricted") {
      setError("Unknown PDF access setting.");
      return;
    }
    setBusyPdfId(pdf.id);
    try {
      const session = await acquireLock(pdf.id);
      sessionRef.current = session;
      lastActivityRef.current = Date.now();
      idlePromptRef.current = null;
      setRemaining(
        Math.max(0, Math.ceil((session.endsAt - Date.now()) / 1000))
      );
      setIdleWarning(false);
      setPdfUrl(pdf.url);
      setRestrictedOpen(true);
      setPdfs((old) =>
        old.map((p) =>
          p.id === pdf.id
            ? { ...p, viewed_count: Number(p.viewed_count || 0) + 1 }
            : p
        )
      );
    } catch (e) {
      setError(e.message || "Unable to open this PDF.");
    } finally {
      setBusyPdfId(null);
    }
  };

  // Lease renewal: closing a tab/crashing stops heartbeats; the lock becomes stale.
  useEffect(() => {
    if (!restrictedOpen) return;
    const interval = setInterval(async () => {
      const session = sessionRef.current;
      if (!session || closingRef.current) return;
      try {
        const valid = await renewLock(session);
        if (valid)
          lastSuccessfulLeaseRef.current = Math.min(
            Date.now() + LEASE_MS,
            session.endsAt
          );
        if (!valid && sessionRef.current?.sessionId === session.sessionId) {
          await closeRestricted(
            "Your reading session has ended or was revoked."
          );
        }
      } catch (e) {
        console.warn("Lease renewal failed", e);
        // Do not keep rendering after the known lease expiry.
        if (
          Date.now() >= session.endsAt ||
          Date.now() >= Number(lastSuccessfulLeaseRef.current || 0)
        ) {
          await closeRestricted("Your reading session could not be renewed.");
        }
      }
    }, HEARTBEAT_MS);
    return () => clearInterval(interval);
  }, [restrictedOpen, renewLock, closeRestricted]);

  const lastSuccessfulLeaseRef = useRef(0);
  // Track the latest *confirmed* lease deadline. A failure must not extend it.
  useEffect(() => {
    if (!restrictedOpen) {
      lastSuccessfulLeaseRef.current = 0;
      return;
    }
    lastSuccessfulLeaseRef.current = Math.min(
      Date.now() + LEASE_MS,
      sessionRef.current?.endsAt || 0
    );
  }, [restrictedOpen]);

  // Observe server-confirmed revocations; ignore cached initial snapshots.
  useEffect(() => {
    if (!restrictedOpen || !sessionRef.current) return;
    const session = sessionRef.current;
    let hasSeenServer = false;
    const unsubscribe = onSnapshot(
      doc(db, "pdfs", session.pdfId),
      (snap) => {
        if (snap.metadata.fromCache || !snap.exists()) return;
        if (!hasSeenServer) {
          hasSeenServer = true;
          return;
        }
        if (
          sessionRef.current?.sessionId !== session.sessionId ||
          closingRef.current
        )
          return;
        const d = snap.data();
        if (
          d.currentSessionId !== session.sessionId ||
          d.currentViewer !== session.userId ||
          normalizeAccess(d.access) !== "restricted"
        ) {
          closeRestricted("Your reading session was changed or ended.");
        }
      },
      (e) => console.warn("PDF listener failed", e)
    );
    return unsubscribe;
  }, [restrictedOpen, closeRestricted]);

  // Absolute session deadline + idle warning and grace period.
  useEffect(() => {
    if (!restrictedOpen) return;
    const interval = setInterval(() => {
      const session = sessionRef.current;
      if (!session || closingRef.current) return;
      const now = Date.now();
      const secs = Math.max(0, Math.ceil((session.endsAt - now) / 1000));
      setRemaining(secs);
      if (secs === 0) {
        closeRestricted("Your reading time has expired.");
        return;
      }
      if (idlePromptRef.current !== null) {
        if (now - idlePromptRef.current >= IDLE_GRACE_MS) {
          closeRestricted("Your session ended due to inactivity.");
        }
      } else if (now - lastActivityRef.current >= IDLE_WARNING_MS) {
        idlePromptRef.current = now;
        setIdleWarning(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [restrictedOpen, closeRestricted]);

  // Activity only counts while the reader is actively using the PDF.
  const recordActivity = () => {
    if (!restrictedOpen || idlePromptRef.current !== null) return;
    lastActivityRef.current = Date.now();
  };
  const continueReading = () => {
    lastActivityRef.current = Date.now();
    idlePromptRef.current = null;
    setIdleWarning(false);
  };

  // Best effort only: async Firestore transactions cannot be guaranteed on tab close.
  useEffect(() => {
    const onPageHide = () => {
      const session = sessionRef.current;
      if (session) releaseLock(session).catch(() => {});
    };
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      const session = sessionRef.current;
      if (session) releaseLock(session).catch(() => {});
    };
  }, [releaseLock]);

  // Firestore users have autogenerated document IDs; the Auth UID is in the `id` field.
  const verifyAdmin = async () => {
    const user = auth.currentUser;
    if (!user || !isAdmin || checkingAdmin) {
      throw new Error("Admin access required.");
    }

    const adminQuery = query(
      collection(db, "users"),
      where("id", "==", user.uid)
    );
    const snapshot = await getDocs(adminQuery);

    if (snapshot.size !== 1 || snapshot.docs[0].data().isAdmin !== true) {
      setIsAdmin(false);
      throw new Error(
        "Admin access required or user record is missing/duplicated."
      );
    }
    return true;
  };
  const openTime = (pdf) => {
    if (!isAdmin || checkingAdmin) return;
    setSelectedPdf(pdf);
    setReadingMinutes(pdf.maxReadingMinutes ?? DEFAULT_MINUTES);
    setShowTimeModal(true);
  };
  const saveTime = async () => {
    if (!selectedPdf || saving) return;
    const n = Number(readingMinutes);
    if (!Number.isInteger(n) || n < 1 || n > MAX_MINUTES) {
      setError("Reading time must be between 1 and 180 minutes.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await verifyAdmin();
      await updateDoc(doc(db, "pdfs", selectedPdf.id), {
        maxReadingMinutes: n,
      });
      setPdfs((old) =>
        old.map((p) =>
          p.id === selectedPdf.id ? { ...p, maxReadingMinutes: n } : p
        )
      );
      setShowTimeModal(false);
      setSelectedPdf(null);
      setMessage(
        "Reading time saved. New sessions will use the updated duration."
      );
    } catch (e) {
      setError(e.message || "Unable to save reading time.");
    } finally {
      setSaving(false);
    }
  };
  const openAccess = (pdf) => {
    if (!isAdmin || checkingAdmin) return;
    setSelectedPdf(pdf);
    setSelectedAccess(normalizeAccess(pdf.access));
    setShowAccessModal(true);
  };
  const saveAccess = async () => {
    if (!selectedPdf || saving) return;
    if (!["restricted", "unrestricted"].includes(selectedAccess)) return;
    setSaving(true);
    setError("");
    try {
      await verifyAdmin();
      await updateDoc(doc(db, "pdfs", selectedPdf.id), {
        access: selectedAccess,
      });
      setPdfs((old) =>
        old.map((p) =>
          p.id === selectedPdf.id ? { ...p, access: selectedAccess } : p
        )
      );
      setShowAccessModal(false);
      setSelectedPdf(null);
      setMessage(
        "PDF access updated. Existing sessions may require explicit revocation."
      );
    } catch (e) {
      setError(e.message || "Unable to save access.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-fluid py-3">
      <h2 className="text-center mb-4 mt-5">Article Management</h2>
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {message && (
        <Alert variant="success" dismissible onClose={() => setMessage("")}>
          {message}
        </Alert>
      )}
      <div className="d-flex justify-content-end mb-3">
        <FormControl
          placeholder="Search PDFs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 260 }}
        />
      </div>
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>#</th>
              <th>Title</th>
              <th>Author</th>
              <th>Access</th>
              <th>Reading Time</th>
              <th>Views</th>
              <th>View PDF</th>
              {isAdmin && !checkingAdmin && <th>Admin Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={isAdmin && !checkingAdmin ? 8 : 7}
                  className="text-center"
                >
                  No PDFs found.
                </td>
              </tr>
            ) : (
              filtered.map((pdf, index) => {
                const restricted = normalizeAccess(pdf.access) === "restricted";
                return (
                  <tr key={pdf.id}>
                    <td>{index + 1}</td>
                    <td>{pdf.title}</td>
                    <td>{pdf.Author || ""}</td>
                    <td>{restricted ? "Restricted" : "Unrestricted"}</td>
                    <td>
                      {restricted
                        ? `${validMinutes(pdf.maxReadingMinutes)} min`
                        : "Unlimited"}
                    </td>
                    <td>{pdf.viewed_count ?? 0}</td>
                    <td>
                      <Button
                        variant="success"
                        size="sm"
                        disabled={busyPdfId !== null || closing}
                        onClick={() => openPdf(pdf)}
                      >
                        {busyPdfId === pdf.id ? "Opening..." : "View"}
                      </Button>
                    </td>
                    {isAdmin && !checkingAdmin && (
                      <td>
                        <div className="d-flex flex-wrap gap-2">
                          {restricted && (
                            <Button
                              size="sm"
                              variant="outline-primary"
                              onClick={() => openTime(pdf)}
                            >
                              Set Time
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            onClick={() => openAccess(pdf)}
                          >
                            Set Access
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      )}

      <Modal
        show={restrictedOpen}
        onHide={() => closeRestricted()}
        className="custom-pdf-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Restricted PDF - {formatTime(remaining)} remaining
          </Modal.Title>
        </Modal.Header>
        <Modal.Body
          onMouseMove={recordActivity}
          onScrollCapture={recordActivity}
          onKeyDown={recordActivity}
          onTouchStart={recordActivity}
        >
          {pdfUrl && (
            <Document
              className="pdf-content"
              file={pdfFile}
              onLoadSuccess={({ numPages: n }) => setNumPages(n)}
              onLoadError={(e) => setError(`PDF loading failed: ${e.message}`)}
            >
              {Array.from({ length: numPages }, (_, i) => (
                <Page
                  key={i + 1}
                  pageNumber={i + 1}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                />
              ))}
            </Document>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => closeRestricted()}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={unrestrictedOpen}
        onHide={closeUnrestricted}
        dialogClassName="pdf-modal-dialog"
      >
        <Modal.Header closeButton>
          <Modal.Title>PDF Viewer</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {pdfUrl && (
            <iframe
              src={`${pdfUrl}#navpanes=0`}
              title="PDF Viewer"
              className="pdf-modal-iframe"
            />
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeUnrestricted}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={idleWarning && restrictedOpen}
        onHide={continueReading}
        centered
        dialogClassName="admin-settings-modal"
        backdrop="static"
        keyboard={false}
      >
        <Modal.Header>
          <Modal.Title>Are you still reading?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          No activity for 3 minutes. Select Continue Reading within 1 minute or
          your session will close.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => closeRestricted()}>
            Close PDF
          </Button>
          <Button variant="primary" onClick={continueReading}>
            Continue Reading
          </Button>
        </Modal.Footer>
      </Modal>

      {isAdmin && !checkingAdmin && (
        <Modal
          show={showTimeModal}
          onHide={() => {
            if (!saving) {
              setShowTimeModal(false);
              setSelectedPdf(null);
            }
          }}
          centered
          dialogClassName="admin-settings-modal"
          backdrop={saving ? "static" : true}
        >
          <Modal.Header closeButton={!saving}>
            <Modal.Title>Set Reading Time</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>
              <strong>Article:</strong> {selectedPdf?.title}
            </p>
            <Form.Group>
              <Form.Label>Maximum reading time (minutes)</Form.Label>
              <Form.Control
                type="number"
                min="1"
                max="180"
                step="1"
                value={readingMinutes}
                onChange={(e) => setReadingMinutes(e.target.value)}
                disabled={saving}
              />
              <Form.Text>
                Applies to new reading sessions. Maximum 180 minutes.
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              disabled={saving}
              onClick={() => {
                setShowTimeModal(false);
                setSelectedPdf(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" disabled={saving} onClick={saveTime}>
              {saving ? "Saving..." : "Save Time"}
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      {isAdmin && !checkingAdmin && (
        <Modal
          show={showAccessModal}
          onHide={() => {
            if (!saving) {
              setShowAccessModal(false);
              setSelectedPdf(null);
            }
          }}
          centered
          dialogClassName="admin-settings-modal"
          backdrop={saving ? "static" : true}
        >
          <Modal.Header closeButton={!saving}>
            <Modal.Title>Set PDF Access</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>
              <strong>Article:</strong> {selectedPdf?.title}
            </p>
            <Form.Group>
              <Form.Label>Access Type</Form.Label>
              <Form.Select
                value={selectedAccess}
                disabled={saving}
                onChange={(e) => setSelectedAccess(e.target.value)}
              >
                <option value="restricted">Restricted</option>
                <option value="unrestricted">Unrestricted</option>
              </Form.Select>
              <Form.Text>
                Changing access does not forcibly release an existing reader
                lock.
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              disabled={saving}
              onClick={() => {
                setShowAccessModal(false);
                setSelectedPdf(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" disabled={saving} onClick={saveAccess}>
              {saving ? "Saving..." : "Save Access"}
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
}
