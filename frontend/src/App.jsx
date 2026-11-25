import { useState } from 'react'

import Complaint from './Complaint'
import Tracking from './Tracking'
import OfficerDashboard from './OfficerDashboard'
import ComplaintDetails from './ComplaintDetails'
import ProofOfWork from './ProofOfWork'

import './App.css'

function App() {
  const [page, setPage] = useState('home')
  const [selectedComplaintId, setSelectedComplaintId] = useState('')

  // Complaint page
  if (page === 'complaint') {
    return (
      <>
        <button className="back-btn" onClick={() => setPage('home')}>
          ← Back to Home
        </button>
        <Complaint />
      </>
    )
  }

  // Tracking page
  if (page === 'tracking') {
    return (
      <>
        <button className="back-btn" onClick={() => setPage('home')}>
          ← Back to Home
        </button>
        <Tracking />
      </>
    )
  }

  // Proof-of-Work page
  if (page === 'pow') {
    return (
      <>
        <button className="back-btn" onClick={() => setPage('home')}>
          ← Back to Home
        </button>
        <ProofOfWork />
      </>
    )
  }

  // Officer Dashboard
  if (page === 'officer') {
    return (
      <>
        <button className="back-btn" onClick={() => setPage('home')}>
          ← Back to Home
        </button>

        <OfficerDashboard
          onViewDetails={(id) => {
            setSelectedComplaintId(id)
            setPage('details')
          }}
        />
      </>
    )
  }

  // Complaint Details
  if (page === 'details') {
    return (
      <>
        <button
          className="back-btn"
          onClick={() => setPage('officer')}
        >
          ← Back to Dashboard
        </button>

        <ComplaintDetails complaintId={selectedComplaintId} />
      </>
    )
  }

  // Homepage
  return (
    <div className="app">
      <nav className="navbar">
        <div className="logo">🌱 CleanCity</div>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#services">Services</a>
          <a href="#about">About</a>

          <button
            className="login-btn"
            onClick={() => setPage('officer')}
          >
            Officer Dashboard
          </button>
        </div>
      </nav>

      <section className="hero-section" id="home">
        <div className="hero-content">
          <h1>
            Building a Cleaner
            <br />
            and Greener City
          </h1>

          <p>
            Report environmental issues, track complaints and help
            create a cleaner and healthier community with CleanCity.
          </p>

          <div className="hero-buttons">
            <button onClick={() => setPage('complaint')}>
              Report an Issue
            </button>

            <button onClick={() => setPage('tracking')}>
              Track Complaint
            </button>
          </div>
        </div>

        <div className="hero-card">
          <span>🌱</span>
          <h2>Clean City, Green Future</h2>
          <p>Small actions create a better environment.</p>
        </div>
      </section>

      <section className="services-section" id="services">
        <h2>Our Services</h2>

        <p className="section-description">
          Technology-powered environmental complaint management.
        </p>

        <div className="service-grid">
          <div className="service-card">
            <span>📝</span>
            <h3>Report Complaints</h3>
            <p>
              Submit environmental complaints with images and
              location details.
            </p>

            <button onClick={() => setPage('complaint')}>
              Report Now
            </button>
          </div>

          <div className="service-card">
            <span>🤖</span>
            <h3>AI Image Analysis</h3>
            <p>
              Analyze environmental complaint images using
              computer vision.
            </p>

            <button onClick={() => setPage('complaint')}>
              Analyze Image
            </button>
          </div>

          <div className="service-card">
            <span>🔍</span>
            <h3>Track Complaints</h3>
            <p>
              Check the current status of submitted environmental
              complaints.
            </p>

            <button onClick={() => setPage('tracking')}>
              Track Now
            </button>
          </div>

          <div className="service-card">
            <span>📷</span>
            <h3>Proof-of-Work Verification</h3>
            <p>
              Compare before-and-after images to assess cleanup work.
            </p>

            <button onClick={() => setPage('pow')}>
              Verify Work
            </button>
          </div>
        </div>
      </section>

      <section className="impact-section">
        <h2>Our Environmental Impact</h2>

        <div className="impact-grid">
          <div className="impact-card">
            <h3>250+</h3>
            <p>Complaints Received</p>
          </div>

          <div className="impact-card">
            <h3>180+</h3>
            <p>Resolved</p>
          </div>

          <div className="impact-card">
            <h3>45+</h3>
            <p>Active Issues</p>
          </div>

          <div className="impact-card">
            <h3>12</h3>
            <p>Areas Covered</p>
          </div>
        </div>

        <p className="section-description">
          Illustrative sample statistics for the website demonstration.
        </p>
      </section>

      <section className="about-section" id="about">
        <h2>About CleanCity</h2>

        <p>
          CleanCity is an environmental complaint management
          platform designed to help communities report environmental
          issues, use AI-based image classification and assess
          cleanup work through before-and-after image verification.
        </p>
      </section>

      <footer className="footer">
        <p>© 2026 CleanCity Environmental AI. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default App