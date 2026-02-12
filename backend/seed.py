"""
Seed script to populate database with dummy data
Run with: python seed.py
"""
from datetime import datetime, timedelta
from passlib.hash import bcrypt
from database import SessionLocal, Base, engine
from models.role import Role
from models.user import User
from models.lead import Lead
from models.form_field import FormField
from models.submission import Submission
from models.comment import Comment
from models.newsletter import Newsletter

# Create all tables
Base.metadata.create_all(bind=engine)

db = SessionLocal()

def seed_data():
    print("Seeding database with dummy data...")
    
    # Clear existing data (optional - comment out if you want to keep existing data)
    try:
        db.query(Comment).delete()
        db.query(Submission).delete()
        db.query(Newsletter).delete()
        db.query(FormField).delete()
        db.query(Lead).delete()
        db.query(User).delete()
        db.query(Role).delete()
        db.commit()
        print("[OK] Cleared existing data")
    except Exception as e:
        print(f"[NOTE] {e}")
        db.rollback()
    
    # 1. Seed Roles
    print("Creating roles...")
    roles_data = [
        {
            "role_name": "Super Admin", 
            "permissions": {
                "all": True,
                "leads": True, 
                "submissions": True, 
                "users": True, 
                "roles": True, 
                "reports": True,
                "settings": True,
                "configuration": True
            }
        },
        {
            "role_name": "Sales Manager", 
            "permissions": {
                "leads": True, 
                "submissions": True, 
                "reports": True,
                "lead_assignment": True,
                "lead_followup": True,
                "lead_status_update": True,
                "lead_comments": True
            }
        },
        {
            "role_name": "Marketing User", 
            "permissions": {
                "view": True,
                "leads": False,  # View-only for leads
                "submissions": True,  # Can view submissions
                "reports": True  # Can view reports
            }
        },
        {
            "role_name": "Read-Only User", 
            "permissions": {
                "view": True
            }
        },
    ]
    roles = []
    for role_data in roles_data:
        role = Role(**role_data)
        db.add(role)
        roles.append(role)
    db.commit()
    print(f"[OK] Created {len(roles)} roles")
    
    # 2. Seed Users
    print("Creating users...")
    # Create a mapping of role names to role objects
    role_map = {role.role_name: role for role in roles}
    
    users_data = [
        {"name": "Super Admin", "email": "admin@spars.com", "password": "admin123", "role_name": "Super Admin"},
        {"name": "Sales Manager", "email": "salesmanager@spars.com", "password": "manager123", "role_name": "Sales Manager"},
        {"name": "Marketing User", "email": "marketing@spars.com", "password": "marketing123", "role_name": "Marketing User"},
        {"name": "Read-Only User", "email": "readonly@spars.com", "password": "readonly123", "role_name": "Read-Only User"},
        {"name": "John Sales", "email": "john@spars.com", "password": "sales123", "role_name": "Sales Manager"},
    ]
    users = []
    for user_data in users_data:
        role_name = user_data.pop("role_name")
        password = user_data.pop("password")
        role = role_map.get(role_name)
        if not role:
            print(f"[WARNING] Role '{role_name}' not found, skipping user {user_data.get('email')}")
            continue
        hashed = bcrypt.hash(password)
        user = User(**user_data, hashed_password=hashed, role_id=role.id)
        db.add(user)
        users.append(user)
    db.commit()
    print(f"[OK] Created {len(users)} users")
    
    # 3. Seed Leads
    print("Creating leads...")
    leads_data = [
        {"name": "Acme Corp", "email": "contact@acme.com", "phone": "+1-555-0101", "company": "Acme Corporation", "source": "Website", "status": "New", "assigned": "Mike Sales"},
        {"name": "TechStart Inc", "email": "info@techstart.com", "phone": "+1-555-0102", "company": "TechStart Inc", "source": "Referral", "status": "Contacted", "assigned": "Tom Sales"},
        {"name": "Global Solutions", "email": "sales@globalsol.com", "phone": "+1-555-0103", "company": "Global Solutions Ltd", "source": "Trade Show", "status": "Qualified", "assigned": "Mike Sales"},
        {"name": "Digital Ventures", "email": "hello@digitalventures.com", "phone": "+1-555-0104", "company": "Digital Ventures", "source": "Website", "status": "Proposal", "assigned": "Sarah Manager"},
        {"name": "Innovate Co", "email": "contact@innovate.com", "phone": "+1-555-0105", "company": "Innovate Co", "source": "Email Campaign", "status": "New", "assigned": "Unassigned"},
        {"name": "Future Systems", "email": "info@futuresys.com", "phone": "+1-555-0106", "company": "Future Systems", "source": "Website", "status": "Contacted", "assigned": "Tom Sales"},
        {"name": "Smart Tech", "email": "sales@smarttech.com", "phone": "+1-555-0107", "company": "Smart Tech Solutions", "source": "Referral", "status": "Qualified", "assigned": "Mike Sales"},
        {"name": "NextGen Industries", "email": "contact@nextgen.com", "phone": "+1-555-0108", "company": "NextGen Industries", "source": "Trade Show", "status": "Won", "assigned": "Sarah Manager"},
    ]
    leads = []
    for lead_data in leads_data:
        lead = Lead(**lead_data)
        db.add(lead)
        leads.append(lead)
    db.commit()
    print(f"[OK] Created {len(leads)} leads")
    
    # 4. Seed Form Fields
    print("Creating form fields...")
    form_fields_data = [
        # Demo form fields
        {"form_type": "demo", "field_name": "company_size", "field_label": "Company Size", "field_type": "select", "required": True, "options": "1-10,11-50,51-200,201-500,500+"},
        {"form_type": "demo", "field_name": "industry", "field_label": "Industry", "field_type": "select", "required": True, "options": "Technology,Healthcare,Finance,Retail,Manufacturing,Other"},
        {"form_type": "demo", "field_name": "budget", "field_label": "Budget Range", "field_type": "select", "required": False, "options": "Under $10k,$10k-$50k,$50k-$100k,Over $100k"},
        {"form_type": "demo", "field_name": "timeline", "field_label": "Implementation Timeline", "field_type": "select", "required": False, "options": "Immediate,1-3 months,3-6 months,6+ months"},
        
        # Talk form fields
        {"form_type": "talk", "field_name": "topic", "field_label": "Topic of Interest", "field_type": "text", "required": True},
        {"form_type": "talk", "field_name": "duration", "field_label": "Preferred Duration", "field_type": "select", "required": False, "options": "15 min,30 min,45 min,60 min"},
        {"form_type": "talk", "field_name": "date_preference", "field_label": "Preferred Date", "field_type": "date", "required": False},
        
        # General form fields
        {"form_type": "general", "field_name": "inquiry_type", "field_label": "Type of Inquiry", "field_type": "select", "required": True, "options": "Product Info,Pricing,Support,Partnership,Other"},
        {"form_type": "general", "field_name": "urgency", "field_label": "Urgency Level", "field_type": "select", "required": False, "options": "Low,Medium,High,Critical"},
    ]
    for field_data in form_fields_data:
        field = FormField(**field_data)
        db.add(field)
    db.commit()
    print(f"[OK] Created {len(form_fields_data)} form fields")
    
    # 5. Seed Submissions
    print("Creating submissions...")
    base_date = datetime.now()
    submissions_data = [
        {
            "form_type": "demo",
            "name": "Alice Johnson",
            "email": "alice@acme.com",
            "company": "Acme Corporation",
            "submitted": base_date - timedelta(days=5),
            "status": "Converted",
            "lead_id": 1,
            "data": {"company_size": "51-200", "industry": "Technology", "budget": "$50k-$100k", "timeline": "3-6 months"}
        },
        {
            "form_type": "demo",
            "name": "Bob Smith",
            "email": "bob@techstart.com",
            "company": "TechStart Inc",
            "submitted": base_date - timedelta(days=3),
            "status": "New",
            "lead_id": None,
            "data": {"company_size": "11-50", "industry": "Technology", "budget": "$10k-$50k", "timeline": "1-3 months"}
        },
        {
            "form_type": "talk",
            "name": "Carol White",
            "email": "carol@globalsol.com",
            "company": "Global Solutions Ltd",
            "submitted": base_date - timedelta(days=7),
            "status": "Converted",
            "lead_id": 3,
            "data": {"topic": "Enterprise Solutions", "duration": "30 min", "date_preference": "2024-02-15"}
        },
        {
            "form_type": "talk",
            "name": "David Brown",
            "email": "david@digitalventures.com",
            "company": "Digital Ventures",
            "submitted": base_date - timedelta(days=2),
            "status": "New",
            "lead_id": None,
            "data": {"topic": "Product Demo", "duration": "45 min", "date_preference": "2024-02-20"}
        },
        {
            "form_type": "general",
            "name": "Emma Davis",
            "email": "emma@innovate.com",
            "company": "Innovate Co",
            "submitted": base_date - timedelta(days=4),
            "status": "New",
            "lead_id": None,
            "data": {"inquiry_type": "Pricing", "urgency": "Medium"}
        },
        {
            "form_type": "general",
            "name": "Frank Miller",
            "email": "frank@futuresys.com",
            "company": "Future Systems",
            "submitted": base_date - timedelta(days=1),
            "status": "New",
            "lead_id": None,
            "data": {"inquiry_type": "Product Info", "urgency": "Low"}
        },
        {
            "form_type": "demo",
            "name": "Grace Lee",
            "email": "grace@smarttech.com",
            "company": "Smart Tech Solutions",
            "submitted": base_date - timedelta(days=6),
            "status": "Converted",
            "lead_id": 7,
            "data": {"company_size": "201-500", "industry": "Finance", "budget": "Over $100k", "timeline": "Immediate"}
        },
        {
            "form_type": "talk",
            "name": "Henry Wilson",
            "email": "henry@nextgen.com",
            "company": "NextGen Industries",
            "submitted": base_date - timedelta(days=8),
            "status": "Converted",
            "lead_id": 8,
            "data": {"topic": "Implementation Strategy", "duration": "60 min", "date_preference": "2024-02-25"}
        },
    ]
    for sub_data in submissions_data:
        submission = Submission(**sub_data)
        db.add(submission)
    db.commit()
    print(f"[OK] Created {len(submissions_data)} submissions")
    
    # 6. Seed Comments
    print("Creating comments...")
    comments_data = [
        {"lead_id": 1, "text": "Initial contact made. Client interested in enterprise package.", "timestamp": base_date - timedelta(days=5, hours=2)},
        {"lead_id": 1, "text": "Follow-up call scheduled for next week.", "timestamp": base_date - timedelta(days=4, hours=10)},
        {"lead_id": 2, "text": "Referred by existing client. High priority.", "timestamp": base_date - timedelta(days=3, hours=5)},
        {"lead_id": 3, "text": "Qualified lead. Budget approved.", "timestamp": base_date - timedelta(days=7, hours=3)},
        {"lead_id": 3, "text": "Proposal sent. Awaiting response.", "timestamp": base_date - timedelta(days=6, hours=14)},
        {"lead_id": 4, "text": "Demo completed successfully.", "timestamp": base_date - timedelta(days=2, hours=11)},
        {"lead_id": 7, "text": "Contract signed! Deal closed.", "timestamp": base_date - timedelta(days=6, hours=9)},
        {"lead_id": 8, "text": "Won the deal! Great collaboration.", "timestamp": base_date - timedelta(days=8, hours=16)},
    ]
    for comment_data in comments_data:
        comment = Comment(**comment_data)
        db.add(comment)
    db.commit()
    print(f"[OK] Created {len(comments_data)} comments")
    
    # 7. Seed Newsletter
    print("Creating newsletter subscribers...")
    newsletter_data = [
        {"email": "subscriber1@example.com", "date": "2024-01-15", "active": True},
        {"email": "subscriber2@example.com", "date": "2024-01-20", "active": True},
        {"email": "subscriber3@example.com", "date": "2024-01-25", "active": True},
        {"email": "subscriber4@example.com", "date": "2024-02-01", "active": False},
        {"email": "subscriber5@example.com", "date": "2024-02-05", "active": True},
        {"email": "newsletter@acme.com", "date": "2024-01-10", "active": True},
        {"email": "info@techstart.com", "date": "2024-01-12", "active": True},
    ]
    for news_data in newsletter_data:
        newsletter = Newsletter(**news_data)
        db.add(newsletter)
    db.commit()
    print(f"[OK] Created {len(newsletter_data)} newsletter subscribers")
    
    print("\n[SUCCESS] Database seeding completed successfully!")
    print("\nSummary:")
    print(f"   - {len(roles)} Roles")
    print(f"   - {len(users)} Users")
    print(f"   - {len(leads)} Leads")
    print(f"   - {len(form_fields_data)} Form Fields")
    print(f"   - {len(submissions_data)} Submissions")
    print(f"   - {len(comments_data)} Comments")
    print(f"   - {len(newsletter_data)} Newsletter Subscribers")
    print("\nYou can now start the server with: python main.py")

if __name__ == "__main__":
    try:
        seed_data()
    except Exception as e:
        print(f"[ERROR] Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()

