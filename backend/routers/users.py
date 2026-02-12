from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import SessionLocal
from models.user import User
from schemas.user import UserCreate, UserOut, UserUpdate
from passlib.hash import bcrypt
from routers.auth import get_current_active_user, check_permission, get_current_user, can_manage_role
from services.activity_logger import log_user_action

router = APIRouter(prefix="/users", tags=["Users"])

def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/")
def list_users(
    db: Session = Depends(db_session),
    current_user: User = Depends(get_current_active_user),
    role: str | None = None,
    manager_id: int | None = None
):
    """
    List all users with optional filtering by role or manager_id.
    Includes manager_name in response.
    - Admin: Can view all users
    - Sales Manager: Can only view their own team members (when manager_id matches their ID)
    - Others: Require "users" permission
    """
    from models.role import Role
    from fastapi import HTTPException, status
    
    # Get current user's role
    current_role = db.query(Role).filter(Role.id == current_user.role_id).first()
    current_role_name = current_role.role_name if current_role else None
    
    # Check permissions
    has_users_permission = False
    if current_role:
        permissions = current_role.permissions if current_role.permissions else {}
        has_users_permission = permissions.get("all") == True or permissions.get("users") == True
    
    # Admin can view all users
    if current_role_name == "Admin":
        pass  # No restrictions
    # Sales Manager can view their own team members
    elif current_role_name == "Sales Manager":
        if manager_id is not None and manager_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sales Managers can only view their own team members"
            )
        # If manager_id is not specified, default to current user's ID
        if manager_id is None:
            manager_id = current_user.id
    # Others require "users" permission
    elif not has_users_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view users"
        )
    
    query = db.query(User)
    
    if role:
        role_obj = db.query(Role).filter(Role.role_name == role).first()
        if role_obj:
            query = query.filter(User.role_id == role_obj.id)
    
    if manager_id is not None:
        query = query.filter(User.manager_id == manager_id)
    
    users = query.all()
    
    # Add manager_name and role_name to each user
    result = []
    roles_dict = {r.id: r for r in db.query(Role).all()}
    for user in users:
        user_role = roles_dict.get(user.role_id)
        user_dict = {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role_id": user.role_id,
            "role_name": user_role.role_name if user_role else None,
            "manager_id": user.manager_id,
            "manager_name": None
        }
        if user.manager_id:
            manager = db.query(User).filter(User.id == user.manager_id).first()
            if manager:
                user_dict["manager_name"] = manager.name
        result.append(user_dict)
    
    return result

@router.get("/assignable", response_model=list[UserOut])
def list_assignable_users(
    db: Session = Depends(db_session),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get list of users that can be assigned leads.
    Only returns Sales Executives (hierarchy_level = 2), excludes Marketing (level 3).
    Includes manager information.
    """
    from models.role import Role
    # Only get Sales Executives (hierarchy_level = 2), exclude Marketing (level 3)
    # Filter by both hierarchy_level and role_name to be extra safe
    assignable_roles = db.query(Role).filter(
        Role.hierarchy_level == 2,
        Role.role_name == 'Sales Executive'
    ).all()
    role_ids = [role.id for role in assignable_roles]
    
    if not role_ids:
        return []
    
    # Check if current user is a Sales Manager - if so, filter by manager_id
    current_role = db.query(Role).filter(Role.id == current_user.role_id).first()
    users_query = db.query(User).filter(User.role_id.in_(role_ids))
    
    # For Sales Managers: only show their own team members
    if current_role and current_role.role_name == "Sales Manager":
        users_query = users_query.filter(User.manager_id == current_user.id)
    
    users = users_query.all()
    
    # Add manager_name and role_name to each user, and double-check to exclude Marketing
    result = []
    for user in users:
        # Get role name for filtering
        user_role = db.query(Role).filter(Role.id == user.role_id).first()
        role_name = user_role.role_name if user_role else None
        
        # Double-check: exclude Marketing users explicitly
        if role_name == 'Marketing':
            continue
        
        user_dict = {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role_id": user.role_id,
            "role_name": role_name,
            "manager_id": user.manager_id,
            "manager_name": None
        }
        if user.manager_id:
            manager = db.query(User).filter(User.id == user.manager_id).first()
            if manager:
                user_dict["manager_name"] = manager.name
        result.append(user_dict)
    
    return result

@router.post("/", response_model=UserOut)
def create_user(
    payload: UserCreate, 
    db: Session = Depends(db_session),
    current_user: User = Depends(check_permission("users"))
):
    from models.role import Role
    
    # Check hierarchy - user can only create users with roles they can manage
    new_role = db.query(Role).filter(Role.id == payload.role_id).first()
    if not new_role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    if not can_manage_role(current_user, new_role, db):
        raise HTTPException(
            status_code=403,
            detail=f"You don't have permission to create users with role '{new_role.role_name}'"
        )
    
    # Determine manager_id based on role and current user
    manager_id = payload.manager_id
    
    # If creating Sales Executive and current user is Sales Manager, auto-set manager_id
    if new_role.role_name == 'Sales Executive':
        current_user_role = db.query(Role).filter(Role.id == current_user.role_id).first()
        if current_user_role and current_user_role.role_name == 'Sales Manager':
            manager_id = current_user.id  # Sales Managers can only create under themselves
    
    # If creating Marketing user, only Admin can create, and manager_id should be None
    if new_role.role_name == 'Marketing':
        manager_id = None
    
    hashed = bcrypt.hash(payload.password)
    u = User(
        name=payload.name, 
        email=payload.email, 
        role_id=payload.role_id, 
        hashed_password=hashed,
        manager_id=manager_id
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    
    # Log user creation
    log_user_action(db, current_user.id, 'user_created', u.id, u.name)
    
    # Return user with manager_name
    result = {
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "role_id": u.role_id,
        "manager_id": u.manager_id,
        "manager_name": None
    }
    if u.manager_id:
        manager = db.query(User).filter(User.id == u.manager_id).first()
        if manager:
            result["manager_name"] = manager.name
    
    return result

@router.patch("/{id}", response_model=UserOut)
def update_user(
    id: int, 
    payload: UserUpdate, 
    db: Session = Depends(db_session),
    current_user: User = Depends(check_permission("users"))
):
    from models.role import Role
    
    u = db.query(User).filter(User.id==id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check hierarchy if role is being changed
    if payload.role_id is not None:
        new_role = db.query(Role).filter(Role.id == payload.role_id).first()
        if not new_role:
            raise HTTPException(status_code=404, detail="Role not found")
        
        if not can_manage_role(current_user, new_role, db):
            raise HTTPException(
                status_code=403,
                detail=f"You don't have permission to assign role '{new_role.role_name}'"
            )
    
    update_data = payload.dict(exclude_unset=True)
    if 'password' in update_data:
        update_data['hashed_password'] = bcrypt.hash(update_data.pop('password'))
    
    for key, value in update_data.items():
        setattr(u, key, value)
    
    db.add(u)
    db.commit()
    db.refresh(u)
    
    # Log user update
    log_user_action(db, current_user.id, 'user_updated', u.id, u.name)
    
    # Return user with manager_name
    result = {
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "role_id": u.role_id,
        "manager_id": u.manager_id,
        "manager_name": None
    }
    if u.manager_id:
        manager = db.query(User).filter(User.id == u.manager_id).first()
        if manager:
            result["manager_name"] = manager.name
    
    return result

@router.get("/hierarchy", response_model=dict)
def get_user_hierarchy(
    db: Session = Depends(db_session),
    current_user: User = Depends(check_permission("users"))
):
    """
    Get hierarchical structure of users.
    Returns tree structure with Sales Managers and their Sales Executives,
    plus Admin and Marketing users.
    """
    from models.role import Role
    
    # Get all roles
    roles = {r.id: r for r in db.query(Role).all()}
    
    # Get all users
    all_users = db.query(User).all()
    
    # Build hierarchy
    managers = []
    admin_users = []
    marketing_users = []
    unassigned_executives = []
    
    for user in all_users:
        role = roles.get(user.role_id)
        if not role:
            continue
        
        user_data = {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role_id": user.role_id,
            "role_name": role.role_name,
            "manager_id": user.manager_id,
            "team": []
        }
        
        if role.role_name == 'Sales Manager':
            managers.append(user_data)
        elif role.role_name == 'Admin':
            admin_users.append(user_data)
        elif role.role_name == 'Marketing':
            marketing_users.append(user_data)
    
    # Add Sales Executives to their managers or to unassigned list
    for user in all_users:
        role = roles.get(user.role_id)
        if role and role.role_name == 'Sales Executive':
            exec_data = {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role_id": user.role_id,
                "role_name": role.role_name,
                "manager_id": user.manager_id
            }
            if user.manager_id:
                # Find manager and add executive to their team
                for manager in managers:
                    if manager["id"] == user.manager_id:
                        manager["team"].append(exec_data)
                        break
            else:
                # Add to unassigned list
                unassigned_executives.append(exec_data)
    
    return {
        "managers": managers,
        "admin_users": admin_users,
        "marketing_users": marketing_users,
        "unassigned_executives": unassigned_executives
    }

@router.delete("/{id}")
def delete_user(
    id: int, 
    db: Session = Depends(db_session),
    current_user: User = Depends(check_permission("users"))
):
    u = db.query(User).filter(User.id==id).first()
    if u:
        user_name = u.name
        user_id = u.id
        db.delete(u)
        db.commit()
        
        # Log user deletion
        log_user_action(db, current_user.id, 'user_deleted', user_id, user_name)
    
    return {"ok": True}
