import { useState } from 'react'
import './Tracking.css'

const API_URL = 'http://127.0.0.1:8000'

function Tracking() {
  const [complaintId, setComplaintId] = useState('')
  const [complaint, setComplaint] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSearch(e) {
    e.preventDefault()

    if (!complaintId.trim()) {
      setError('Please enter your complaint ID.')
      return
    }

    setLoading(true)
    setComplaint(null)
    setError('')

    try {
      const response = await fetch(
        `${API_URL}/complaints/${encodeURIComponent(complaintId.trim())}`
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? 'Complaint ID not found. Please check your ID.'
            : result.detail || 'Unable to retrieve complaint.'
        )
      }

      setComplaint(result)

    } catch (err) {
      console.error('Complaint tracking error:', err)

      setError(
        err.message || 'Unable to connect to the CleanCity server.'
      )

    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="tracking-page">
      <div className="tracking-container">

        <h1>Track Your Complaint</h1>

        <p>Check the progress of your environmental complaint.</p>

        <form onSubmit={handleSearch}>

          <label>Complaint ID</label>

          <input
            type="text"
            placeholder="Enter your complaint ID"
            value={complaintId}
            onChange={(e) => {
              setComplaintId(e.target.value)
              setComplaint(null)
              setError('')
            }}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? 'Searching...' : 'Track Complaint'}
          </button>

        </form>

        {error && (
          <div
            className="tracking-result"
            style={{ color: '#d32f2f' }}
          >
            <h3>Tracking Error</h3>
            <p>{error}</p>
          </div>
        )}

        {complaint && (
          <div className="tracking-result">

            <h3>Complaint Tracking Result</h3>

            <p>
              <strong>Complaint ID:</strong>{' '}
              {complaint.complaint_id}
            </p>

            <p>
              <strong>Category:</strong>{' '}
              {complaint.category.replaceAll('_', ' ')}
            </p>

            <p>
              <strong>Location:</strong>{' '}
              {complaint.location}
            </p>

            <p>
              <strong>Status:</strong>{' '}
              <strong>{complaint.status}</strong>
            </p>

            {complaint.status === 'Pending Review' && (
              <p>Your complaint is waiting for officer review.</p>
            )}

            {complaint.status === 'Under Review' && (
              <p>Your complaint is currently being reviewed by an officer.</p>
            )}

            {complaint.status === 'Resolved' && (
              <p>Your complaint has been marked as resolved by an officer.</p>
            )}

            <p>
              <strong>Submitted:</strong>{' '}
              {complaint.created_at
                ? new Date(complaint.created_at).toLocaleString()
                : 'Not available'}
            </p>

          </div>
        )}

      </div>
    </div>
  )
}

export default Tracking