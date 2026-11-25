"""CleanCity Environmental AI REST API."""

from pathlib import Path
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from environmental_complaint_ai.cv.inference import ImageInferenceEngine
from environmental_complaint_ai.pow.verification import ProofOfWorkVerifier
from environmental_complaint_ai.pow.clip_detector import ClipIssueDetector

from .database import (
    complaints_collection,
    check_database_connection,
)


# ----------------------------------------
# APPLICATION
# ----------------------------------------

app = FastAPI(
    title="CleanCity Environmental AI API",
    description="Environmental complaint classification and sanitation verification",
    version="1.4.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ----------------------------------------
# MODEL INITIALIZATION
# ----------------------------------------

classifier = None

verifier = ProofOfWorkVerifier(
    issue_detector=ClipIssueDetector()
)


# ----------------------------------------
# DIRECTORIES
# ----------------------------------------

UPLOAD_DIR = Path("api_uploads")
COMPLAINT_IMAGE_DIR = UPLOAD_DIR / "complaints"
POW_IMAGE_DIR = UPLOAD_DIR / "proof_of_work"

UPLOAD_DIR.mkdir(exist_ok=True)
COMPLAINT_IMAGE_DIR.mkdir(parents=True, exist_ok=True)
POW_IMAGE_DIR.mkdir(parents=True, exist_ok=True)


# ----------------------------------------
# CONFIGURATION
# ----------------------------------------

ALLOWED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".bmp",
}

MAX_FILE_SIZE = 10 * 1024 * 1024

VALID_STATUSES = {
    "Pending Review",
    "Under Review",
    "Resolved",
}


# ----------------------------------------
# HELPER FUNCTIONS
# ----------------------------------------

def get_classifier():
    global classifier

    if classifier is None:
        classifier = ImageInferenceEngine()

    return classifier


def check_database():
    if not check_database_connection():
        raise HTTPException(
            status_code=503,
            detail="MongoDB is unavailable. Please check the database connection.",
        )


async def read_upload(upload: UploadFile):
    suffix = Path(upload.filename or "").suffix.lower()

    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported image format.",
        )

    content = await upload.read(MAX_FILE_SIZE + 1)

    if not content:
        raise HTTPException(
            status_code=400,
            detail="Uploaded image is empty.",
        )

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Image exceeds the 10 MB limit.",
        )

    return content, suffix


def complaint_response(complaint):
    complaint.pop("_id", None)
    return complaint


# ----------------------------------------
# HOME
# ----------------------------------------

@app.get("/")
def home():
    return {
        "project": "CleanCity Environmental AI",
        "message": "Welcome to CleanCity AI API",
        "status": "running",
    }


# ----------------------------------------
# HEALTH CHECK
# ----------------------------------------

@app.get("/health")
def health():
    database_status = check_database_connection()

    return {
        "status": "healthy",
        "service": "CleanCity Environmental AI",
        "database": (
            "connected"
            if database_status
            else "disconnected"
        ),
    }


# ----------------------------------------
# IMAGE CLASSIFICATION
# ----------------------------------------

@app.post("/classify")
async def classify_image(
    image: UploadFile = File(...),
):
    content, suffix = await read_upload(image)

    image_path = UPLOAD_DIR / f"temp_{uuid4().hex}{suffix}"

    try:
        image_path.write_bytes(content)

        return get_classifier().analyze(image_path)

    finally:
        image_path.unlink(missing_ok=True)


# ----------------------------------------
# PROOF OF WORK VERIFICATION
# ----------------------------------------

@app.post("/verify-pow")
async def verify_pow(
    before: UploadFile = File(...),
    after: UploadFile = File(...),
    category: str = Form(...),
    complaint_id: str | None = Form(default=None),
    expected_task: str | None = Form(default=None),
):

    check_database()

    category = category.strip().lower()

    if not category:
        raise HTTPException(
            status_code=400,
            detail="Complaint category is required.",
        )

    before_content, before_suffix = await read_upload(before)
    after_content, after_suffix = await read_upload(after)

    complaint = None

    if complaint_id:
        complaint = complaints_collection.find_one(
            {"complaint_id": complaint_id}
        )

        if complaint is None:
            raise HTTPException(
                status_code=404,
                detail="Complaint ID not found.",
            )

        stored_category = str(
            complaint.get("category") or ""
        ).strip().lower()

        if stored_category and stored_category != category:
            raise HTTPException(
                status_code=400,
                detail="Submitted category does not match the original complaint category.",
            )

    # Generate image paths.
    verification_id = f"POW{uuid4().hex[:10].upper()}"

    if complaint_id:
        before_filename = (
            f"{complaint_id}_{verification_id}_before{before_suffix}"
        )

        after_filename = (
            f"{complaint_id}_{verification_id}_after{after_suffix}"
        )
    else:
        before_filename = f"temp_{uuid4().hex}{before_suffix}"
        after_filename = f"temp_{uuid4().hex}{after_suffix}"

    before_path = POW_IMAGE_DIR / before_filename
    after_path = POW_IMAGE_DIR / after_filename

    try:
        before_path.write_bytes(before_content)
        after_path.write_bytes(after_content)

        verification_result = verifier.verify(
            before_path,
            after_path,
            category,
            expected_task,
        )

        if not isinstance(verification_result, dict):
            raise HTTPException(
                status_code=500,
                detail="Unexpected verification result from the verifier.",
            )

        analysis = verification_result.get(
            "pow_analysis",
            {},
        )

        human_review_required = analysis.get(
            "requires_human_review",
            True,
        )

        # Save verification result to MongoDB.
        if complaint_id:
            pow_record = {
                "verification_id": verification_id,
                "category": category,
                "expected_task": expected_task,
                "before_image": before_path.name,
                "after_image": after_path.name,
                "before_image_path": str(before_path),
                "after_image_path": str(after_path),
                "result": verification_result,
                "verified_at": datetime.now(
                    timezone.utc
                ).isoformat(),
                "human_review_required": human_review_required,
            }

            update_result = complaints_collection.update_one(
                {"complaint_id": complaint_id},
                {
                    "$push": {
                        "proof_of_work_records": pow_record
                    }
                },
            )

            if update_result.matched_count == 0:
                raise HTTPException(
                    status_code=404,
                    detail="Complaint not found while saving verification.",
                )

        return {
            "success": True,
            "complaint_id": complaint_id,
            "saved_to_database": bool(complaint_id),
            "verification": verification_result,
            "message": (
                "Verification completed and saved to the complaint."
                if complaint_id
                else "Verification completed. No complaint ID was supplied, so the result was not saved."
            ),
        }

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Proof-of-Work verification failed: {str(exc)}",
        )

    finally:
        # Preserve images linked to a complaint.
        if not complaint_id:
            before_path.unlink(missing_ok=True)
            after_path.unlink(missing_ok=True)


# ----------------------------------------
# CREATE AND SAVE COMPLAINT
# ----------------------------------------

@app.post("/complaints")
async def create_complaint(
    category: str = Form(...),
    location: str = Form(...),
    description: str = Form(...),
    image: UploadFile = File(...),
):

    check_database()

    category = category.strip()
    location = location.strip()
    description = description.strip()

    if not category or not location or not description:
        raise HTTPException(
            status_code=400,
            detail="Category, location and description are required.",
        )

    content, suffix = await read_upload(image)

    complaint_id = f"CC{uuid4().hex[:10].upper()}"

    image_filename = f"{complaint_id}{suffix}"

    image_path = COMPLAINT_IMAGE_DIR / image_filename

    try:
        image_path.write_bytes(content)

        complaint = {
            "complaint_id": complaint_id,
            "category": category,
            "location": location,
            "description": description,
            "image_filename": image_filename,
            "image_path": str(image_path),
            "status": "Pending Review",
            "created_at": datetime.now(
                timezone.utc
            ).isoformat(),
            "proof_of_work_records": [],
        }

        complaints_collection.insert_one(complaint)

        complaint.pop("_id", None)

        return {
            "success": True,
            "message": "Complaint submitted successfully.",
            "complaint": complaint,
        }

    except Exception:
        image_path.unlink(missing_ok=True)

        raise HTTPException(
            status_code=500,
            detail="Could not save complaint. Please check the backend logs.",
        )


# ----------------------------------------
# GET ALL COMPLAINTS
# ----------------------------------------

@app.get("/complaints")
def get_complaints():

    check_database()

    complaints = list(
        complaints_collection.find().sort(
            "created_at",
            -1,
        )
    )

    return {
        "total": len(complaints),
        "complaints": [
            complaint_response(item)
            for item in complaints
        ],
    }


# ----------------------------------------
# GET ONE COMPLAINT
# ----------------------------------------

@app.get("/complaints/{complaint_id}")
def get_complaint(complaint_id: str):

    check_database()

    complaint = complaints_collection.find_one(
        {"complaint_id": complaint_id}
    )

    if complaint is None:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found.",
        )

    return complaint_response(complaint)


# ----------------------------------------
# UPDATE COMPLAINT STATUS
# ----------------------------------------

@app.patch("/complaints/{complaint_id}/status")
def update_complaint_status(
    complaint_id: str,
    status: str = Form(...),
):

    check_database()

    if status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail="Invalid complaint status.",
        )

    result = complaints_collection.update_one(
        {"complaint_id": complaint_id},
        {
            "$set": {
                "status": status
            }
        },
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found.",
        )

    return {
        "success": True,
        "complaint_id": complaint_id,
        "status": status,
        "message": "Complaint status updated successfully.",
    }