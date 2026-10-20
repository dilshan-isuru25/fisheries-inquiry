import os
import re
import html
import time
import uuid
import shutil
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Tuple

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    env_file = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_file):
        try:
            with open(env_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"")
                        if k and k not in os.environ:
                            os.environ[k] = v
        except Exception:
            pass

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request, Response, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
import mysql.connector
from mysql.connector import pooling
import bcrypt
import jwt

# 1. Logging Setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("MFAR_IT_Security")

# Security Configurations
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "fallback_change_me_in_production_secret_key_32chars")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))  # 8 hours
DESKTOP_API_KEY = os.getenv("DESKTOP_API_KEY", "")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# File Upload Rules
UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)
MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "10"))
MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024
ALLOWED_EXTENSIONS = set(
    ext.strip().lower() 
    for ext in os.getenv("ALLOWED_EXTENSIONS", "png,jpg,jpeg,webp,pdf,doc,docx,xls,xlsx,txt").split(",")
)

# Allowed input sets (Supports both Web Portal and Java Desktop App)
ALLOWED_CATEGORIES = {
    # Web Portal Categories
    "Internet connectivity",
    "System login failure",
    "System process issues",
    "Report issues",
    "Devices not working",
    "SIM card not working",
    "Document upload",
    "Forgot Password",
    "Other issues",
    # Desktop App & Standard Categories
    "Hardware",
    "Network",
    "Software",
    "Intercom",
    "Other"
}
ALLOWED_PRIORITIES = {"Low", "Medium", "High", "Critical"}
ALLOWED_STATUSES = {"Pending", "In_Progress", "Resolved"}

# Database Configuration
DB_CONFIG = {
    'host': os.getenv("DB_HOST", "localhost"),
    'port': int(os.getenv("DB_PORT", "3306")),
    'user': os.getenv("DB_USER", "root"),
    'password': os.getenv("DB_PASSWORD", ""),
    'database': os.getenv("DB_NAME", "it_complaint_db")
}

# Automatically enable SSL for TiDB Cloud or Cloud MySQL providers
db_host_lower = os.getenv("DB_HOST", "localhost").lower()
if os.getenv("DB_SSL", "").lower() in ("true", "1") or int(os.getenv("DB_PORT", "3306")) == 4000 or "tidbcloud" in db_host_lower:
    DB_CONFIG['ssl_verify_cert'] = False

# 2. FastAPI Application Initialization
app = FastAPI(
    title="Ministry IT Complaint API",
    version="2.0.0",
    docs_url="/docs" if ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if ENVIRONMENT != "production" else None,
    openapi_url="/openapi.json" if ENVIRONMENT != "production" else None,
)

# 3. Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"
    return response

# 4. CORS Configuration
# Supports localhost, LAN access, and custom configured domains
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]
if not allowed_origins:
    allowed_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if ENVIRONMENT == "production" else ["*"],
    allow_credentials=True if ENVIRONMENT == "production" else False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Mount Static Uploads Folder securely
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# 5. Database Connection Pool with Auto-Reconnect
db_pool = None

def get_db_pool():
    global db_pool
    if db_pool is None:
        try:
            db_pool = mysql.connector.pooling.MySQLConnectionPool(
                pool_name="secure_pool",
                pool_size=10,
                pool_reset_session=True,
                **DB_CONFIG
            )
            logger.info("MySQL Connection Pool successfully initialized.")
        except mysql.connector.Error as err:
            logger.error(f"Database Connection Error: {err}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database service unavailable. Please check MySQL server."
            )
    return db_pool

def get_db_connection():
    pool = get_db_pool()
    try:
        conn = pool.get_connection()
        conn.ping(reconnect=True, attempts=3, delay=1)
        return conn
    except mysql.connector.Error as err:
        logger.error(f"Failed to acquire database connection: {err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection error. Please try again later."
        )

# 6. Password Utilities (Bcrypt)
def verify_password(plain_password: str, stored_password: str, user_id: Optional[int] = None) -> bool:
    """Verifies password using bcrypt. Transparently upgrades legacy plaintext passwords."""
    try:
        # Check if stored as bcrypt
        if stored_password.startswith("$2b$") or stored_password.startswith("$2a$"):
            return bcrypt.checkpw(plain_password.encode("utf-8"), stored_password.encode("utf-8"))
        
        # Legacy plain-text check (auto-migration fallback)
        if plain_password == stored_password:
            if user_id:
                try:
                    new_hash = get_password_hash(plain_password)
                    db = get_db_connection()
                    cur = db.cursor()
                    cur.execute("UPDATE users SET password=%s WHERE user_id=%s", (new_hash, user_id))
                    db.commit()
                    cur.close()
                    db.close()
                    logger.info(f"Auto-migrated legacy plaintext password for user_id={user_id} to bcrypt.")
                except Exception as e:
                    logger.error(f"Error auto-migrating password: {e}")
            return True
        return False
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False

def get_password_hash(password: str) -> str:
    """Generates strong bcrypt hash with 12 rounds."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

# 7. JWT Authentication Utilities
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

security_bearer = HTTPBearer(auto_error=False)

def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)
) -> dict:
    """
    Validates JWT token from 'Authorization: Bearer <token>' header.
    Also accepts internal DESKTOP_API_KEY via 'X-API-Key' for the Java desktop app.
    """
    # 1. Check for Desktop API Key fallback
    api_key_header = request.headers.get("X-API-Key")
    if DESKTOP_API_KEY and api_key_header and api_key_header == DESKTOP_API_KEY:
        return {
            "user_id": 1,
            "full_name": "Desktop Helpdesk Agent",
            "email": "desktop@fisheries.gov.lk",
            "role": "Staff"
        }

    # 2. Validate Bearer Token
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload.",
                headers={"WWW-Authenticate": "Bearer"}
            )
        user_id = int(user_id)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except Exception as e:
        logger.warning(f"JWT Decode failure: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # 3. Verify user still exists in database
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT user_id, full_name, email, role FROM users WHERE user_id=%s", (user_id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account not found.")
        return user
    finally:
        cursor.close()
        db.close()

def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Role-Based Access Control: ensures only users with role 'Admin' proceed."""
    if current_user.get("role") != "Admin":
        logger.warning(f"Unauthorized admin access attempt by user_id={current_user.get('user_id')}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Admin privileges required."
        )
    return current_user

# 8. Brute Force Protection (In-Memory IP Rate Limiting for Login & Registration)
login_attempts: Dict[str, Tuple[int, float]] = {}  # ip -> (failed_count, lock_until_timestamp)
registration_attempts: Dict[str, list] = {}        # ip -> list of timestamps

def check_login_rate_limit(client_ip: str):
    now = time.time()
    if client_ip in login_attempts:
        failed_count, lock_until = login_attempts[client_ip]
        if lock_until > now:
            remaining = int(lock_until - now)
            logger.warning(f"Blocked login attempt from locked IP {client_ip}. Remaining: {remaining}s")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed login attempts. Please wait {remaining} seconds before trying again."
            )
        elif lock_until > 0 and lock_until <= now:
            # Lock has expired, reset counter
            login_attempts.pop(client_ip, None)

def record_login_failure(client_ip: str):
    now = time.time()
    failed_count, _ = login_attempts.get(client_ip, (0, 0))
    failed_count += 1
    if failed_count >= 5:
        # Lock for 5 minutes (300 seconds)
        login_attempts[client_ip] = (failed_count, now + 300)
        logger.warning(f"IP {client_ip} has been locked out for 5 minutes due to 5 consecutive failed logins.")
    else:
        login_attempts[client_ip] = (failed_count, 0)

def record_login_success(client_ip: str):
    login_attempts.pop(client_ip, None)

def check_registration_rate_limit(client_ip: str):
    now = time.time()
    timestamps = registration_attempts.get(client_ip, [])
    # Keep only timestamps in the last 15 minutes (900 seconds)
    timestamps = [t for t in timestamps if now - t < 900]
    if len(timestamps) >= 5:
        logger.warning(f"Registration rate limit exceeded for IP: {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Registration limit reached from this network. Please wait 15 minutes before creating another account."
        )
    timestamps.append(now)
    registration_attempts[client_ip] = timestamps

# 9. Pydantic Models for Input Validation
class LoginRequest(BaseModel):
    email: str = Field(..., max_length=100)
    password: str = Field(..., min_length=1, max_length=100)

class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=100)
    password: str = Field(..., min_length=6, max_length=100)
    department_id: Optional[int] = None

class StatusUpdate(BaseModel):
    status: str = Field(..., max_length=20)

class AssignUpdate(BaseModel):
    assigned_to: str = Field(..., max_length=100)
    action_note: str = Field(default="", max_length=1000)

# 10. API Endpoints

# 0. Departments List API
@app.get("/api/departments")
def get_departments():
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT department_id, department_name FROM departments ORDER BY department_name ASC")
        return cursor.fetchall()
    except Exception as e:
        logger.error(f"Error fetching departments: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch departments.")
    finally:
        cursor.close()
        db.close()

# 1. User Registration API
@app.post("/api/register")
def register(data: RegisterRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    check_registration_rate_limit(client_ip)

    clean_name = html.escape(data.full_name.strip())[:100]
    clean_email = data.email.strip().lower()
    clean_password = data.password.strip()

    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", clean_email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email address format."
        )

    if len(clean_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )

    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT user_id FROM users WHERE LOWER(email)=%s", (clean_email,))
        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists. Please sign in."
            )

        dept_id = data.department_id
        if dept_id:
            cursor.execute("SELECT department_id FROM departments WHERE department_id=%s", (dept_id,))
            if not cursor.fetchone():
                dept_id = None

        password_hash = get_password_hash(clean_password)

        cursor.execute(
            "INSERT INTO users (full_name, email, password, department_id, role) VALUES (%s, %s, %s, %s, 'Staff')",
            (clean_name, clean_email, password_hash, dept_id)
        )
        db.commit()
        new_user_id = cursor.lastrowid
        logger.info(f"New user registered: user_id={new_user_id}, email={clean_email}")

        token_payload = {
            "sub": str(new_user_id),
            "email": clean_email,
            "role": "Staff"
        }
        access_token = create_access_token(token_payload)

        return {
            "status": "Success",
            "message": "Account registered successfully!",
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "user_id": new_user_id,
                "full_name": clean_name,
                "email": clean_email,
                "role": "Staff"
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during registration."
        )
    finally:
        cursor.close()
        db.close()

# 2. User Login API with Rate Limiting & Bcrypt Verification
@app.post("/api/login")
def login(data: LoginRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    check_login_rate_limit(client_ip)

    clean_email = data.email.strip().lower()

    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT user_id, full_name, email, password, role FROM users WHERE LOWER(email)=%s", 
            (clean_email,)
        )
        user = cursor.fetchone()
        
        if not user or not verify_password(data.password, user["password"], user["user_id"]):
            record_login_failure(client_ip)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="Invalid email or password"
            )

        # Successful login: reset failed counters
        record_login_success(client_ip)

        # Generate secure JWT access token
        token_payload = {
            "sub": str(user["user_id"]),
            "email": user["email"],
            "role": user["role"]
        }
        access_token = create_access_token(token_payload)

        return {
            "status": "Success",
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "user_id": user["user_id"],
                "full_name": user["full_name"],
                "email": user["email"],
                "role": user["role"]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login unexpected error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="An unexpected error occurred during login."
        )
    finally:
        cursor.close()
        db.close()

# 2. Submit Complaint API (Strict File Upload Validation & Auth enforcement)
@app.post("/api/complaints")
async def create_complaint(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    content_type = request.headers.get("content-type", "")
    category = None
    department = "Ministry Office"
    priority = "Medium"
    description = None
    attachment_url = None

    if "application/json" in content_type:
        try:
            data = await request.json()
            category = data.get("category")
            department = data.get("department") or "Ministry Office"
            priority = data.get("priority") or "Medium"
            description = data.get("description")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON payload: {e}")
    else:
        try:
            form = await request.form()
            category = form.get("category")
            department = form.get("department") or "Ministry Office"
            priority = form.get("priority") or "Medium"
            description = form.get("description")
            
            file: Optional[UploadFile] = form.get("file")
            if file and hasattr(file, "filename") and file.filename:
                # 1. Sanitize original filename and validate extension
                original_filename = os.path.basename(file.filename.strip())
                _, ext = os.path.splitext(original_filename)
                clean_ext = ext.lstrip(".").lower()

                if clean_ext not in ALLOWED_EXTENSIONS:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Security alert: File extension '.{clean_ext}' is not permitted. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
                    )

                # 2. Limit File Size to prevent disk exhaustion (DoS)
                content = await file.read(MAX_UPLOAD_SIZE_BYTES + 1024)
                if len(content) > MAX_UPLOAD_SIZE_BYTES:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"File exceeds maximum allowed size limit of {MAX_UPLOAD_SIZE_MB}MB."
                    )

                # 3. Magic Bytes signature check (prevent disguise executable/script files)
                MAGIC_SIGNATURES = {
                    "png": [b"\x89PNG\r\n\x1a\n"],
                    "jpg": [b"\xff\xd8\xff"],
                    "jpeg": [b"\xff\xd8\xff"],
                    "webp": [b"RIFF"],
                    "pdf": [b"%PDF-"],
                    "gif": [b"GIF87a", b"GIF89a"]
                }
                if clean_ext in MAGIC_SIGNATURES:
                    if not any(content.startswith(sig) for sig in MAGIC_SIGNATURES[clean_ext]):
                        logger.warning(f"File magic signature mismatch for extension .{clean_ext}")
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Security alert: File content signature does not match the uploaded file extension."
                        )

                # 4. Create cryptographically safe unique filename
                safe_name = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', original_filename)
                unique_filename = f"{uuid.uuid4().hex[:12]}_{safe_name}"
                safe_file_path = os.path.abspath(os.path.join(UPLOAD_DIR, unique_filename))

                # Prevent Path Traversal
                if not safe_file_path.startswith(UPLOAD_DIR):
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file destination path.")

                with open(safe_file_path, "wb") as buffer:
                    buffer.write(content)

                # Save relative path so it is accessible from any client on LAN or Internet
                attachment_url = f"/uploads/{unique_filename}"
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error parsing complaint form data: {e}")
            raise HTTPException(status_code=400, detail="Error processing uploaded form data.")

    # Validation
    if not category or category.strip() == "Select Inquiry Type":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please select an Inquiry Category from the dropdown before submitting."
        )

    if category not in ALLOWED_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category selected. Allowed categories: {', '.join(sorted(ALLOWED_CATEGORIES))}"
        )
    if priority not in ALLOWED_PRIORITIES:
        priority = "Medium"

    if not description or len(description.strip()) < 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Description must contain at least 5 characters."
        )

    clean_description = html.escape(description.strip())[:4000]
    clean_department = html.escape((department or "Ministry Office").strip())[:150]

    # SECURE: Always bind the complaint to current authenticated user's ID
    user_id = current_user["user_id"]

    db = get_db_connection()
    cursor = db.cursor()
    try:
        timestamp_part = str(int(datetime.now().timestamp()))[-4:]
        ticket_code = f"IT-{datetime.now().year}-{timestamp_part}"
        
        query = """
            INSERT INTO complaints (ticket_code, user_id, category, department, priority, description, attachment_url, status, assigned_to, created_at, updated_at) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'Pending', 'Unassigned', NOW(), NOW())
        """
        cursor.execute(query, (ticket_code, user_id, category, clean_department, priority, clean_description, attachment_url))
        db.commit()
        logger.info(f"New complaint created: ticket_code={ticket_code} by user_id={user_id}")
        return {"status": "Success", "ticket_code": ticket_code}
    except Exception as e:
        logger.error(f"Error submitting ticket to database: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Database error while saving ticket."
        )
    finally:
        cursor.close()
        db.close()

# 3. Get User Complaints (Authorized: Staff can ONLY view their own complaints, Admin can view any)
@app.get("/api/complaints/user/{user_id}")
def get_user_complaints(
    user_id: int,
    current_user: dict = Depends(get_current_user)
):
    # Enforce Authorization: prevent IDOR (Insecure Direct Object Reference)
    if current_user["role"] != "Admin" and int(current_user["user_id"]) != user_id:
        logger.warning(f"Unauthorized ticket fetch attempt by user_id={current_user['user_id']} for target user_id={user_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You are only authorized to view your own complaints."
        )

    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT * FROM complaints WHERE user_id=%s ORDER BY created_at DESC", 
            (user_id,)
        )
        return cursor.fetchall()
    except Exception as e:
        logger.error(f"Fetch User Complaints Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch complaints.")
    finally:
        cursor.close()
        db.close()

# 4. Get All Complaints (Strictly Admin View)
@app.get("/api/complaints/admin")
def get_all_complaints(current_user: dict = Depends(require_admin)):
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT c.*, u.full_name, u.email 
            FROM complaints c 
            JOIN users u ON c.user_id = u.user_id 
            ORDER BY c.created_at DESC
        """)
        return cursor.fetchall()
    except Exception as e:
        logger.error(f"Fetch Admin Complaints Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve complaints.")
    finally:
        cursor.close()
        db.close()

# 5. Update Status API (Strictly Admin View)
@app.put("/api/complaints/{ticket_id}/status")
def update_status(
    ticket_id: int, 
    data: StatusUpdate,
    current_user: dict = Depends(require_admin)
):
    if data.status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status value. Allowed: {', '.join(sorted(ALLOWED_STATUSES))}"
        )

    db = get_db_connection()
    cursor = db.cursor()
    try:
        cursor.execute(
            "UPDATE complaints SET status=%s, updated_at=NOW() WHERE ticket_id=%s", 
            (data.status, ticket_id)
        )
        db.commit()
        logger.info(f"Ticket ticket_id={ticket_id} status updated to '{data.status}' by Admin user_id={current_user['user_id']}")
        return {"status": "Success"}
    except Exception as e:
        logger.error(f"Update Status Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update ticket status.")
    finally:
        cursor.close()
        db.close()

# 6. Assign Ticket API (Strictly Admin View)
@app.put("/api/complaints/{ticket_id}/assign")
def assign_ticket(
    ticket_id: int, 
    data: AssignUpdate,
    current_user: dict = Depends(require_admin)
):
    clean_assignee = html.escape(data.assigned_to.strip())[:100]
    clean_note = html.escape((data.action_note or "").strip())[:1000]

    db = get_db_connection()
    cursor = db.cursor()
    try:
        cursor.execute(
            "UPDATE complaints SET assigned_to=%s, action_note=%s, updated_at=NOW() WHERE ticket_id=%s", 
            (clean_assignee, clean_note, ticket_id)
        )
        db.commit()
        logger.info(f"Ticket ticket_id={ticket_id} assigned to '{clean_assignee}' by Admin user_id={current_user['user_id']}")
        return {"status": "Success"}
    except Exception as e:
        logger.error(f"Assign Ticket Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to assign ticket.")
    finally:
        cursor.close()
        db.close()

# 7. Delete Complaint API (Admin can delete any; Staff can only delete their own 'Pending' ticket)
@app.delete("/api/complaints/{ticket_id}")
def delete_complaint(
    ticket_id: int,
    current_user: dict = Depends(get_current_user)
):
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)
    try:
        # Check complaint ownership and status
        cursor.execute("SELECT ticket_id, user_id, status, attachment_url FROM complaints WHERE ticket_id=%s", (ticket_id,))
        complaint = cursor.fetchone()
        if not complaint:
            raise HTTPException(status_code=404, detail="Complaint ticket not found.")

        # Authorization verification
        if current_user["role"] != "Admin":
            if int(complaint["user_id"]) != int(current_user["user_id"]):
                raise HTTPException(status_code=403, detail="Access denied: You can only delete your own complaints.")
            if complaint["status"] != "Pending":
                raise HTTPException(status_code=400, detail="Only complaints in 'Pending' status can be deleted by staff.")

        # Securely remove attachment file if present
        if complaint.get("attachment_url"):
            filename = os.path.basename(complaint["attachment_url"])
            file_path = os.path.abspath(os.path.join(UPLOAD_DIR, filename))
            if file_path.startswith(UPLOAD_DIR) and os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception as file_err:
                    logger.warning(f"Failed to delete attachment physical file: {file_err}")

        # Delete from database
        cursor.execute("DELETE FROM complaints WHERE ticket_id=%s", (ticket_id,))
        db.commit()
        logger.info(f"Ticket ticket_id={ticket_id} deleted by user_id={current_user['user_id']}")
        return {"status": "Success", "message": "Ticket deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete Complaint Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete complaint.")
    finally:
        cursor.close()
        db.close()

# 8. Server Launcher
if __name__ == "__main__":
    import uvicorn
    host = os.getenv("SERVER_HOST", "0.0.0.0")
    port = int(os.getenv("PORT", os.getenv("SERVER_PORT", "8000")))
    uvicorn.run("main:app", host=host, port=port, reload=True)