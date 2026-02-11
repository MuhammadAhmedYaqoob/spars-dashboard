"""
Reports router for team and organization performance metrics
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import Dict, List
from database import SessionLocal
from models.lead import Lead
from models.call_log import CallLog
from models.user import User
from models.role import Role
from routers.auth import get_current_active_user, check_permission

router = APIRouter(prefix="/reports", tags=["Reports"])

def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/team-performance")
def get_team_performance(
    db: Session = Depends(db_session),
    current_user: User = Depends(check_permission("reports"))
):
    """
    Get team performance metrics for Sales Manager.
    Returns performance data for all sales executives under the manager's team.
    """
    from models.role import Role
    
    # Get current user's role
    role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    # Only Sales Manager and Admin can access this
    if role.role_name not in ["Sales Manager", "Admin"]:
        raise HTTPException(status_code=403, detail="Only Sales Managers and Admins can view team performance")
    
    # Get all Sales Executive users (hierarchy_level = 2) under this manager
    sales_exec_role = db.query(Role).filter(Role.hierarchy_level == 2).first()
    if not sales_exec_role:
        return []
    
    # Filter executives by manager_id if current user is Sales Manager
    if role.role_name == "Sales Manager":
        sales_executives = db.query(User).filter(
            User.role_id == sales_exec_role.id,
            User.manager_id == current_user.id
        ).all()
    else:
        # Admin can see all executives
        sales_executives = db.query(User).filter(User.role_id == sales_exec_role.id).all()
    
    team_data = []
    for exec_user in sales_executives:
        # Get leads assigned to this executive
        leads = db.query(Lead).filter(Lead.assigned_to == exec_user.id).all()
        total_leads = len(leads)
        
        # Count leads by status
        status_counts = {}
        for lead in leads:
            status_counts[lead.status] = status_counts.get(lead.status, 0) + 1
        
        # Get call logs for this executive
        call_logs = db.query(CallLog).filter(CallLog.user_id == exec_user.id).all()
        total_calls = len(call_logs)
        
        # Calculate conversion rate (Closed Won / Total Leads)
        closed_won = status_counts.get("Closed Won", 0) + status_counts.get("Won", 0)
        conversion_rate = (closed_won / total_leads * 100) if total_leads > 0 else 0
        
        # Calculate total Project Value from call logs
        total_dollar_value = sum(log.dollar_value or 0 for log in call_logs if log.dollar_value)
        
        # Count secured orders
        secured_orders = sum(1 for log in call_logs if log.secured_order)
        
        # Get stage distribution
        stage_counts = {}
        for log in call_logs:
            if log.stage:
                stage_counts[log.stage] = stage_counts.get(log.stage, 0) + 1
        
        team_data.append({
            "user_id": exec_user.id,
            "user_name": exec_user.name,
            "user_email": exec_user.email,
            "total_leads": total_leads,
            "total_calls": total_calls,
            "conversion_rate": round(conversion_rate, 2),
            "total_dollar_value": round(total_dollar_value, 2),
            "secured_orders": secured_orders,
            "status_counts": status_counts,
            "stage_distribution": stage_counts,
            "closed_won": closed_won
        })
    
    return team_data

@router.get("/org-performance")
def get_org_performance(
    db: Session = Depends(db_session),
    current_user: User = Depends(check_permission("reports"))
):
    """
    Get organization-wide performance metrics for Admin.
    Returns performance data grouped by Sales Manager and their teams.
    """
    from models.role import Role
    
    # Get current user's role
    role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    # Only Admin can access this
    if role.role_name != "Admin":
        raise HTTPException(status_code=403, detail="Only Admins can view organization performance")
    
    # Get all Sales Managers
    manager_role = db.query(Role).filter(Role.role_name == "Sales Manager").first()
    if not manager_role:
        return []
    
    managers = db.query(User).filter(User.role_id == manager_role.id).all()
    
    # Get all Sales Executives
    exec_role = db.query(Role).filter(Role.hierarchy_level == 2).first()
    if not exec_role:
        return []
    
    sales_executives = db.query(User).filter(User.role_id == exec_role.id).all()
    
    org_data = []
    for manager in managers:
        # For each manager, aggregate data from sales executives under this manager
        # Filter executives by manager_id
        manager_executives = [exec for exec in sales_executives if exec.manager_id == manager.id]
        
        manager_team_data = []
        total_leads = 0
        total_calls = 0
        total_dollar_value = 0
        total_secured_orders = 0
        total_closed_won = 0
        all_status_counts = {}
        all_stage_counts = {}
        
        for exec_user in manager_executives:
            # Get leads assigned to this executive
            leads = db.query(Lead).filter(Lead.assigned_to == exec_user.id).all()
            exec_leads = len(leads)
            total_leads += exec_leads
            
            # Count leads by status for this executive
            exec_status_counts = {}
            for lead in leads:
                exec_status_counts[lead.status] = exec_status_counts.get(lead.status, 0) + 1
                all_status_counts[lead.status] = all_status_counts.get(lead.status, 0) + 1
            
            # Get call logs for this executive
            call_logs = db.query(CallLog).filter(CallLog.user_id == exec_user.id).all()
            exec_calls = len(call_logs)
            total_calls += exec_calls
            
            # Calculate Project Value
            exec_dollar_value = sum(log.dollar_value or 0 for log in call_logs if log.dollar_value)
            total_dollar_value += exec_dollar_value
            
            # Count secured orders
            exec_secured = sum(1 for log in call_logs if log.secured_order)
            total_secured_orders += exec_secured
            
            # Get stage distribution
            for log in call_logs:
                if log.stage:
                    all_stage_counts[log.stage] = all_stage_counts.get(log.stage, 0) + 1
            
            # Calculate conversion rate for this executive (using exec-specific status counts)
            exec_closed_won = exec_status_counts.get("Closed Won", 0) + exec_status_counts.get("Won", 0)
            exec_conversion_rate = (exec_closed_won / exec_leads * 100) if exec_leads > 0 else 0
            
            manager_team_data.append({
                "user_id": exec_user.id,
                "user_name": exec_user.name,
                "user_email": exec_user.email,
                "total_leads": exec_leads,
                "total_calls": exec_calls,
                "conversion_rate": round(exec_conversion_rate, 2),
                "total_dollar_value": round(exec_dollar_value, 2),
                "secured_orders": exec_secured,
                "closed_won": exec_closed_won
            })
        
        # Calculate overall conversion rate
        total_closed_won = all_status_counts.get("Closed Won", 0) + all_status_counts.get("Won", 0)
        overall_conversion_rate = (total_closed_won / total_leads * 100) if total_leads > 0 else 0
        
        org_data.append({
            "manager_id": manager.id,
            "manager_name": manager.name,
            "manager_email": manager.email,
            "total_leads": total_leads,
            "total_calls": total_calls,
            "conversion_rate": round(overall_conversion_rate, 2),
            "total_dollar_value": round(total_dollar_value, 2),
            "secured_orders": total_secured_orders,
            "closed_won": total_closed_won,
            "status_counts": all_status_counts,
            "stage_distribution": all_stage_counts,
            "team": manager_team_data
        })
    
    return org_data



