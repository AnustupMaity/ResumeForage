import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './LandingPage.css';

export default function LandingPage() {
  const { currentUser } = useAuth();

  return (
    <div className="landing">
      {/* Hero */}
      <section className="hero">
        <div className="hero-bg-orbs">
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
          <div className="orb orb-3"></div>
        </div>
        <div className="hero-content animate-fade-in-up">
          <div className="hero-badge">
            <i className="fas fa-bolt"></i> Professional Resume Builder
          </div>
          <h1>
            Craft Your Perfect Resume in <span className="gradient-text">Minutes</span>
          </h1>
          <p className="hero-subtitle">
            Build stunning, professionally formatted resumes that stand out.
            Fill in your details, preview live, and download as a polished PDF.
          </p>
          <div className="hero-actions">
            {currentUser ? (
              <Link to="/dashboard" className="btn btn-primary btn-lg">
                <i className="fas fa-th-large"></i> Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary btn-lg">
                  <i className="fas fa-rocket"></i> Get Started Free
                </Link>
                <Link to="/login" className="btn btn-secondary btn-lg">
                  <i className="fas fa-sign-in-alt"></i> Log In
                </Link>
              </>
            )}
          </div>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-number">10K+</span>
              <span className="stat-label">Resumes Created</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat">
              <span className="stat-number">1 Year</span>
              <span className="stat-label">Unlimited Access</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat">
              <span className="stat-number">₹5</span>
              <span className="stat-label">One-time Payment</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section" id="features">
        <div className="page-container">
          <div className="section-header">
            <p className="overline">Why ResumeForge?</p>
            <h2>Everything You Need to Land Your Dream Job</h2>
            <p>Professional tools designed for serious job seekers</p>
          </div>
          <div className="features-grid">
            <div className="feature-card glass-card">
              <div className="feature-icon"><i className="fas fa-magic"></i></div>
              <h4>Professional Template</h4>
              <p>Industry-standard LaTeX-style formatting that recruiters love. Clean, elegant, and ATS-friendly.</p>
            </div>
            <div className="feature-card glass-card">
              <div className="feature-icon"><i className="fas fa-eye"></i></div>
              <h4>Live Preview</h4>
              <p>See your resume update in real-time as you type. What you see is what you get — no surprises.</p>
            </div>
            <div className="feature-card glass-card">
              <div className="feature-icon"><i className="fas fa-plus-circle"></i></div>
              <h4>Flexible Sections</h4>
              <p>Education, Skills, Projects, Experience, Achievements, Certifications — plus add custom sections.</p>
            </div>
            <div className="feature-card glass-card">
              <div className="feature-icon"><i className="fas fa-file-pdf"></i></div>
              <h4>PDF Download</h4>
              <p>Export your resume as a high-quality PDF, perfectly formatted for letter-size paper.</p>
            </div>
            <div className="feature-card glass-card">
              <div className="feature-icon"><i className="fas fa-shield-alt"></i></div>
              <h4>Secure & Private</h4>
              <p>Your data is stored securely on Firebase. Only you can access and edit your resume.</p>
            </div>
            <div className="feature-card glass-card">
              <div className="feature-icon"><i className="fas fa-infinity"></i></div>
              <h4>Unlimited Edits</h4>
              <p>Pay once, edit unlimited times for a full year. Update your resume for every application.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="pricing-section" id="pricing">
        <div className="page-container">
          <div className="section-header">
            <p className="overline">Simple Pricing</p>
            <h2>One Plan. No Hidden Fees.</h2>
            <p>Get full access for an entire year at one low price</p>
          </div>
          <div className="pricing-card glass-card">
            <div className="pricing-popular">Most Popular</div>
            <h3>Annual Access</h3>
            <div className="pricing-amount">
              <span className="currency">₹</span>
              <span className="price">5</span>
              <span className="period">/ year</span>
            </div>
            <ul className="pricing-features">
              <li><i className="fas fa-check"></i> Professional LaTeX-style template</li>
              <li><i className="fas fa-check"></i> Live preview editor</li>
              <li><i className="fas fa-check"></i> Unlimited edits for 1 year</li>
              <li><i className="fas fa-check"></i> PDF download</li>
              <li><i className="fas fa-check"></i> All sections included</li>
              <li><i className="fas fa-check"></i> Custom sections support</li>
              <li><i className="fas fa-check"></i> Secure cloud storage</li>
              <li><i className="fas fa-check"></i> UPI payment — instant & easy</li>
            </ul>
            <Link to="/register" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
              <i className="fas fa-rocket"></i> Get Started Now
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-section">
        <div className="page-container">
          <div className="section-header">
            <p className="overline">How It Works</p>
            <h2>Three Simple Steps</h2>
          </div>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">01</div>
              <h4>Sign Up & Fill In</h4>
              <p>Create your free account and fill in your details using our intuitive form editor.</p>
            </div>
            <div className="step-connector"><i className="fas fa-arrow-right"></i></div>
            <div className="step-card">
              <div className="step-number">02</div>
              <h4>Preview & Pay</h4>
              <p>Preview your professionally formatted resume. Pay ₹5 via UPI to unlock downloads.</p>
            </div>
            <div className="step-connector"><i className="fas fa-arrow-right"></i></div>
            <div className="step-card">
              <div className="step-number">03</div>
              <h4>Download & Apply</h4>
              <p>Download your resume as a PDF and start applying. Edit anytime for a full year!</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="page-container">
          <div className="footer-content">
            <div className="footer-brand">
              <span className="navbar-brand"><i className="fas fa-file-alt"></i> ResumeForge</span>
              <p>Build professional resumes that get you hired.</p>
            </div>
            <div className="footer-links">
              <h5>Product</h5>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
            </div>
            <div className="footer-links">
              <h5>Account</h5>
              <Link to="/login">Log In</Link>
              <Link to="/register">Sign Up</Link>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} ResumeForge. Built with ❤️</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
