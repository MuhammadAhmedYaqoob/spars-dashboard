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
    print("Seeding database with comprehensive dummy data...")
    
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
            "role_name": "Admin", 
            "hierarchy_level": 0,
            "permissions": {
                "all": True,
                "leads": True, 
                "submissions": True, 
                "users": True, 
                "roles": True, 
                "reports": True,
                "settings": True,
                "configuration": True,
                "convert_to_lead": True,
                "delete_submission": True
            }
        },
        {
            "role_name": "Sales Manager", 
            "hierarchy_level": 1,
            "permissions": {
                "leads": True, 
                "submissions": True, 
                "reports": True,
                "lead_assignment": True,
                "lead_followup": True,
                "lead_status_update": True,
                "lead_comments": True,
                "convert_to_lead": True,
                "delete_submission": True
            }
        },
        {
            "role_name": "Sales Executive", 
            "hierarchy_level": 2,
            "permissions": {
                "leads": True,
                "lead_status_update": True,
                "lead_comments": True,
                "lead_followup": True
            }
        },
        {
            "role_name": "Marketing", 
            "hierarchy_level": 3,
            "permissions": {
                "view": True,
                "leads": False,  # View-only for leads
                "submissions": True,  # Can view submissions
                "reports": True  # Can view reports
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
    
    # Create a mapping of role names to role objects
    role_map = {role.role_name: role for role in roles}
    
    # 2. Seed Users
    print("Creating users...")
    users_data = [
        # Admin
        {"name": "Admin", "email": "admin@spars.com", "password": "admin123", "role_name": "Admin", "manager_id": None},
        
        # Sales Managers
        {"name": "Sales Manager X", "email": "managerx@spars.com", "password": "manager123", "role_name": "Sales Manager", "manager_id": None},
        {"name": "Sales Manager Y", "email": "managery@spars.com", "password": "manager123", "role_name": "Sales Manager", "manager_id": None},
        {"name": "Sales Manager Z", "email": "managerz@spars.com", "password": "manager123", "role_name": "Sales Manager", "manager_id": None},
        
        # Marketing Users
        {"name": "Marketing User 1", "email": "marketing1@spars.com", "password": "marketing123", "role_name": "Marketing", "manager_id": None},
        {"name": "Marketing User 2", "email": "marketing2@spars.com", "password": "marketing123", "role_name": "Marketing", "manager_id": None},
    ]
    
    users = []
    manager_x = None
    manager_y = None
    manager_z = None
    
    for user_data in users_data:
        role_name = user_data.pop("role_name")
        password = user_data.pop("password")
        manager_id = user_data.pop("manager_id", None)
        role = role_map.get(role_name)
        if not role:
            print(f"[WARNING] Role '{role_name}' not found, skipping user {user_data.get('email')}")
            continue
        hashed = bcrypt.hash(password)
        user = User(**user_data, hashed_password=hashed, role_id=role.id, manager_id=manager_id)
        db.add(user)
        users.append(user)
        
        # Store manager references for later use
        if user.email == "managerx@spars.com":
            manager_x = user
        elif user.email == "managery@spars.com":
            manager_y = user
        elif user.email == "managerz@spars.com":
            manager_z = user
    
    db.commit()
    
    # Now create Sales Executives with proper manager assignments
    sales_executive_role = role_map.get("Sales Executive")
    if sales_executive_role:
        exec_users_data = [
            # Under Manager X
            {"name": "Sales Executive A1", "email": "execa1@spars.com", "password": "exec123", "manager": manager_x},
            {"name": "Sales Executive A2", "email": "execa2@spars.com", "password": "exec123", "manager": manager_x},
            {"name": "Sales Executive A3", "email": "execa3@spars.com", "password": "exec123", "manager": manager_x},
            # Under Manager Y
            {"name": "Sales Executive B1", "email": "execb1@spars.com", "password": "exec123", "manager": manager_y},
            {"name": "Sales Executive B2", "email": "execb2@spars.com", "password": "exec123", "manager": manager_y},
            # Under Manager Z
            {"name": "Sales Executive C1", "email": "execc1@spars.com", "password": "exec123", "manager": manager_z},
            {"name": "Sales Executive C2", "email": "execc2@spars.com", "password": "exec123", "manager": manager_z},
            {"name": "Sales Executive C3", "email": "execc3@spars.com", "password": "exec123", "manager": manager_z},
        ]
        
        for exec_data in exec_users_data:
            manager = exec_data.pop("manager")
            password = exec_data.pop("password")
            hashed = bcrypt.hash(password)
            exec_user = User(
                name=exec_data["name"],
                email=exec_data["email"],
                hashed_password=hashed,
                role_id=sales_executive_role.id,
                manager_id=manager.id if manager else None
            )
            db.add(exec_user)
            users.append(exec_user)
    
    db.commit()
    print(f"[OK] Created {len(users)} users")
    
    # Create user map for lead assignments
    user_map = {user.email: user for user in users}
    
    # 3. Seed Form Fields
    print("Creating form fields...")
    form_fields_data = [
        # Demo form fields
        {"form_type": "demo", "field_name": "company_size", "field_label": "Company Size", "field_type": "select", "required": True, "options": "1-10,11-50,51-200,201-500,500+"},
        {"form_type": "demo", "field_name": "industry", "field_label": "Industry", "field_type": "select", "required": True, "options": "Technology,Healthcare,Finance,Retail,Manufacturing,Education,Real Estate,Other"},
        {"form_type": "demo", "field_name": "budget", "field_label": "Budget Range", "field_type": "select", "required": False, "options": "Under $10k,$10k-$50k,$50k-$100k,$100k-$250k,Over $250k"},
        {"form_type": "demo", "field_name": "timeline", "field_label": "Implementation Timeline", "field_type": "select", "required": False, "options": "Immediate,1-3 months,3-6 months,6-12 months,12+ months"},
        {"form_type": "demo", "field_name": "use_case", "field_label": "Primary Use Case", "field_type": "text", "required": False},
        
        # Talk to Sales form fields (using "talk" to match frontend endpoint)
        {"form_type": "talk", "field_name": "topic", "field_label": "Topic of Interest", "field_type": "text", "required": True},
        {"form_type": "talk", "field_name": "duration", "field_label": "Preferred Duration", "field_type": "select", "required": False, "options": "15 min,30 min,45 min,60 min"},
        {"form_type": "talk", "field_name": "date_preference", "field_label": "Preferred Date", "field_type": "date", "required": False},
        {"form_type": "talk", "field_name": "time_preference", "field_label": "Preferred Time", "field_type": "select", "required": False, "options": "Morning (9-12),Afternoon (12-5),Evening (5-8)"},
        
        # General Inquiry form fields (using "general" to match frontend endpoint)
        {"form_type": "general", "field_name": "inquiry_type", "field_label": "Type of Inquiry", "field_type": "select", "required": True, "options": "Product Info,Pricing,Support,Partnership,Integration,Other"},
        {"form_type": "general", "field_name": "urgency", "field_label": "Urgency Level", "field_type": "select", "required": False, "options": "Low,Medium,High,Critical"},
        {"form_type": "general", "field_name": "message", "field_label": "Message", "field_type": "text", "required": False},
        
        # Brochure Download form fields
        {"form_type": "brochure", "field_name": "brochure_type", "field_label": "Brochure Type", "field_type": "select", "required": False, "options": "Product Overview,Feature Guide,Pricing Sheet,Case Studies,All"},
        {"form_type": "brochure", "field_name": "delivery_method", "field_label": "Delivery Method", "field_type": "select", "required": False, "options": "Email,Download,Physical Copy"},
        
        # Product Profile Download form fields (using "product-profile" to match frontend endpoint)
        {"form_type": "product-profile", "field_name": "product_interest", "field_label": "Product of Interest", "field_type": "select", "required": False, "options": "Core Platform,Analytics Module,Integration Suite,Mobile App,All Products"},
        {"form_type": "product-profile", "field_name": "download_format", "field_label": "Preferred Format", "field_type": "select", "required": False, "options": "PDF,Word Document,Excel Sheet"},
    ]
    for field_data in form_fields_data:
        field = FormField(**field_data)
        db.add(field)
    db.commit()
    print(f"[OK] Created {len(form_fields_data)} form fields")
    
    # 4. Seed Leads
    print("Creating leads...")
    base_date = datetime.now()
    
    # Get sales executives for assignment
    exec_a1 = user_map.get("execa1@spars.com")
    exec_a2 = user_map.get("execa2@spars.com")
    exec_a3 = user_map.get("execa3@spars.com")
    exec_b1 = user_map.get("execb1@spars.com")
    exec_b2 = user_map.get("execb2@spars.com")
    exec_c1 = user_map.get("execc1@spars.com")
    exec_c2 = user_map.get("execc2@spars.com")
    exec_c3 = user_map.get("execc3@spars.com")
    
    leads_data = [
        # Leads assigned to Manager X's team
        {"name": "Alice Johnson", "email": "alice@acmecorp.com", "phone": "+1-555-0101", "company": "Acme Corporation", "source_type": "Website", "source": "Request a Demo", "status": "New", "assigned_to": exec_a1.id if exec_a1 else None, "assigned": exec_a1.name if exec_a1 else "Unassigned", "created_by": manager_x.id if manager_x else None, "designation": "VP of Sales"},
        {"name": "Bob Smith", "email": "bob@techstart.io", "phone": "+1-555-0102", "company": "TechStart Inc", "source_type": "Referral", "source": "Partner Referral", "status": "Contacted", "assigned_to": exec_a1.id if exec_a1 else None, "assigned": exec_a1.name if exec_a1 else "Unassigned", "created_by": manager_x.id if manager_x else None, "designation": "CTO"},
        {"name": "Carol White", "email": "carol@globalsol.com", "phone": "+1-555-0103", "company": "Global Solutions Ltd", "source_type": "Trade Show", "source": "TechExpo 2024", "status": "Qualified", "assigned_to": exec_a2.id if exec_a2 else None, "assigned": exec_a2.name if exec_a2 else "Unassigned", "created_by": manager_x.id if manager_x else None, "designation": "Director of Operations"},
        {"name": "David Brown", "email": "david@digitalventures.com", "phone": "+1-555-0104", "company": "Digital Ventures", "source_type": "Website", "source": "Talk to Sales", "status": "Proposal Sent", "assigned_to": exec_a2.id if exec_a2 else None, "assigned": exec_a2.name if exec_a2 else "Unassigned", "created_by": manager_x.id if manager_x else None, "designation": "CEO"},
        {"name": "Emma Davis", "email": "emma@innovate.co", "phone": "+1-555-0105", "company": "Innovate Co", "source_type": "Email Campaign", "source": "Q1 Campaign", "status": "New", "assigned_to": exec_a3.id if exec_a3 else None, "assigned": exec_a3.name if exec_a3 else "Unassigned", "created_by": manager_x.id if manager_x else None, "designation": "Marketing Manager"},
        
        # Leads assigned to Manager Y's team
        {"name": "Frank Miller", "email": "frank@futuresys.com", "phone": "+1-555-0106", "company": "Future Systems", "source_type": "Website", "source": "General Inquiry", "status": "Contacted", "assigned_to": exec_b1.id if exec_b1 else None, "assigned": exec_b1.name if exec_b1 else "Unassigned", "created_by": manager_y.id if manager_y else None, "designation": "IT Director"},
        {"name": "Grace Lee", "email": "grace@smarttech.com", "phone": "+1-555-0107", "company": "Smart Tech Solutions", "source_type": "Referral", "source": "Customer Referral", "status": "Qualified", "assigned_to": exec_b1.id if exec_b1 else None, "assigned": exec_b1.name if exec_b1 else "Unassigned", "created_by": manager_y.id if manager_y else None, "designation": "VP of Technology"},
        {"name": "Henry Wilson", "email": "henry@nextgen.com", "phone": "+1-555-0108", "company": "NextGen Industries", "source_type": "Trade Show", "source": "Innovation Summit", "status": "Closed Won", "assigned_to": exec_b2.id if exec_b2 else None, "assigned": exec_b2.name if exec_b2 else "Unassigned", "created_by": manager_y.id if manager_y else None, "designation": "Operations Manager"},
        {"name": "Ivy Chen", "email": "ivy@cloudscale.com", "phone": "+1-555-0109", "company": "CloudScale Technologies", "source_type": "Website", "source": "Brochure Download", "status": "New", "assigned_to": exec_b2.id if exec_b2 else None, "assigned": exec_b2.name if exec_b2 else "Unassigned", "created_by": manager_y.id if manager_y else None, "designation": "CFO"},
        
        # Leads assigned to Manager Z's team
        {"name": "Jack Taylor", "email": "jack@datadrive.com", "phone": "+1-555-0110", "company": "DataDrive Solutions", "source_type": "LinkedIn", "source": "LinkedIn Ad", "status": "Contacted", "assigned_to": exec_c1.id if exec_c1 else None, "assigned": exec_c1.name if exec_c1 else "Unassigned", "created_by": manager_z.id if manager_z else None, "designation": "Data Scientist"},
        {"name": "Karen Martinez", "email": "karen@enterpriseplus.com", "phone": "+1-555-0111", "company": "Enterprise Plus", "source_type": "Website", "source": "Product Profile Download", "status": "Qualified", "assigned_to": exec_c1.id if exec_c1 else None, "assigned": exec_c1.name if exec_c1 else "Unassigned", "created_by": manager_z.id if manager_z else None, "designation": "VP of Engineering"},
        {"name": "Liam Anderson", "email": "liam@startupx.com", "phone": "+1-555-0112", "company": "StartupX", "source_type": "Social Media", "source": "Twitter Campaign", "status": "Proposal Sent", "assigned_to": exec_c2.id if exec_c2 else None, "assigned": exec_c2.name if exec_c2 else "Unassigned", "created_by": manager_z.id if manager_z else None, "designation": "Founder"},
        {"name": "Mia Thompson", "email": "mia@bizgrowth.com", "phone": "+1-555-0113", "company": "BizGrowth Inc", "source_type": "Webinar", "source": "Q1 Webinar Series", "status": "In Discussion", "assigned_to": exec_c2.id if exec_c2 else None, "assigned": exec_c2.name if exec_c2 else "Unassigned", "created_by": manager_z.id if manager_z else None, "designation": "COO"},
        {"name": "Noah Garcia", "email": "noah@techflow.com", "phone": "+1-555-0114", "company": "TechFlow Systems", "source_type": "Cold Call", "source": "Outbound Campaign", "status": "New", "assigned_to": exec_c3.id if exec_c3 else None, "assigned": exec_c3.name if exec_c3 else "Unassigned", "created_by": manager_z.id if manager_z else None, "designation": "IT Manager"},
        {"name": "Olivia Rodriguez", "email": "olivia@scaleup.com", "phone": "+1-555-0115", "company": "ScaleUp Ventures", "source_type": "Partner", "source": "Partner Channel", "status": "Closed Won", "assigned_to": exec_c3.id if exec_c3 else None, "assigned": exec_c3.name if exec_c3 else "Unassigned", "created_by": manager_z.id if manager_z else None, "designation": "VP of Sales"},
        
        # Unassigned leads
        {"name": "Paul Jackson", "email": "paul@newco.com", "phone": "+1-555-0116", "company": "NewCo Industries", "source_type": "Website", "source": "Request a Demo", "status": "New", "assigned_to": None, "assigned": "Unassigned", "created_by": manager_x.id if manager_x else None, "designation": "CEO"},
        {"name": "Quinn Williams", "email": "quinn@innovatehub.com", "phone": "+1-555-0117", "company": "InnovateHub", "source_type": "Email Campaign", "source": "Newsletter Campaign", "status": "New", "assigned_to": None, "assigned": "Unassigned", "created_by": manager_y.id if manager_y else None, "designation": "CTO"},
    ]
    
    leads = []
    for lead_data in leads_data:
        lead = Lead(**lead_data)
        db.add(lead)
        leads.append(lead)
    db.commit()
    print(f"[OK] Created {len(leads)} leads")
    
    # 5. Seed Submissions
    # IMPORTANT: The /submissions page uses the submissions router (exact match on form_type).
    # The dashboard uses the form-submissions router with DIFFERENT form_type strings:
    #   - /submissions page calls: demo, talk, general, product-profile, brochure
    #   - Dashboard calls: demo, talk_to_sales, contact, product_profile, brochure
    # For "talk_to_sales", the form-submissions router maps to IN ('talk', 'talk_to_sales') so "talk" works for both.
    # For "contact" vs "general" and "product_profile" vs "product-profile", there is NO alias mapping,
    # so we need entries with BOTH form_type values to make both pages show data.
    print("Creating submissions...")
    submissions_data = [
        # ============================================================
        # Demo submissions (form_type="demo" works for both pages)
        # ============================================================
        {
            "form_type": "demo",
            "name": "Alice Johnson",
            "email": "alice@acmecorp.com",
            "company": "Acme Corporation",
            "submitted": base_date - timedelta(days=5),
            "status": "Converted",
            "lead_id": 1,
            "data": {"company_size": "51-200", "industry": "Technology", "budget": "$50k-$100k", "timeline": "3-6 months", "use_case": "Sales automation and CRM integration"}
        },
        {
            "form_type": "demo",
            "name": "Bob Smith",
            "email": "bob@techstart.io",
            "company": "TechStart Inc",
            "submitted": base_date - timedelta(days=3),
            "status": "New",
            "lead_id": None,
            "data": {"company_size": "11-50", "industry": "Technology", "budget": "$10k-$50k", "timeline": "1-3 months", "use_case": "Lead management system"}
        },
        {
            "form_type": "demo",
            "name": "Paul Jackson",
            "email": "paul@newco.com",
            "company": "NewCo Industries",
            "submitted": base_date - timedelta(days=2),
            "status": "New",
            "lead_id": None,
            "data": {"company_size": "201-500", "industry": "Manufacturing", "budget": "$100k-$250k", "timeline": "6-12 months", "use_case": "Enterprise-wide CRM deployment"}
        },
        {
            "form_type": "demo",
            "name": "Sarah Connor",
            "email": "sarah@cybertech.com",
            "company": "CyberTech Solutions",
            "submitted": base_date - timedelta(days=1),
            "status": "New",
            "lead_id": None,
            "data": {"company_size": "500+", "industry": "Technology", "budget": "Over $250k", "timeline": "Immediate", "use_case": "Security-focused CRM implementation"}
        },
        {
            "form_type": "demo",
            "name": "Tom Anderson",
            "email": "tom@matrixsys.com",
            "company": "Matrix Systems",
            "submitted": base_date - timedelta(days=4),
            "status": "New",
            "lead_id": None,
            "data": {"company_size": "51-200", "industry": "Finance", "budget": "$50k-$100k", "timeline": "3-6 months", "use_case": "Financial services CRM"}
        },
        
        # ============================================================
        # Talk to Sales submissions (form_type="talk" works for both pages)
        # /submissions page: exact match "talk"
        # Dashboard: calls "talk_to_sales" which maps to IN ('talk', 'talk_to_sales')
        # ============================================================
        {
            "form_type": "talk",
            "name": "David Brown",
            "email": "david@digitalventures.com",
            "company": "Digital Ventures",
            "submitted": base_date - timedelta(days=7),
            "status": "Converted",
            "lead_id": 4,
            "data": {"topic": "Enterprise Solutions", "duration": "30 min", "date_preference": "2024-02-15", "time_preference": "Afternoon (12-5)"}
        },
        {
            "form_type": "talk",
            "name": "Emma Davis",
            "email": "emma@innovate.co",
            "company": "Innovate Co",
            "submitted": base_date - timedelta(days=2),
            "status": "New",
            "lead_id": None,
            "data": {"topic": "Product Demo", "duration": "45 min", "date_preference": "2024-02-20", "time_preference": "Morning (9-12)"}
        },
        {
            "form_type": "talk",
            "name": "Karen Martinez",
            "email": "karen@enterpriseplus.com",
            "company": "Enterprise Plus",
            "submitted": base_date - timedelta(days=6),
            "status": "Converted",
            "lead_id": 12,
            "data": {"topic": "Implementation Strategy", "duration": "60 min", "date_preference": "2024-02-25", "time_preference": "Afternoon (12-5)"}
        },
        {
            "form_type": "talk",
            "name": "Michael Chang",
            "email": "michael@cloudops.com",
            "company": "CloudOps Inc",
            "submitted": base_date - timedelta(days=1),
            "status": "New",
            "lead_id": None,
            "data": {"topic": "Integration Options", "duration": "30 min", "date_preference": "2024-02-18", "time_preference": "Morning (9-12)"}
        },
        {
            "form_type": "talk",
            "name": "Diana Prince",
            "email": "diana@wondertech.com",
            "company": "WonderTech Inc",
            "submitted": base_date - timedelta(days=3),
            "status": "New",
            "lead_id": None,
            "data": {"topic": "Pricing Discussion", "duration": "45 min", "date_preference": "2024-03-01", "time_preference": "Morning (9-12)"}
        },
        
        # ============================================================
        # General Inquiry submissions
        # /submissions page calls "general" → exact match "general"
        # Dashboard calls "contact" → exact match "contact"
        # Need BOTH form_type values in DB for both pages to show data
        # ============================================================
        # --- Entries with form_type="general" (for /submissions page) ---
        {
            "form_type": "general",
            "name": "Frank Miller",
            "email": "frank@futuresys.com",
            "company": "Future Systems",
            "submitted": base_date - timedelta(days=4),
            "status": "New",
            "lead_id": None,
            "data": {"inquiry_type": "Pricing", "urgency": "Medium", "message": "Looking for pricing information for 50-user license"}
        },
        {
            "form_type": "general",
            "name": "Grace Lee",
            "email": "grace@smarttech.com",
            "company": "Smart Tech Solutions",
            "submitted": base_date - timedelta(days=1),
            "status": "New",
            "lead_id": None,
            "data": {"inquiry_type": "Product Info", "urgency": "Low", "message": "Interested in learning more about your analytics features"}
        },
        {
            "form_type": "general",
            "name": "Quinn Williams",
            "email": "quinn@innovatehub.com",
            "company": "InnovateHub",
            "submitted": base_date - timedelta(days=3),
            "status": "New",
            "lead_id": None,
            "data": {"inquiry_type": "Support", "urgency": "High", "message": "Need assistance with API integration"}
        },
        {
            "form_type": "general",
            "name": "Rachel Green",
            "email": "rachel@techcorp.com",
            "company": "TechCorp International",
            "submitted": base_date - timedelta(days=2),
            "status": "New",
            "lead_id": None,
            "data": {"inquiry_type": "Partnership", "urgency": "Medium", "message": "Interested in partnership opportunities"}
        },
        {
            "form_type": "general",
            "name": "Steve Rogers",
            "email": "steve@avengers.com",
            "company": "Avengers Corp",
            "submitted": base_date - timedelta(days=1),
            "status": "New",
            "lead_id": None,
            "data": {"inquiry_type": "Integration", "urgency": "Medium", "message": "Need help with system integration"}
        },
        # --- Entries with form_type="contact" (for Dashboard) ---
        {
            "form_type": "contact",
            "name": "Walter Bishop",
            "email": "walter@fringe.com",
            "company": "Fringe Division",
            "submitted": base_date - timedelta(days=5),
            "status": "New",
            "lead_id": None,
            "data": {"inquiry_type": "Product Info", "urgency": "High", "message": "Need info about your core platform capabilities"}
        },
        {
            "form_type": "contact",
            "name": "Peter Parker",
            "email": "peter@dailybugle.com",
            "company": "Daily Bugle Media",
            "submitted": base_date - timedelta(days=3),
            "status": "New",
            "lead_id": None,
            "data": {"inquiry_type": "Pricing", "urgency": "Medium", "message": "Requesting pricing for media industry solution"}
        },
        {
            "form_type": "contact",
            "name": "Bruce Wayne",
            "email": "bruce@waynetech.com",
            "company": "Wayne Technologies",
            "submitted": base_date - timedelta(days=2),
            "status": "New",
            "lead_id": None,
            "data": {"inquiry_type": "Partnership", "urgency": "High", "message": "Exploring strategic partnership opportunities"}
        },
        {
            "form_type": "contact",
            "name": "Clark Kent",
            "email": "clark@dailyplanet.com",
            "company": "Daily Planet Corp",
            "submitted": base_date - timedelta(days=1),
            "status": "New",
            "lead_id": None,
            "data": {"inquiry_type": "Support", "urgency": "Low", "message": "General question about onboarding process"}
        },
        {
            "form_type": "contact",
            "name": "Tony Stark",
            "email": "tony@starkindustries.com",
            "company": "Stark Industries",
            "submitted": base_date - timedelta(days=4),
            "status": "New",
            "lead_id": None,
            "data": {"inquiry_type": "Integration", "urgency": "High", "message": "Need integration with existing ERP system"}
        },
        
        # ============================================================
        # Brochure Download submissions (form_type="brochure" works for both pages)
        # ============================================================
        {
            "form_type": "brochure",
            "name": "Ivy Chen",
            "email": "ivy@cloudscale.com",
            "company": "CloudScale Technologies",
            "submitted": base_date - timedelta(days=5),
            "status": "Converted",
            "lead_id": 9,
            "data": {"brochure_type": "Product Overview", "delivery_method": "Email"}
        },
        {
            "form_type": "brochure",
            "name": "Jack Taylor",
            "email": "jack@datadrive.com",
            "company": "DataDrive Solutions",
            "submitted": base_date - timedelta(days=3),
            "status": "New",
            "lead_id": None,
            "data": {"brochure_type": "All", "delivery_method": "Email"}
        },
        {
            "form_type": "brochure",
            "name": "Lisa Park",
            "email": "lisa@innovateplus.com",
            "company": "InnovatePlus",
            "submitted": base_date - timedelta(days=1),
            "status": "New",
            "lead_id": None,
            "data": {"brochure_type": "Case Studies", "delivery_method": "Download"}
        },
        {
            "form_type": "brochure",
            "name": "Mark Johnson",
            "email": "mark@enterprisex.com",
            "company": "EnterpriseX",
            "submitted": base_date - timedelta(days=4),
            "status": "New",
            "lead_id": None,
            "data": {"brochure_type": "Pricing Sheet", "delivery_method": "Email"}
        },
        {
            "form_type": "brochure",
            "name": "Amy Watson",
            "email": "amy@brightpath.com",
            "company": "BrightPath Solutions",
            "submitted": base_date - timedelta(days=2),
            "status": "New",
            "lead_id": None,
            "data": {"brochure_type": "Feature Guide", "delivery_method": "Download"}
        },
        
        # ============================================================
        # Product Profile Download submissions
        # /submissions page calls "product-profile" → exact match "product-profile"
        # Dashboard calls "product_profile" → exact match "product_profile"
        # Need BOTH form_type values in DB for both pages to show data
        # ============================================================
        # --- Entries with form_type="product-profile" (for /submissions page) ---
        {
            "form_type": "product-profile",
            "name": "Karen Martinez",
            "email": "karen@enterpriseplus.com",
            "company": "Enterprise Plus",
            "submitted": base_date - timedelta(days=6),
            "status": "Converted",
            "lead_id": 12,
            "data": {"product_interest": "Core Platform", "download_format": "PDF"}
        },
        {
            "form_type": "product-profile",
            "name": "Liam Anderson",
            "email": "liam@startupx.com",
            "company": "StartupX",
            "submitted": base_date - timedelta(days=2),
            "status": "New",
            "lead_id": None,
            "data": {"product_interest": "Analytics Module", "download_format": "PDF"}
        },
        {
            "form_type": "product-profile",
            "name": "Nancy White",
            "email": "nancy@techsolutions.com",
            "company": "TechSolutions Group",
            "submitted": base_date - timedelta(days=1),
            "status": "New",
            "lead_id": None,
            "data": {"product_interest": "All Products", "download_format": "Word Document"}
        },
        {
            "form_type": "product-profile",
            "name": "Oscar Martinez",
            "email": "oscar@cloudtech.com",
            "company": "CloudTech Systems",
            "submitted": base_date - timedelta(days=3),
            "status": "New",
            "lead_id": None,
            "data": {"product_interest": "Integration Suite", "download_format": "PDF"}
        },
        {
            "form_type": "product-profile",
            "name": "Patricia Kim",
            "email": "patricia@datasys.com",
            "company": "DataSys Solutions",
            "submitted": base_date - timedelta(days=2),
            "status": "New",
            "lead_id": None,
            "data": {"product_interest": "Mobile App", "download_format": "PDF"}
        },
        # --- Entries with form_type="product_profile" (for Dashboard) ---
        {
            "form_type": "product_profile",
            "name": "Natasha Romanoff",
            "email": "natasha@shieldtech.com",
            "company": "Shield Technologies",
            "submitted": base_date - timedelta(days=5),
            "status": "New",
            "lead_id": None,
            "data": {"product_interest": "Core Platform", "download_format": "PDF"}
        },
        {
            "form_type": "product_profile",
            "name": "Barry Allen",
            "email": "barry@starlabs.com",
            "company": "Star Labs Inc",
            "submitted": base_date - timedelta(days=4),
            "status": "New",
            "lead_id": None,
            "data": {"product_interest": "Analytics Module", "download_format": "PDF"}
        },
        {
            "form_type": "product_profile",
            "name": "Hank Pym",
            "email": "hank@pymtech.com",
            "company": "Pym Technologies",
            "submitted": base_date - timedelta(days=3),
            "status": "New",
            "lead_id": None,
            "data": {"product_interest": "Integration Suite", "download_format": "Word Document"}
        },
        {
            "form_type": "product_profile",
            "name": "Wanda Maximoff",
            "email": "wanda@hexcorp.com",
            "company": "Hex Corporation",
            "submitted": base_date - timedelta(days=2),
            "status": "New",
            "lead_id": None,
            "data": {"product_interest": "Mobile App", "download_format": "PDF"}
        },
        {
            "form_type": "product_profile",
            "name": "Victor Stone",
            "email": "victor@cyborgtech.com",
            "company": "Cyborg Technologies",
            "submitted": base_date - timedelta(days=1),
            "status": "New",
            "lead_id": None,
            "data": {"product_interest": "All Products", "download_format": "Excel Sheet"}
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
        {"lead_id": 1, "text": "Initial contact made. Client interested in enterprise package. Very responsive to emails.", "timestamp": base_date - timedelta(days=5, hours=2)},
        {"lead_id": 1, "text": "Follow-up call scheduled for next week. Discussing implementation timeline.", "timestamp": base_date - timedelta(days=4, hours=10)},
        {"lead_id": 2, "text": "Referred by existing client. High priority lead. Budget approved.", "timestamp": base_date - timedelta(days=3, hours=5)},
        {"lead_id": 2, "text": "Sent product documentation. Awaiting technical team review.", "timestamp": base_date - timedelta(days=2, hours=14)},
        {"lead_id": 3, "text": "Qualified lead. Budget approved. Decision maker identified.", "timestamp": base_date - timedelta(days=7, hours=3)},
        {"lead_id": 3, "text": "Proposal sent. Awaiting response. Follow-up scheduled.", "timestamp": base_date - timedelta(days=6, hours=14)},
        {"lead_id": 4, "text": "Demo completed successfully. Client impressed with analytics features.", "timestamp": base_date - timedelta(days=2, hours=11)},
        {"lead_id": 4, "text": "Pricing discussion scheduled. Very interested in moving forward.", "timestamp": base_date - timedelta(days=1, hours=9)},
        {"lead_id": 7, "text": "Contract signed! Deal closed. Great collaboration with the team.", "timestamp": base_date - timedelta(days=6, hours=9)},
        {"lead_id": 8, "text": "Won the deal! Great collaboration. Implementation starting next month.", "timestamp": base_date - timedelta(days=8, hours=16)},
        {"lead_id": 8, "text": "Kickoff meeting scheduled. All stakeholders confirmed.", "timestamp": base_date - timedelta(days=7, hours=10)},
        {"lead_id": 10, "text": "Initial discovery call completed. Understanding their requirements.", "timestamp": base_date - timedelta(days=5, hours=15)},
        {"lead_id": 11, "text": "Technical evaluation in progress. Sent API documentation.", "timestamp": base_date - timedelta(days=4, hours=11)},
        {"lead_id": 12, "text": "Proposal submitted. Waiting for procurement approval.", "timestamp": base_date - timedelta(days=3, hours=13)},
        {"lead_id": 13, "text": "Contract negotiation in progress. Terms being finalized.", "timestamp": base_date - timedelta(days=2, hours=16)},
        {"lead_id": 14, "text": "Deal closed successfully! Implementation team assigned.", "timestamp": base_date - timedelta(days=1, hours=14)},
        {"lead_id": 15, "text": "New lead from cold outreach. Initial qualification call scheduled.", "timestamp": base_date - timedelta(days=1, hours=10)},
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
        {"email": "newsletter@acmecorp.com", "date": "2024-01-10", "active": True},
        {"email": "info@techstart.io", "date": "2024-01-12", "active": True},
        {"email": "marketing@globalsol.com", "date": "2024-01-18", "active": True},
        {"email": "contact@digitalventures.com", "date": "2024-01-22", "active": True},
        {"email": "news@innovate.co", "date": "2024-01-28", "active": True},
        {"email": "updates@futuresys.com", "date": "2024-02-02", "active": False},
        {"email": "newsletter@smarttech.com", "date": "2024-02-08", "active": True},
        {"email": "subscribe@nextgen.com", "date": "2024-02-10", "active": True},
        {"email": "alerts@cloudscale.com", "date": "2024-02-12", "active": True},
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
    print("\nTest Credentials:")
    print("   Admin: admin@spars.com / admin123")
    print("   Sales Manager X: managerx@spars.com / manager123")
    print("   Sales Manager Y: managery@spars.com / manager123")
    print("   Sales Manager Z: managerz@spars.com / manager123")
    print("   Sales Executives: execa1@spars.com, execa2@spars.com, execa3@spars.com (Manager X)")
    print("                     execb1@spars.com, execb2@spars.com (Manager Y)")
    print("                     execc1@spars.com, execc2@spars.com, execc3@spars.com (Manager Z)")
    print("                     Password: exec123")
    print("   Marketing: marketing1@spars.com, marketing2@spars.com / marketing123")
    print("\nYou can now start the server with: python main.py")

if __name__ == "__main__":
    try:
        seed_data()
    except Exception as e:
        print(f"[ERROR] Error seeding database: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise
    finally:
        db.close()
