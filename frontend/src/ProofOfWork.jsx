import { useEffect, useState } from 'react'
import './ProofOfWork.css'

const API_URL = 'http://127.0.0.1:8000'

const categories = [
  'Garbage accumulation',
  'Overflowing dustbins',
  'Sewage leakage',
  'Waterlogging',
  'Water pollution',
  'Air pollution',
  'Illegal dumping',
  'Construction waste',
  'Dead animals',
  'Public sanitation issues',
]

const categoryMap = {
  'Garbage accumulation': 'garbage_accumulation',
  'Overflowing dustbins': 'overflowing_dustbins',
  'Sewage leakage': 'sewage_leakage',
  Waterlogging: 'waterlogging',
  'Water pollution': 'water_pollution',
  'Air pollution': 'air_pollution',
  'Illegal dumping': 'illegal_dumping',
  'Construction waste': 'construction_waste',
  'Dead animals': 'dead_animals',
  'Public sanitation issues': 'public_sanitation_issues',
}

function ProofOfWork() {
  const [complaintId, setComplaintId] = useState('')
  const [beforeImage, setBeforeImage] = useState(null)
  const [afterImage, setAfterImage] = useState(null)
  const [beforePreview, setBeforePreview] = useState('')
  const [afterPreview, setAfterPreview] = useState('')
  const [category, setCategory] = useState('')
  const [expectedTask, setExpectedTask] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!beforeImage) {
      setBeforePreview('')
      return
    }

    const url = URL.createObjectURL(beforeImage)
    setBeforePreview(url)

    return () => URL.revokeObjectURL(url)
  }, [beforeImage])

  useEffect(() => {
    if (!afterImage) {
      setAfterPreview('')
      return
    }

    const url = URL.createObjectURL(afterImage)
    setAfterPreview(url)

    return () => URL.revokeObjectURL(url)
  }, [afterImage])

  function validateImage(file) {
    if (!file) return 'Please select an image.'

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/bmp',
    ]

    if (!allowedTypes.includes(file.type)) {
      return 'Select a JPG, PNG, WEBP or BMP image.'
    }

    if (file.size > 10 * 1024 * 1024) {
      return 'Each image must be less than 10 MB.'
    }

    return ''
  }

  function handleBeforeChange(event) {
    const file = event.target.files[0]
    setError('')
    setResult(null)

    const validationError = validateImage(file)

    if (validationError) {
      setBeforeImage(null)
      setError(validationError)
      event.target.value = ''
      return
    }

    setBeforeImage(file)
  }

  function handleAfterChange(event) {
    const file = event.target.files[0]
    setError('')
    setResult(null)

    const validationError = validateImage(file)

    if (validationError) {
      setAfterImage(null)
      setError(validationError)
      event.target.value = ''
      return
    }

    setAfterImage(file)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setResult(null)

    if (!complaintId.trim()) {
      setError('Please enter the complaint ID.')
      return
    }

    if (!beforeImage || !afterImage || !category) {
      setError('Please upload both images and select a category.')
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()

      formData.append('complaint_id', complaintId.trim())
      formData.append('before', beforeImage)
      formData.append('after', afterImage)
      formData.append('category', categoryMap[category])

      if (expectedTask.trim()) {
        formData.append('expected_task', expectedTask.trim())
      }

      const response = await fetch(`${API_URL}/verify-pow`, {
        method: 'POST',
        body: formData,
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(
          responseData.detail || 'Proof-of-work verification failed.'
        )
      }

      setResult(responseData)
    } catch (err) {
      console.error('Proof-of-work error:', err)

      setError(
        err.message ||
          'Unable to connect to the verification server. Check your backend.'
      )
    } finally {
      setLoading(false)
    }
  }

  function formatValue(value) {
    if (value === null || value === undefined) {
      return 'Not provided'
    }

    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No'
    }

    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2)
    }

    return String(value).replaceAll('_', ' ')
  }

  // Correct backend response mapping
  const verification =
    result?.verification?.pow_analysis ||
    result?.pow_analysis?.verification ||
    result?.pow_analysis ||
    result?.verification ||
    result?.verification_details ||
    {}

  // Display the actual verification result
  const status =
    verification.verification_result ||
    verification.status ||
    'inconclusive'

  const humanReviewRequired =
    verification.requires_human_review ?? true

  return (
    <div className="pow-page">
      <div className="pow-container">
        <h1>Proof-of-Work Verification</h1>

        <p className="pow-subtitle">
          Compare before-and-after images to assess environmental cleanup work.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="complaint-id">Complaint ID</label>

          <input
            id="complaint-id"
            type="text"
            value={complaintId}
            onChange={(event) => {
              setComplaintId(event.target.value)
              setResult(null)
            }}
            placeholder="Example: CCD04D31CED3"
            required
          />

          <div className="pow-image-grid">
            <div className="pow-upload-card">
              <h2>Before Work</h2>
              <p>Upload the original complaint image.</p>

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/bmp"
                onChange={handleBeforeChange}
              />

              {beforePreview && (
                <img
                  className="pow-preview"
                  src={beforePreview}
                  alt="Before work"
                />
              )}
            </div>

            <div className="pow-upload-card">
              <h2>After Work</h2>
              <p>Upload the image after cleanup.</p>

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/bmp"
                onChange={handleAfterChange}
              />

              {afterPreview && (
                <img
                  className="pow-preview"
                  src={afterPreview}
                  alt="After work"
                />
              )}
            </div>
          </div>

          <label htmlFor="pow-category">Complaint Category</label>

          <select
            id="pow-category"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value)
              setResult(null)
            }}
            required
          >
            <option value="">Select complaint category</option>

            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <label htmlFor="expected-task">
            Expected Cleanup Task (Optional)
          </label>

          <textarea
            id="expected-task"
            value={expectedTask}
            onChange={(event) => setExpectedTask(event.target.value)}
            placeholder="Example: Remove accumulated garbage from the roadside."
          />

          {error && <div className="pow-error">{error}</div>}

          <button className="pow-submit" type="submit" disabled={loading}>
            {loading ? 'Verifying Images...' : 'Verify Cleanup Work'}
          </button>
        </form>

        {result && (
          <div className="pow-result">
            <h2>Verification Result</h2>

            <div className="pow-status">
              {formatValue(status).toUpperCase()}
            </div>

            <p>
              <strong>Complaint ID:</strong>{' '}
              {result.complaint_id || complaintId}
            </p>

            <p>
              <strong>Saved to MongoDB:</strong>{' '}
              {result.saved_to_database ? 'Yes' : 'No'}
            </p>

            <h3>Verification Summary</h3>

            <div className="pow-result-row">
              <strong>Before Image Quality:</strong>
              <span>
                {formatValue(verification.before_image_quality?.quality)}
              </span>
            </div>

            <div className="pow-result-row">
              <strong>After Image Quality:</strong>
              <span>
                {formatValue(verification.after_image_quality?.quality)}
              </span>
            </div>

            <div className="pow-result-row">
              <strong>Same Scene:</strong>
              <span>
                {formatValue(verification.same_scene_assessment)}
              </span>
            </div>

            <div className="pow-result-row">
              <strong>Visual Change Detected:</strong>
              <span>
                {formatValue(verification.visual_change_detected)}
              </span>
            </div>

            <div className="pow-result-row">
              <strong>Issue Still Visible:</strong>
              <span>
                {verification.issue_still_visible == null
                  ? 'Unable to determine'
                  : formatValue(verification.issue_still_visible)}
              </span>
            </div>

            <div className="pow-result-row">
              <strong>Officer Review:</strong>
              <span>
                {humanReviewRequired ? 'Required' : 'Not required'}
              </span>
            </div>

            <p className="pow-review-note">
              Automated visual verification is an assessment, not final
              approval. An authorized officer must review uncertain results.
            </p>

            <details className="pow-technical-details">
              <summary>View Technical Details</summary>
              <pre>{JSON.stringify(verification, null, 2)}</pre>
            </details>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProofOfWork