import { useEffect, useState } from 'react'
import './ComplaintDetails.css'

const API_URL = 'http://127.0.0.1:8000'

function ComplaintDetails({ complaintId }) {
  const [complaint, setComplaint] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function fetchComplaint() {
    if (!complaintId) {
      setError('No complaint ID was selected.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        `${API_URL}/complaints/${encodeURIComponent(complaintId)}`
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.detail || 'Complaint not found.')
      }

      setComplaint(result)
    } catch (err) {
      setError(err.message || 'Unable to connect to the server.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchComplaint()
  }, [complaintId])

  async function updateComplaintStatus(newStatus) {
    setUpdating(true)
    setMessage('')
    setError('')

    try {
      const formData = new FormData()
      formData.append('status', newStatus)

      const response = await fetch(
        `${API_URL}/complaints/${encodeURIComponent(complaintId)}/status`,
        {
          method: 'PATCH',
          body: formData,
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.detail || 'Unable to update complaint.')
      }

      setComplaint(result.complaint || result)
      setMessage(`Complaint status updated to ${newStatus}.`)

      await fetchComplaint()
    } catch (err) {
      setError(err.message || 'Status update failed.')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="details-page">
        <div className="details-container">
          <h1>Complaint Details</h1>
          <p>Loading complaint information...</p>
        </div>
      </div>
    )
  }

  if (error && !complaint) {
    return (
      <div className="details-page">
        <div className="details-container">
          <h1>Unable to Load Complaint</h1>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (!complaint) return null

  return (
    <div className="details-page">
      <div className="details-container">
        <h1>Complaint Details</h1>
        <p>Live complaint record from the CleanCity database.</p>

        <div className="details-card">
          <h2>{complaint.category?.replaceAll('_', ' ')}</h2>

          <p>
            <strong>Complaint ID:</strong> {complaint.complaint_id}
          </p>

          <p>
            <strong>Location:</strong> {complaint.location}
          </p>

          <p>
            <strong>Description:</strong> {complaint.description}
          </p>

          <p>
            <strong>Status:</strong> {complaint.status}
          </p>

          <p>
            <strong>Submitted:</strong>{' '}
            {complaint.created_at
              ? new Date(complaint.created_at).toLocaleString()
              : 'Not available'}
          </p>
        </div>

        <div className="details-card">
          <h2>AI Image Analysis</h2>

          <p>
            <strong>Complaint category:</strong>{' '}
            {complaint.category?.replaceAll('_', ' ')}
          </p>

          <p className="note">
            The original complaint record is stored in MongoDB.
            Detailed AI classification scores are not currently stored
            with this complaint.
          </p>
        </div>

        <div className="details-card">
          <h2>Officer Review</h2>

          <p>
            Review the complaint information before updating its status.
          </p>

          <button
            onClick={() => updateComplaintStatus('Under Review')}
            disabled={updating || complaint.status === 'Under Review'}
          >
            {updating ? 'Updating...' : 'Move to Under Review'}
          </button>

          <button
            onClick={() => updateComplaintStatus('Resolved')}
            disabled={updating || complaint.status === 'Resolved'}
          >
            {updating ? 'Updating...' : 'Mark as Resolved'}
          </button>

          {message && <p className="note">{message}</p>}

          {error && <p className="note">{error}</p>}
        </div>
      </div>
    </div>
  )
}

export default ComplaintDetails