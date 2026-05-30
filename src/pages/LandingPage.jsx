import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './LandingPage.css';

export default function LandingPage() {
  const { currentUser } = useAuth();

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

    const elements = document.querySelectorAll('.reveal');
    elements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing">
      {/* Hero */}
      <section className="hero">
        <div className="hero-content animate-fade-in-up">
          <div className="hero-badge">
            <span className="dot-indicator"></span> Professional Resume Builder
          </div>
          <h1 className="dot-font">
            CRAFT YOUR PERFECT RESUME IN <span className="accent-text">MINUTES</span>
          </h1>
          <p className="hero-subtitle">
            Build stunning, professionally formatted resumes that stand out.
            Fill in your details, preview live, and download as a polished PDF.
          </p>
          <div className="hero-actions">
            {currentUser ? (
              <Link to="/dashboard" className="btn btn-primary btn-lg">
                [ GO TO DASHBOARD ]
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary btn-lg">
                  [ GET STARTED FREE ]
                </Link>
                <Link to="/login" className="btn btn-secondary btn-lg">
                  [ LOG IN ]
                </Link>
              </>
            )}
          </div>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-number dot-font">100%</span>
              <span className="stat-label">ATS-Friendly</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat">
              <span className="stat-number dot-font">AI</span>
              <span className="stat-label">Powered Extraction</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat">
              <span className="stat-number dot-font">₹5</span>
              <span className="stat-label">For 1 Year</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section" id="features">
        <div className="page-container">
          <div className="section-header reveal">
            <p className="overline">Why ResumeForge?</p>
            <h2>Everything You Need to Land Your Dream Job</h2>
            <p>Professional tools designed for serious job seekers</p>
          </div>
          <div className="features-grid">
            <div className="feature-card glass-card reveal">
              <div className="feature-icon"><i className="fas fa-magic"></i></div>
              <h4>Professional Template</h4>
              <p>Industry-standard LaTeX-style formatting that recruiters love. Clean, elegant, and ATS-friendly.</p>
            </div>
            <div className="feature-card glass-card reveal">
              <div className="feature-icon"><i className="fas fa-eye"></i></div>
              <h4>Live Preview</h4>
              <p>See your resume update in real-time as you type. What you see is what you get — no surprises.</p>
            </div>
            <div className="feature-card glass-card reveal">
              <div className="feature-icon"><i className="fas fa-plus-circle"></i></div>
              <h4>Flexible Sections</h4>
              <p>Education, Skills, Projects, Experience, Achievements, Certifications — plus add custom sections.</p>
            </div>
            <div className="feature-card glass-card reveal">
              <div className="feature-icon"><i className="fas fa-file-pdf"></i></div>
              <h4>PDF Download</h4>
              <p>Export your resume as a high-quality PDF, perfectly formatted for letter-size paper.</p>
            </div>
            <div className="feature-card glass-card reveal">
              <div className="feature-icon"><i className="fas fa-shield-alt"></i></div>
              <h4>Secure & Private</h4>
              <p>Your data is stored securely on Firebase. Only you can access and edit your resume.</p>
            </div>
            <div className="feature-card glass-card reveal">
              <div className="feature-icon"><i className="fas fa-infinity"></i></div>
              <h4>Unlimited Edits</h4>
              <p>Pay once, edit unlimited times for a full year. Update your resume for every application.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="pricing-section reveal" id="pricing">
        <div className="page-container">
          <div className="section-header reveal">
            <p className="overline">Simple Pricing</p>
            <h2 className="dot-font">ONE PLAN. NO HIDDEN FEES.</h2>
            <p>Get full access for an entire year at one low price</p>
          </div>
          <div className="pricing-card glass-card reveal">
            <div className="pricing-popular">Most Popular</div>
            <h3 className="dot-font">Annual Access</h3>
            <div className="pricing-amount">
              <span className="currency">₹</span>
              <span className="price dot-font">5</span>
              <span className="period">/ year</span>
            </div>
            <ul className="pricing-features">
              <li><span className="dot-indicator-small"></span> Professional LaTeX-style template</li>
              <li><span className="dot-indicator-small"></span> Live preview editor</li>
              <li><span className="dot-indicator-small"></span> Unlimited resume edits</li>
              <li><span className="dot-indicator-small"></span> High-quality PDF export</li>
              <li><span className="dot-indicator-small"></span> AI-powered content generation</li>
              <li><span className="dot-indicator-small"></span> Smart text/PDF import</li>
              <li><span className="dot-indicator-small"></span> Secure cloud storage</li>
              <li><span className="dot-indicator-small"></span> UPI payment — instant & easy</li>
            </ul>
            <Link to="/register" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
              [ START BUILDING ]
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-section">
        <div className="page-container">
          <div className="section-header reveal">
            <p className="overline">How It Works</p>
            <h2>Three Simple Steps</h2>
          </div>
          <div className="steps-grid">
            <div className="step-card reveal">
              <div className="step-number dot-font">01</div>
              <h4>Sign Up & Fill In</h4>
              <p>Create your free account and fill in your details using our intuitive form editor.</p>
            </div>
            <div className="step-connector"><i className="fas fa-arrow-right"></i></div>
            <div className="step-card reveal">
              <div className="step-number dot-font">02</div>
              <h4>Preview & Pay</h4>
              <p>Preview your professionally formatted resume. Pay ₹5 via UPI to unlock downloads.</p>
            </div>
            <div className="step-connector"><i className="fas fa-arrow-right"></i></div>
            <div className="step-card reveal">
              <div className="step-number dot-font">03</div>
              <h4>Export & Apply</h4>
              <p>Download your ATS-friendly PDF instantly and land your dream job!</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="page-container">
          <div className="footer-content">
            <div className="footer-brand">
              <span className="navbar-brand">
                <img src="/logo.png" alt="ResumeForge Logo" style={{ width: '32px', height: '32px', borderRadius: '4px' }} />
                ResumeForge
              </span>
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
            <p>© {new Date().getFullYear()} ResumeForge. </p>
            <p className="footer-dev">Developed by Anustup Maity</p>
            <div className="footer-contact">
              <a href="mailto:anustupmaity2004@gmail.com"><i className="fas fa-envelope"></i> Email</a>
              <a href="https://github.com/AnustupMaity" target="_blank" rel="noopener noreferrer"><i className="fab fa-github"></i> GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
