import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, orderBy, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export default function MyResumesPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchResumes() {
      if (!currentUser) return;
      try {
        const resumesRef = collection(db, 'users', currentUser.uid, 'resumes');
        const q = query(resumesRef, orderBy('updatedAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const fetched = [];
        querySnapshot.forEach((docSnap) => {
          fetched.push({ id: docSnap.id, ...docSnap.data() });
        });
        setResumes(fetched);
      } catch (err) {
        console.error('Error fetching resumes:', err);
        setError('Failed to load your resumes.');
      }
      setLoading(false);
    }

    fetchResumes();
  }, [currentUser]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'resumes', id));
      setResumes(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Error deleting resume:', err);
      alert('Failed to delete resume.');
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading your history...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="page-container">
        <div className="dashboard-header animate-fade-in-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="dot-font"><i className="fas fa-history"></i> My Resumes</h2>
            <p>View and edit your previously generated resumes.</p>
          </div>
          <Link to="/editor" className="btn btn-primary">
            <i className="fas fa-plus"></i> Create New
          </Link>
        </div>

        {error && (
          <div className="toast-error" style={{ position: 'static', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
            <i className="fas fa-exclamation-circle"></i> {error}
          </div>
        )}

        {resumes.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: '3rem', color: 'var(--border-subtle)', marginBottom: '16px' }}>
              <i className="fas fa-file-alt"></i>
            </div>
            <h3 className="dot-font" style={{ marginBottom: '8px' }}>No Resumes Found</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>You haven't saved any resumes yet.</p>
            <Link to="/editor" className="btn btn-primary">Start Building Now</Link>
          </div>
        ) : (
          <div className="dashboard-grid">
            {resumes.map(resume => {
              const updatedAt = resume.updatedAt?.toDate 
                ? resume.updatedAt.toDate().toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : 'Unknown Date';
              
              const resumeName = resume.name || resume.data?.personalInfo?.name || 'Untitled Resume';

              return (
                <div key={resume.id} className="glass-card dashboard-card animate-fade-in-up">
                  <div className="card-icon-wrap" style={{ background: 'rgba(108, 99, 255, 0.12)' }}>
                    <i className="fas fa-file-alt" style={{ color: 'var(--accent-primary-light)' }}></i>
                  </div>
                  <h4 className="dot-font" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {resumeName}
                  </h4>
                  <p className="card-detail-sub" style={{ marginBottom: '16px' }}>Last updated: {updatedAt}</p>
                  
                  <div className="quick-actions" style={{ marginTop: 'auto' }}>
                    <Link to={`/editor?id=${resume.id}`} className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                      <i className="fas fa-edit"></i> Edit
                    </Link>
                    <button 
                      className="btn btn-danger btn-sm" 
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={() => handleDelete(resume.id, resumeName)}
                    >
                      <i className="fas fa-trash"></i> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
