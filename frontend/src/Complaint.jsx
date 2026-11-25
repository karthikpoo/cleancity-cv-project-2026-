import { useState, useEffect } from 'react'
import './Complaint.css'

const API_URL = 'http://127.0.0.1:8000'

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

const categoryNames = {
  garbage_accumulation: 'Garbage accumulation',
  overflowing_dustbins: 'Overflowing dustbins',
  sewage_leakage: 'Sewage leakage',
  waterlogging: 'Waterlogging',
  water_pollution: 'Water pollution',
  air_pollution: 'Air pollution',
  illegal_dumping: 'Illegal dumping',
  construction_waste: 'Construction waste',
  dead_animals: 'Dead animals',
  public_sanitation_issues: 'Public sanitation issues',
  unsupported_uncertain: 'Unsupported / uncertain',
}

function Complaint() {
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiResult, setAiResult] = useState(null)
  const [savedComplaint, setSavedComplaint] = useState(null)

  useEffect(() => {
    if (!image) {
      setPreview('')
      return
    }

    const imageUrl = URL.createObjectURL(image)
    setPreview(imageUrl)

    return () => URL.revokeObjectURL(imageUrl)
  }, [image])

  function handleImageChange(event) {
    const selectedImage = event.target.files[0]

    setMessage('')
    setAiResult(null)
    setSavedComplaint(null)
    setImage(null)

    if (!selectedImage) return

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/bmp',
    ]

    if (!allowedTypes.includes(selectedImage.type)) {
      setMessage('Please select a JPG, PNG, WEBP or BMP image.')
      setMessageType('error')
      event.target.value = ''
      return
    }

    if (selectedImage.size > 5 * 1024 * 1024) {
      setMessage('Image size must be less than 5 MB.')
      setMessageType('error')
      event.target.value = ''
      return
    }

    setImage(selectedImage)
  }

  async function handleAnalyze(event) {
    event.preventDefault()

    setMessage('')
    setAiResult(null)
    setSavedComplaint(null)

    if (!category || !description.trim() || !location.trim() || !image) {
      setMessage('Please complete all fields and upload an image.')
      setMessageType('error')
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('image', image)

      const response = await fetch(`${API_URL}/classify`, {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.detail || 'Image analysis failed.')
      }

      setAiResult(result)
      setMessage('AI image analysis completed. Review the result below.')
      setMessageType('success')

    } catch (error) {
      console.error('AI classification error:', error)

      setMessage(
        error.message || 'Unable to connect to the AI server.'
      )
      setMessageType('error')

    } finally {
      setLoading(false)
    }
  }

  async function handleSaveComplaint() {
    if (!aiResult || !image) {
      setMessage('Please analyse the complaint image first.')
      setMessageType('error')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const formData = new FormData()

      formData.append('category', categoryMap[category])
      formData.append('description', description.trim())
      formData.append('location', location.trim())
      formData.append('image', image)

      const response = await fetch(`${API_URL}/complaints`, {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.detail || 'Complaint submission failed.')
      }

      setSavedComplaint(result.complaint)
      setMessage('Your complaint has been successfully saved!')
      setMessageType('success')

    } catch (error) {
      console.error('Complaint submission error:', error)

      setMessage(
        error.message || 'Unable to save your complaint.'
      )
      setMessageType('error')

    } finally {
      setLoading(false)
    }
  }

  const classification = aiResult?.classification
  const rankedScores = classification?.ranked_category_scores || []

  const predictedCategory = classification?.selected_category
  const selectedCategory = categoryMap[category]

  const categoryMismatch =
    predictedCategory &&
    predictedCategory !== 'unsupported_uncertain' &&
    selectedCategory !== predictedCategory

  const needsHumanReview =
    !classification?.supported ||
    !predictedCategory ||
    predictedCategory === 'unsupported_uncertain' ||
    categoryMismatch

  return (
    <div className="complaint-page">
      <div className="complaint-container">

        <h1>Report an Environmental Issue</h1>
        <p>Submit details and a photo of the issue.</p>

        <form onSubmit={handleAnalyze}>

          <label>Complaint Category</label>

          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              setAiResult(null)
              setSavedComplaint(null)
              setMessage('')
            }}
            required
          >
            <option value="">Select category</option>

            {Object.keys(categoryMap).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <label>Description</label>

          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value)
              setAiResult(null)
              setSavedComplaint(null)
            }}
            placeholder="Describe the environmental issue..."
            required
          />

          <label>Location</label>

          <input
            type="text"
            value={location}
            onChange={(e) => {
              setLocation(e.target.value)
              setAiResult(null)
              setSavedComplaint(null)
            }}
            placeholder="Enter the issue location"
            required
          />

          <label>Upload Complaint Image (Maximum 5 MB)</label>

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/bmp"
            onChange={handleImageChange}
            required
          />

          {preview && (
            <div style={{ marginTop: '20px' }}>
              <h3>Image Preview</h3>

              <img
                src={preview}
                alt="Selected complaint"
                style={{
                  width: '100%',
                  maxWidth: '350px',
                  maxHeight: '250px',
                  objectFit: 'contain',
                  borderRadius: '10px',
                  border: '1px solid #ccc',
                }}
              />
            </div>
          )}

          <button type="submit" disabled={loading || !!savedComplaint}>
            {loading ? 'Analyzing Image...' : 'Analyze Complaint Image'}
          </button>

        </form>

        {message && (
          <p
            style={{
              color: messageType === 'error' ? '#d32f2f' : '#16803c',
              marginTop: '15px',
              fontWeight: 'bold',
            }}
          >
            {message}
          </p>
        )}

        {classification && (
          <div
            style={{
              marginTop: '25px',
              padding: '22px',
              border: '1px solid #b7dfc5',
              borderRadius: '12px',
              background: '#f0fff4',
            }}
          >
            <h2>AI Classification Result</h2>

            <h3>
              Predicted category:{' '}
              {categoryNames[predictedCategory] || 'Uncertain'}
            </h3>

            <p>
              <strong>Supported:</strong>{' '}
              {classification.supported ? 'Yes' : 'No'}
            </p>

            {categoryMismatch && (
              <div
                style={{
                  background: '#fff3cd',
                  color: '#856404',
                  padding: '14px',
                  borderRadius: '8px',
                  marginTop: '15px',
                }}
              >
                <strong>Category mismatch detected</strong>
                <p>Your selected category: {category}</p>
                <p>
                  AI predicted category:{' '}
                  {categoryNames[predictedCategory] || predictedCategory}
                </p>
                <p>Please verify the category before submission.</p>
              </div>
            )}

            {needsHumanReview && (
              <div
                style={{
                  background: '#fff3cd',
                  color: '#856404',
                  padding: '14px',
                  borderRadius: '8px',
                  marginTop: '15px',
                }}
              >
                <strong>Human review recommended</strong>
                <p>
                  An authorized officer should review this AI result.
                  The prediction is not a confirmed complaint category.
                </p>
              </div>
            )}

            {!needsHumanReview && (
              <p style={{ color: '#16803c', fontWeight: 'bold' }}>
                No category mismatch detected. Officer review is still
                required before final confirmation.
              </p>
            )}

            <h3>Ranked Category Scores</h3>

            {rankedScores.map((item, index) => (
              <p key={item.category || index}>
                {index + 1}.{' '}
                {categoryNames[item.category] || item.category} —{' '}
                {Number(item.similarity_score).toFixed(4)}
              </p>
            ))}

            <p style={{ fontSize: '13px', color: '#555' }}>
              CLIP similarity scores are not calibrated confidence
              percentages.
            </p>

            {!savedComplaint && (
              <button
                type="button"
                onClick={handleSaveComplaint}
                disabled={loading}
                style={{
                  marginTop: '15px',
                  padding: '13px 22px',
                  background: '#17663b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                {loading ? 'Submitting...' : 'Submit Complaint'}
              </button>
            )}
          </div>
        )}

        {savedComplaint && (
          <div
            style={{
              marginTop: '25px',
              padding: '22px',
              background: '#e8f5e9',
              border: '1px solid #81c784',
              borderRadius: '12px',
            }}
          >
            <h2>Complaint Submitted Successfully!</h2>

            <h3>
              Complaint ID: {savedComplaint.complaint_id}
            </h3>

            <p>
              <strong>Category:</strong> {category}
            </p>

            <p>
              <strong>Location:</strong> {savedComplaint.location}
            </p>

            <p>
              <strong>Status:</strong> {savedComplaint.status}
            </p>

            <p>
              Keep your complaint ID to track its progress.
            </p>
          </div>
        )}

      </div>
    </div>
  )
}

export default Complaint