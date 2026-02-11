from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.hash import bcrypt
from database import SessionLocal
from models.user import User
from models.role import Role
from schemas.user import UserOut, PasswordChange
from config import SECRET_KEY, ALGORITHM
from services.activity_logger import log_login

router = APIRouter(prefix="/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def verify_password(plain_password, hashed_password):
    return bcrypt.verify(plain_password, hashed_password)

def get_password_hash(password):
    return bcrypt.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def authenticate_user(db: Session, email: str, password: str):
    user = get_user_by_email(db, email)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(db_session)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user role and permissions
    role = db.query(Role).filter(Role.id == user.role_id).first()
    permissions = role.permissions if role else {}
    
    access_token_expires = timedelta(hours=24)
    access_token = create_access_token(
        data={
            "sub": user.email,
            "user_id": user.id,
            "role_id": user.role_id,
            "role_name": role.role_name if role else None,
            "permissions": permissions
        },
        expires_delta=access_token_expires
    )
    
    # Log successful login (wrap in try-except to prevent login failure if logging fails)
    try:
        log_login(db, user.id, success=True)
    except Exception as e:
        # Log error but don't fail login
        print(f"Warning: Failed to log login activity: {e}")
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role_id": user.role_id,
            "role_name": role.role_name if role else None,
            "permissions": permissions
        }
    }

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(db_session)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = get_user_by_email(db, email)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    return current_user

# Optional authentication - doesn't fail if no token
async def get_optional_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(db_session)
):
    """Optional authentication - returns user if token is valid, None otherwise"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email:
            return get_user_by_email(db, email)
    except:
        pass
    return None

def can_manage_role(current_user: User, target_role, db: Session):
    """
    Check if current user can manage/create users with the target role based on hierarchy
    Returns True if user can manage the role, False otherwise
    """
    from models.role import Role
    
    current_user_role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if not current_user_role:
        return False
    
    # Admin (level 0) can manage all roles
    if current_user_role.hierarchy_level == 0:
        return True
    
    # Sales Manager (level 1) can manage Sales Executive (level 2) and Marketing (level 3)
    if current_user_role.hierarchy_level == 1:
        return target_role.hierarchy_level >= 2
    
    # Sales Executive and Marketing cannot manage any roles
    return False

def check_permission(required_permission: str, write_access: bool = False):
    """
    Dependency factory to check if user has required permission
    Usage: 
        - Depends(check_permission("leads")) for read access (allows view-only)
        - Depends(check_permission("leads", write_access=True)) for write access (requires explicit permission)
    """
    async def permission_checker(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(db_session)
    ):
        role = db.query(Role).filter(Role.id == current_user.role_id).first()
        if not role:
            raise HTTPException(status_code=403, detail="No role assigned")
        
        permissions = role.permissions or {}
        
        # Admin has all permissions
        if permissions.get("all") == True:
            return current_user
        
        # For write operations, require explicit permission (not just view)
        if write_access:
            if permissions.get(required_permission) == True:
                return current_user
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Not enough permissions. Write access required for: {required_permission}"
            )
        
        # Check specific permission
        if permissions.get(required_permission) == True:
            return current_user
        
        # Check for view permission (read-only access) - only for read operations
        # Note: Marketing role has "submissions" permission but not "leads"
        if required_permission in ["leads", "submissions", "reports"] and permissions.get("view") == True:
            return current_user
        
        # Special handling: lead_status_update, lead_comments, lead_assignment are sub-permissions
        # If user has "leads" permission, they can do these operations
        if required_permission in ["lead_status_update", "lead_comments"] and permissions.get("leads") == True:
            return current_user
        
        # lead_assignment requires explicit permission or "leads" permission
        if required_permission == "lead_assignment" and (permissions.get("lead_assignment") == True or permissions.get("leads") == True):
            return current_user
        
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Not enough permissions. Required: {required_permission}"
        )
    return permission_checker

@router.get("/me", response_model=UserOut)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@router.post("/change-password")
async def change_password(
    payload: PasswordChange,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(db_session)
):
    """Change password for the current user"""
    if not payload.old_password or not payload.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Old password and new password are required"
        )
    
    if len(payload.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long"
        )
    
    # Verify old password
    if not verify_password(payload.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect old password"
        )
    
    # Update password
    current_user.hashed_password = get_password_hash(payload.new_password)
    db.add(current_user)
    db.commit()
    
    return {"message": "Password changed successfully"}

