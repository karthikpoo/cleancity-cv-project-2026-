import { useEffect, useState } from 'react'
import './OfficerDashboard.css'

const API_URL = 'http://127.0.0.1:8000'

function OfficerDashboard({ onViewDetails }) {
  const [complaints, setComplaints] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [error, setError] = useState('')

  async function fetchComplaints() {
    try {
      setError('')

      const response = await fetch(`${API_URL}/complaints`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.detail || 'Unable to load complaints.')
      }

      setComplaints(
        (result.complaints || []).map((item) => ({
          ...item,
          id: item.complaint_id,
          date: item.created_at
            ? new Date(item.created_at).toLocaleDateString()
            : 'Date unavailable',
        }))
      )
    } catch (err) {
      console.error('Complaint loading error:', err)
      setError(err.message || 'Unable to connect to the backend.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchComplaints()
  }, [])

  async function updateStatus(id, newStatus) {
    setUpdatingId(id)
    setError('')

    try {
      const formData = new FormData()
      formData.append('status', newStatus)

      const response = await fetch(
        `${API_URL}/complaints/${id}/status`,
        {
          method: 'PATCH',
          body: formData,
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.detail || 'Status update failed.')
      }

      setComplaints((previous) =>
        previous.map((complaint) =>
          complaint.id === id
            ? { ...complaint, status: newStatus }
            : complaint
        )
      )
    } catch (err) {
      console.error('Status update error:', err)
      setError(err.message || 'Unable to update complaint status.')
    } finally {
      setUpdatingId(null)
    }
  }

  const filteredComplaints = complaints.filter((complaint) => {
    const matchesSearch =
      complaint.id.toLowerCase().includes(search.toLowerCase()) ||
      complaint.category.toLowerCase().includes(search.toLowerCase()) ||
      complaint.location.toLowerCase().includes(search.toLowerCase())

    const matchesFilter =
      filter === 'All' || complaint.status === filter

    return matchesSearch && matchesFilter
  })

  const total = complaints.length

  const pending = complaints.filter(
    (c) => c.status === 'Pending Review'
  ).length

  const reviewing = complaints.filter(
    (c) => c.status === 'Under Review'
  ).length

  const resolved = complaints.filter(
    (c) => c.status === 'Resolved'
  ).length

  return (
    <div className="officer-page">

      <header className="officer-header">
        <div>
          <h1>🌿 CleanCity Officer Dashboard</h1>
          <p>Review and manage environmental complaints</p>
        </div>
      </header>

      <section className="officer-stats">

        <div className="stat-card">
          <span>Total Complaints</span>
          <h2>{total}</h2>
        </div>

        <div className="stat-card">
          <span>Pending Review</span>
          <h2>{pending}</h2>
        </div>

        <div className="stat-card">
          <span>Under Review</span>
          <h2>{reviewing}</h2>
        </div>

        <div className="stat-card">
          <span>Resolved</span>
          <h2>{resolved}</h2>
        </div>

      </section>

      <section className="complaints-section">

        <div className="complaints-heading">
          <div>
            <h2>Complaint Management</h2>
            <p>Search, filter and manage submitted complaints.</p>
          </div>

          <button
            type="button"
            onClick={fetchComplaints}
            disabled={loading}
          >
            Refresh Complaints
          </button>
        </div>

        {error && (
          <p style={{ color: '#d32f2f', fontWeight: 'bold' }}>
            {error}
          </p>
        )}

        <div className="complaint-controls">

          <input
            type="text"
            placeholder="Search by ID, category or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="All">All Complaints</option>
            <option value="Pending Review">Pending Review</option>
            <option value="Under Review">Under Review</option>
            <option value="Resolved">Resolved</option>
          </select>

        </div>

        <div className="complaint-list">

          {loading ? (
            <div className="no-complaints">
              <h3>Loading complaints...</h3>
            </div>
          ) : filteredComplaints.length > 0 ? (
            filteredComplaints.map((complaint) => (

              <div className="officer-complaint" key={complaint.id}>

                <div className="complaint-information">

                  <span className="complaint-id">
                    {complaint.id}
                  </span>

                  <h3>{complaint.category}</h3>

                  <p>📍 {complaint.location}</p>
                  <p>📅 {complaint.date}</p>

                </div>

                <div className="complaint-actions">

                  <span
                    className={`status ${
                      complaint.status === 'Resolved'
                        ? 'resolved'
                        : complaint.status === 'Under Review'
                        ? 'reviewing'
                        : 'pending'
                    }`}
                  >
                    {complaint.status}
                  </span>

                  <select
                    className="status-select"
                    value={complaint.status}
                    disabled={updatingId === complaint.id}
                    onChange={(e) =>
                      updateStatus(complaint.id, e.target.value)
                    }
                    aria-label={`Update status for ${complaint.id}`}
                  >
                    <option value="Pending Review">
                      Pending Review
                    </option>
                    <option value="Under Review">
                      Under Review
                    </option>
                    <option value="Resolved">
                      Resolved
                    </option>
                  </select>

                  <button
                    className="view-details-btn"
                    onClick={() => onViewDetails(complaint.id)}
                  >
                    View Details →
                  </button>

                </div>

              </div>

            ))
          ) : (
            <div className="no-complaints">
              <h3>No complaints found</h3>
              <p>
                {complaints.length === 0
                  ? 'No complaints have been submitted yet.'
                  : 'Try another search term or status filter.'}
              </p>
            </div>
          )}

        </div>

        <p className="dashboard-note">
          Live complaint records are loaded from the CleanCity MongoDB database.
          Status updates are saved through the backend API.
        </p>

      </section>

    </div>
  )
}

export default OfficerDashboard