"""
Comprehensive Seed script to populate database with thorough dummy data
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
from models.activity_log import ActivityLog
from models.tag import Tag
from models.entity_tag import EntityTag
from models.reminder import Reminder
from models.call_log import CallLog

# Create all tables
Base.metadata.create_all(bind=engine)

db = SessionLocal()

def seed_data():
    print("=" * 60)
    print("Seeding database with comprehensive dummy data...")
    print("=" * 60)
    
    # Clear existing data
    print("\n[1/10] Clearing existing data...")
    try:
        db.query(EntityTag).delete()
        db.query(Tag).delete()
        db.query(CallLog).delete()
        db.query(Reminder).delete()
        db.query(ActivityLog).delete()
        db.query(Comment).delete()
        db.query(Submission).delete()
        db.query(Newsletter).delete()
        db.query(FormField).delete()
        db.query(Lead).delete()
        db.query(User).delete()
        db.query(Role).delete()
        db.commit()
        print("[OK] Cleared all existing data")
    except Exception as e:
        print(f"[WARNING] {e}")
        db.rollback()
    
    # 1. Seed Roles
    print("\n[2/10] Creating roles...")
    roles_data = [
        {
            "role_name": "Admin", 
            "hierarchy_level": 0,
            "permissions": {
                "all": True,
                "submissions": True,
                "leads": True,
                "lead_assignment": True,
                "lead_status_update": True,
                "lead_comments": True,
                "reminders": True,
                "reports": True,
                "users": True,
                "email_templates": True,
                "delete_submission": True
            }
        },
        {
            "role_name": "Sales Manager", 
            "hierarchy_level": 1,
            "permissions": {
                "submissions": True,
                "leads": True,
                "lead_assignment": True,
                "lead_status_update": True,
                "lead_comments": True,
                "reminders": True,
                "reports": True,
                "email_templates": True,
                "convert_to_lead": True
            }
        },
        {
            "role_name": "Sales Executive", 
            "hierarchy_level": 2,
            "permissions": {
                "leads": True,
                "lead_status_update": True,
                "lead_comments": True,
                "reminders": True,
                "convert_to_lead": True
            }
        },
        {
            "role_name": "Marketing", 
            "hierarchy_level": 3,
            "permissions": {
                "submissions": True,
                "convert_to_lead": True,
                "reports": True,
                "email_templates": True
            }
        },
    ]
    roles = []
    for role_data in roles_data:
        role = Role(**role_data)
        db.add(role)
        roles.append(role)
    db.commit()
    role_map = {role.role_name: role for role in roles}
    print(f"[OK] Created {len(roles)} roles")
    
    # 2. Seed Users with hierarchy
    print("\n[3/10] Creating users with hierarchy...")
    base_date = datetime.now()
    
    # Admin
    admin = User(
        name="Admin User",
        email="admin@spars.com",
        hashed_password=bcrypt.hash("admin123"),
        role_id=role_map["Admin"].id,
        manager_id=None
    )
    db.add(admin)
    db.flush()
    
    # Sales Managers
    managers = []
    manager_names = ["Sales Manager X", "Sales Manager Y", "Sales Manager Z"]
    for i, name in enumerate(manager_names):
        manager = User(
            name=name,
            email=f"manager{chr(88+i).lower()}@spars.com",  # managerx@, managery@, managerz@
            hashed_password=bcrypt.hash("manager123"),
            role_id=role_map["Sales Manager"].id,
            manager_id=None
        )
        db.add(manager)
        db.flush()
        managers.append(manager)
    
    # Sales Executives (2-3 per manager)
    executives = []
    exec_names = [
        ["Sales Executive A1", "Sales Executive A2", "Sales Executive A3"],  # Under Manager X
        ["Sales Executive B1", "Sales Executive B2"],  # Under Manager Y
        ["Sales Executive C1", "Sales Executive C2", "Sales Executive C3"]  # Under Manager Z
    ]
    
    for manager_idx, exec_name_list in enumerate(exec_names):
        for exec_idx, exec_name in enumerate(exec_name_list):
            # Generate lowercase email: execa1, execa2, execa3, execb1, execb2, execc1, execc2, execc3
            manager_letter = chr(97 + manager_idx)  # 'a', 'b', 'c' (lowercase)
            exec_user = User(
                name=exec_name,
                email=f"exec{manager_letter}{exec_idx+1}@spars.com",
                hashed_password=bcrypt.hash("exec123"),
                role_id=role_map["Sales Executive"].id,
                manager_id=managers[manager_idx].id
            )
            db.add(exec_user)
            db.flush()
            executives.append(exec_user)
    
    # Marketing Users
    marketing1 = User(
        name="Marketing User 1",
        email="marketing1@spars.com",
        hashed_password=bcrypt.hash("marketing123"),
        role_id=role_map["Marketing"].id,
        manager_id=None
    )
    marketing2 = User(
        name="Marketing User 2",
        email="marketing2@spars.com",
        hashed_password=bcrypt.hash("marketing123"),
        role_id=role_map["Marketing"].id,
        manager_id=None
    )
    db.add(marketing1)
    db.add(marketing2)
    db.commit()
    
    all_users = [admin] + managers + executives + [marketing1, marketing2]
    print(f"[OK] Created {len(all_users)} users:")
    print(f"   - 1 Admin")
    print(f"   - {len(managers)} Sales Managers")
    print(f"   - {len(executives)} Sales Executives")
    print(f"   - 2 Marketing Users")
    
    # 3. Seed Form Fields
    print("\n[4/10] Creating form fields...")
    form_fields_data = [
        # Contact (General Inquiry) form fields
        {"form_type": "contact", "field_name": "first_name", "field_label": "First Name", "field_type": "text", "required": True},
        {"form_type": "contact", "field_name": "last_name", "field_label": "Last Name", "field_type": "text", "required": True},
        {"form_type": "contact", "field_name": "phone", "field_label": "Phone", "field_type": "text", "required": False},
        {"form_type": "contact", "field_name": "company", "field_label": "Company", "field_type": "text", "required": False},
        {"form_type": "contact", "field_name": "company_size", "field_label": "Company Size", "field_type": "select", "required": False, "options": "1-10,11-50,51-200,201-500,500+"},
        {"form_type": "contact", "field_name": "message", "field_label": "Message", "field_type": "text", "required": True},
        {"form_type": "contact", "field_name": "inquiry_type", "field_label": "Type of Inquiry", "field_type": "select", "required": True, "options": "Product Info,Pricing,Support,Partnership,Other"},
        
        # Demo (Request Demo) form fields
        {"form_type": "demo", "field_name": "first_name", "field_label": "First Name", "field_type": "text", "required": True},
        {"form_type": "demo", "field_name": "last_name", "field_label": "Last Name", "field_type": "text", "required": True},
        {"form_type": "demo", "field_name": "phone", "field_label": "Phone", "field_type": "text", "required": True},
        {"form_type": "demo", "field_name": "company_name", "field_label": "Company Name", "field_type": "text", "required": True},
        {"form_type": "demo", "field_name": "company_size", "field_label": "Company Size", "field_type": "select", "required": False, "options": "1-10,11-50,51-200,201-500,500+"},
        {"form_type": "demo", "field_name": "preferred_demo_date", "field_label": "Preferred Demo Date", "field_type": "date", "required": True},
        {"form_type": "demo", "field_name": "preferred_demo_time", "field_label": "Preferred Demo Time", "field_type": "text", "required": False},
        {"form_type": "demo", "field_name": "additional_information", "field_label": "Additional Information", "field_type": "text", "required": False},
        {"form_type": "demo", "field_name": "current_system", "field_label": "Current System", "field_type": "text", "required": False},
        {"form_type": "demo", "field_name": "warehouses", "field_label": "Number of Warehouses", "field_type": "number", "required": False},
        {"form_type": "demo", "field_name": "users", "field_label": "Number of Users", "field_type": "number", "required": False},
        {"form_type": "demo", "field_name": "requirements", "field_label": "Requirements", "field_type": "text", "required": False},
        {"form_type": "demo", "field_name": "timeline", "field_label": "Implementation Timeline", "field_type": "select", "required": False, "options": "Immediate,1-3 months,3-6 months,6+ months"},
        
        # Brochure form fields
        {"form_type": "brochure", "field_name": "first_name", "field_label": "First Name", "field_type": "text", "required": True},
        {"form_type": "brochure", "field_name": "last_name", "field_label": "Last Name", "field_type": "text", "required": True},
        {"form_type": "brochure", "field_name": "email", "field_label": "Email", "field_type": "text", "required": True},
        {"form_type": "brochure", "field_name": "company", "field_label": "Company", "field_type": "text", "required": True},
        {"form_type": "brochure", "field_name": "phone", "field_label": "Phone", "field_type": "text", "required": False},
        {"form_type": "brochure", "field_name": "job_role", "field_label": "Job Role", "field_type": "text", "required": False},
        {"form_type": "brochure", "field_name": "agreed_to_marketing", "field_label": "Agreed to Marketing", "field_type": "select", "required": False, "options": "true,false"},
        
        # Product Profile form fields
        {"form_type": "product-profile", "field_name": "first_name", "field_label": "First Name", "field_type": "text", "required": True},
        {"form_type": "product-profile", "field_name": "last_name", "field_label": "Last Name", "field_type": "text", "required": True},
        {"form_type": "product-profile", "field_name": "phone", "field_label": "Phone", "field_type": "text", "required": True},
        {"form_type": "product-profile", "field_name": "job_title", "field_label": "Job Title", "field_type": "text", "required": False},
        {"form_type": "product-profile", "field_name": "company_name", "field_label": "Company Name", "field_type": "text", "required": True},
        {"form_type": "product-profile", "field_name": "industry", "field_label": "Industry", "field_type": "select", "required": False, "options": "Technology,Healthcare,Finance,Retail,Manufacturing,Other"},
        {"form_type": "product-profile", "field_name": "company_size", "field_label": "Company Size", "field_type": "select", "required": False, "options": "1-10,11-50,51-200,201-500,500+"},
        {"form_type": "product-profile", "field_name": "website", "field_label": "Website", "field_type": "text", "required": False},
        {"form_type": "product-profile", "field_name": "address", "field_label": "Address", "field_type": "text", "required": False},
        {"form_type": "product-profile", "field_name": "current_system", "field_label": "Current System", "field_type": "text", "required": False},
        {"form_type": "product-profile", "field_name": "warehouses", "field_label": "Number of Warehouses", "field_type": "number", "required": False},
        {"form_type": "product-profile", "field_name": "users", "field_label": "Number of Users", "field_type": "number", "required": False},
        {"form_type": "product-profile", "field_name": "requirements", "field_label": "Requirements", "field_type": "text", "required": False},
        {"form_type": "product-profile", "field_name": "timeline", "field_label": "Implementation Timeline", "field_type": "select", "required": False, "options": "Immediate,1-3 months,3-6 months,6+ months"},
        
        # Talk to Sales form fields
        {"form_type": "talk", "field_name": "first_name", "field_label": "First Name", "field_type": "text", "required": True},
        {"form_type": "talk", "field_name": "last_name", "field_label": "Last Name", "field_type": "text", "required": True},
        {"form_type": "talk", "field_name": "phone", "field_label": "Phone", "field_type": "text", "required": True},
        {"form_type": "talk", "field_name": "company", "field_label": "Company", "field_type": "text", "required": False},
        {"form_type": "talk", "field_name": "company_size", "field_label": "Company Size", "field_type": "select", "required": False, "options": "1-10,11-50,51-200,201-500,500+"},
        {"form_type": "talk", "field_name": "topic", "field_label": "Topic of Interest", "field_type": "text", "required": True},
        {"form_type": "talk", "field_name": "duration", "field_label": "Preferred Duration", "field_type": "select", "required": False, "options": "15 min,30 min,45 min,60 min"},
        {"form_type": "talk", "field_name": "date_preference", "field_label": "Preferred Date", "field_type": "date", "required": False},
        {"form_type": "talk", "field_name": "additional_information", "field_label": "Additional Information", "field_type": "text", "required": False},
        {"form_type": "talk", "field_name": "current_system", "field_label": "Current System", "field_type": "text", "required": False},
        {"form_type": "talk", "field_name": "warehouses", "field_label": "Number of Warehouses", "field_type": "number", "required": False},
        {"form_type": "talk", "field_name": "users", "field_label": "Number of Users", "field_type": "number", "required": False},
        {"form_type": "talk", "field_name": "requirements", "field_label": "Requirements", "field_type": "text", "required": False},
        {"form_type": "talk", "field_name": "timeline", "field_label": "Implementation Timeline", "field_type": "select", "required": False, "options": "Immediate,1-3 months,3-6 months,6+ months"},
        
        # General Inquiry form fields
        {"form_type": "general", "field_name": "inquiry_type", "field_label": "Type of Inquiry", "field_type": "select", "required": True, "options": "Product Info,Pricing,Support,Partnership,Other"},
        {"form_type": "general", "field_name": "urgency", "field_label": "Urgency Level", "field_type": "select", "required": False, "options": "Low,Medium,High,Critical"},
    ]
    for field_data in form_fields_data:
        field = FormField(**field_data)
        db.add(field)
    db.commit()
    print(f"[OK] Created {len(form_fields_data)} form fields")
    
    # 4. Seed Leads (assigned to executives)
    print("\n[5/10] Creating leads...")
    lead_statuses = ["New", "Contacted", "Qualified", "Proposal Sent", "In Discussion", "Closed Won", "Closed Lost"]
    lead_stages = ["A", "B", "C", "D", "E", "F", "G", "H"]
    source_types = ["Website", "Referral", "Trade Show", "Email Campaign", "Cold Call", "Partner", "Social Media"]
    website_sources = ["Brochure Download", "Product Profile Download", "Talk to Sales", "General Inquiry", "Request a Demo"]
    
    leads = []
    companies = [
        "Acme Corporation", "TechStart Inc", "Global Solutions Ltd", "Digital Ventures", "Innovate Co",
        "Future Systems", "Smart Tech Solutions", "NextGen Industries", "Cloud Dynamics", "Data Systems Inc",
        "Enterprise Solutions", "Tech Innovations", "Business Partners", "Strategic Corp", "Advanced Tech",
        "Modern Enterprises", "Digital Solutions", "Tech Partners", "Innovation Labs", "Future Tech",
        "Smart Systems", "Cloud Enterprises", "Data Dynamics", "Tech Ventures", "Business Solutions"
    ]
    
    # Create a mapping of executive ID to manager ID for quick lookup
    exec_to_manager = {}
    for exec_user in executives:
        exec_to_manager[exec_user.id] = exec_user.manager_id
    
    for i, company in enumerate(companies):
        # Assign to executives in round-robin
        exec_idx = i % len(executives)
        assigned_exec = executives[exec_idx]
        
        # Get the manager who assigned this lead (the executive's manager)
        manager_id = exec_to_manager.get(assigned_exec.id)
        
        # Determine source
        if i % 3 == 0:  # Every 3rd lead from website
            source_type = "Website"
            source = website_sources[i % len(website_sources)]
        else:
            source_type = source_types[i % len(source_types)]
            source = f"{source_type} Source {i+1}"
        
        # Vary status and stage - ensure some leads are "Closed Won" for conversion rate calculations
        # Distribute statuses: ~30% Closed Won, ~20% Closed Lost, rest in pipeline
        if i < 7:  # First 7 leads = Closed Won (28%)
            status = "Closed Won"
            stage = None
        elif i < 12:  # Next 5 leads = Closed Lost (20%)
            status = "Closed Lost"
            stage = None
        else:  # Remaining leads in pipeline
            status = lead_statuses[i % (len(lead_statuses) - 2)]  # Exclude Closed Won/Lost from rotation
            stage = lead_stages[i % len(lead_stages)]
        
        # Create lead
        lead = Lead(
            name=f"Contact {i+1}",
            email=f"contact{i+1}@{company.lower().replace(' ', '').replace('.', '').replace(',', '')}.com",
            phone=f"+1-555-{1000+i:04d}",
            company=company,
            source_type=source_type,
            source=source,
            designation=f"Manager" if i % 2 == 0 else "Director",
            status=status,
            stage=stage,
            assigned=assigned_exec.name,
            assigned_to=assigned_exec.id,
            created_by=manager_id,  # Manager who created/assigned (the executive's manager)
            follow_up_required=(i % 4 == 0),
            follow_up_date=(base_date.date() + timedelta(days=i+1)) if (i % 4 == 0) else None,
            follow_up_time=f"{(9 + i % 8):02d}:00" if (i % 4 == 0) else None,
            follow_up_status="Pending" if (i % 4 == 0) else None,
            created_at=base_date - timedelta(days=30-i)
        )
        db.add(lead)
        leads.append(lead)
    
    db.commit()
    print(f"[OK] Created {len(leads)} leads")
    
    # 5. Seed Submissions (all form types with proper dates)
    print("\n[6/10] Creating form submissions...")
    submissions_data = []
    
    # Add recent submissions (last 7 days) with matching lead emails for conversion tracking
    recent_submission_names = ["John Recent", "Jane Recent", "Bob Recent", "Alice Recent", "Charlie Recent", 
                              "Diana Recent", "Eve Recent", "Frank Recent", "Grace Recent", "Henry Recent"]
    for i, name in enumerate(recent_submission_names):
        name_parts = name.split()
        first = name_parts[0]
        last = name_parts[1] if len(name_parts) > 1 else "Recent"
        # Use email format that matches leads: contact{i+1}@company.com
        company_name = companies[i % len(companies)]
        email = f"contact{i+1}@{company_name.lower().replace(' ', '').replace('.', '').replace(',', '')}.com"
        # Create submissions in the last 7 days (some converted, some not)
        days_ago = i % 7  # Spread over last 7 days
        is_converted = i < 5  # First 5 are converted (matching with leads)
        
        submissions_data.append({
            "form_type": ["general", "demo", "brochure", "talk", "product-profile"][i % 5],
            "name": name,
            "email": email,
            "company": company_name,
            "submitted": base_date - timedelta(days=days_ago),
            "status": "Converted" if is_converted else "New",
            "lead_id": leads[i].id if is_converted and i < len(leads) else None,
            "data": {
                "first_name": first,
                "last_name": last,
                "phone": f"+1-555-{9000+i:04d}",
                "company": company_name,
                "company_size": ["11-50", "51-200", "201-500", "500+"][i % 4],
                "message": f"Recent submission from {days_ago} days ago."
            }
        })
    
    # General Inquiry Forms - 10 entries (form_type: "general")
    general_names = ["Alice Johnson", "Bob Smith", "Charlie Brown", "Diana Prince", "Edward Norton",
                     "Fiona Apple", "George Lucas", "Helen Mirren", "Isaac Newton", "Julia Roberts"]
    for i, name in enumerate(general_names):
        first, last = name.split()
        submissions_data.append({
            "form_type": "general",
            "name": name,
            "email": f"{first.lower()}@{last.lower()}.com",
            "company": f"{last} Corporation",
            "submitted": base_date - timedelta(days=30-i*2),
            "status": "Converted" if i < 3 else "New",
            "lead_id": leads[i].id if i < 3 else None,
            "data": {
                "first_name": first,
                "last_name": last,
                "phone": f"+1-555-{2000+i:04d}",
                "company": f"{last} Corporation",
                "company_size": ["11-50", "51-200", "201-500", "500+"][i % 4],
                "message": f"Interested in learning more about your products. Inquiry type: {['Product Info', 'Pricing', 'Support', 'Partnership', 'Other'][i % 5]}",
                "inquiry_type": ["Product Info", "Pricing", "Support", "Partnership", "Other"][i % 5],
                "urgency": ["Low", "Medium", "High", "Critical"][i % 4]
            }
        })
    
    # Contact Forms (legacy support) - 5 entries (form_type: "contact")
    contact_names = ["Karen White", "Larry Brown", "Mary Green", "Nick Black", "Olivia Blue"]
    for i, name in enumerate(contact_names):
        first, last = name.split()
        submissions_data.append({
            "form_type": "contact",
            "name": name,
            "email": f"{first.lower()}@{last.lower()}.com",
            "company": f"{last} Corporation",
            "submitted": base_date - timedelta(days=25-i*2),
            "status": "New",
            "lead_id": None,
            "data": {
                "first_name": first,
                "last_name": last,
                "phone": f"+1-555-{2100+i:04d}",
                "company": f"{last} Corporation",
                "company_size": ["11-50", "51-200", "201-500", "500+"][i % 4],
                "message": f"General inquiry about your services.",
                "inquiry_type": ["Product Info", "Pricing", "Support", "Partnership", "Other"][i % 5]
            }
        })
    
    # Demo Requests - 10 entries
    demo_names = ["Kevin Spacey", "Laura Linney", "Michael Caine", "Nancy Drew", "Oliver Twist",
                  "Patricia Highsmith", "Quentin Tarantino", "Rachel Green", "Steve Jobs", "Tom Hanks"]
    for i, name in enumerate(demo_names):
        first, last = name.split()
        submissions_data.append({
            "form_type": "demo",
            "name": name,
            "email": f"{first.lower()}@{last.lower()}.com",
            "company": f"{last} Industries",
            "submitted": base_date - timedelta(days=28-i*2),
            "status": "Converted" if i < 2 else "New",
            "lead_id": leads[i+10].id if i < 2 else None,
            "data": {
                "first_name": first,
                "last_name": last,
                "phone": f"+1-555-{3000+i:04d}",
                "company_name": f"{last} Industries",
                "company_size": ["1-10", "11-50", "51-200", "201-500"][i % 4],
                "preferred_demo_date": (base_date + timedelta(days=i+5)).strftime("%Y-%m-%d"),
                "preferred_demo_time": f"{(9 + i % 8):02d}:00",
                "additional_information": f"Looking for a demo to evaluate your solution.",
                "current_system": ["SAP", "Oracle", "Custom", None][i % 4],
                "warehouses": (i % 5) + 1,
                "users": (i + 1) * 25,
                "requirements": f"Multi-warehouse support, real-time tracking",
                "timeline": ["Immediate", "1-3 months", "3-6 months", "6+ months"][i % 4]
            }
        })
    
    # Brochure Forms - 12 entries
    brochure_names = ["Uma Thurman", "Victor Hugo", "Wendy Williams", "Xavier Woods", "Yvonne Strahovski",
                      "Zachary Quinto", "Anna Kendrick", "Brad Pitt", "Chris Evans", "Daisy Ridley",
                      "Emma Watson", "Frank Ocean"]
    for i, name in enumerate(brochure_names):
        first, last = name.split()
        submissions_data.append({
            "form_type": "brochure",
            "name": name,
            "email": f"{first.lower()}@{last.lower()}.com",
            "company": f"{last} Group",
            "submitted": base_date - timedelta(days=26-i*2),
            "status": "Converted" if i < 2 else "New",
            "lead_id": leads[i+20].id if i < 2 else None,
            "data": {
                "first_name": first,
                "last_name": last,
                "email": f"{first.lower()}@{last.lower()}.com",
                "company": f"{last} Group",
                "phone": f"+1-555-{4000+i:04d}",
                "job_role": ["CEO", "CTO", "Operations Manager", "IT Manager", "Director"][i % 5],
                "agreed_to_marketing": (i % 2 == 0)
            }
        })
    
    # Product Profile Forms - 10 entries
    product_names = ["Amy Adams", "Ben Affleck", "Cate Blanchett", "Daniel Craig", "Emily Blunt",
                     "Hugh Jackman", "Jennifer Lawrence", "Leonardo DiCaprio", "Margot Robbie", "Ryan Reynolds"]
    for i, name in enumerate(product_names):
        first, last = name.split()
        submissions_data.append({
            "form_type": "product-profile",
            "name": name,
            "email": f"{first.lower()}@{last.lower()}.com",
            "company": f"{last} Technologies",
            "submitted": base_date - timedelta(days=24-i*2),
            "status": "Converted" if i < 2 else "New",
            "lead_id": leads[i+15].id if i < 2 else None,
            "data": {
                "first_name": first,
                "last_name": last,
                "phone": f"+1-555-{5000+i:04d}",
                "job_title": ["VP Operations", "Director", "CEO", "Manager", "Founder"][i % 5],
                "company_name": f"{last} Technologies",
                "industry": ["Technology", "Healthcare", "Finance", "Retail", "Manufacturing"][i % 5],
                "company_size": ["11-50", "51-200", "201-500", "500+"][i % 4],
                "website": f"https://{last.lower()}.com",
                "address": f"{100+i} Main St, City, State {10000+i}",
                "current_system": ["SAP", "Oracle", "Epic", "Custom", None][i % 5],
                "warehouses": (i % 4) + 1,
                "users": (i + 1) * 50,
                "requirements": f"Enterprise solution with API integration",
                "timeline": ["Immediate", "1-3 months", "3-6 months", "6+ months"][i % 4]
            }
        })
    
    # Talk to Sales Forms - 12 entries
    talk_names = ["Scarlett Johansson", "Robert Downey", "Chris Hemsworth", "Mark Ruffalo", "Jeremy Renner",
                  "Samuel Jackson", "Paul Rudd", "Benedict Cumberbatch", "Tom Holland", "Chadwick Boseman",
                  "Brie Larson", "Elizabeth Olsen"]
    for i, name in enumerate(talk_names):
        first, last = name.split()
        submissions_data.append({
            "form_type": "talk",
            "name": name,
            "email": f"{first.lower()}@{last.lower()}.com",
            "company": f"{last} Solutions",
            "submitted": base_date - timedelta(days=22-i*2),
            "status": "Converted" if i < 2 else "New",
            "lead_id": leads[i+5].id if i < 2 else None,
            "data": {
                "first_name": first,
                "last_name": last,
                "phone": f"+1-555-{6000+i:04d}",
                "company": f"{last} Solutions",
                "company_size": ["11-50", "51-200", "201-500", "500+"][i % 4],
                "topic": ["Enterprise Package Pricing", "Custom Integration", "Quick Implementation", "Multi-Site Deployment"][i % 4],
                "duration": ["15 min", "30 min", "45 min", "60 min"][i % 4],
                "date_preference": (base_date + timedelta(days=i+3)).strftime("%Y-%m-%d"),
                "additional_information": f"Interested in discussing {['pricing', 'integration', 'implementation', 'deployment'][i % 4]} options.",
                "current_system": ["SAP", "Oracle", "Custom", None][i % 4],
                "warehouses": (i % 3) + 1,
                "users": (i + 1) * 30,
                "requirements": f"Custom solution for our needs",
                "timeline": ["Immediate", "1-3 months", "3-6 months", "6+ months"][i % 4]
            }
        })
    
    for sub_data in submissions_data:
        submission = Submission(**sub_data)
        db.add(submission)
    db.commit()
    print(f"[OK] Created {len(submissions_data)} submissions")
    
    # 6. Seed Newsletter Subscribers
    print("\n[7/10] Creating newsletter subscribers...")
    newsletter_emails = [
        "subscriber1@example.com", "subscriber2@example.com", "subscriber3@example.com",
        "newsletter@acme.com", "info@techstart.com", "marketing@example.com",
        "sales@example.com", "contact@example.com", "newsletter@retailcorp.com",
        "info@healthcare.com", "subscribe@manufacturing.com", "updates@finance.com",
        "news@tech.com", "alerts@business.com", "updates@enterprise.com"
    ]
    for i, email in enumerate(newsletter_emails):
        newsletter = Newsletter(
            email=email,
            date=(base_date - timedelta(days=60-i*3)).date(),
            active=(i % 3 != 0)  # Some inactive
        )
        db.add(newsletter)
    db.commit()
    print(f"[OK] Created {len(newsletter_emails)} newsletter subscribers")
    
    # 7. Seed Comments
    print("\n[8/10] Creating comments...")
    comment_texts = [
        "Initial contact made. Client interested in enterprise package.",
        "Follow-up call scheduled for next week.",
        "Referred by existing client. High priority.",
        "Qualified lead. Budget approved.",
        "Proposal sent. Awaiting response.",
        "Demo completed successfully.",
        "Contract signed! Deal closed.",
        "Won the deal! Great collaboration.",
        "Client requested additional information.",
        "Follow-up meeting scheduled.",
        "Price negotiation in progress.",
        "Technical questions answered.",
        "Implementation timeline discussed.",
        "Contract terms reviewed.",
        "Deal closed successfully!"
    ]
    comments = []
    for i, text in enumerate(comment_texts):
        lead_idx = i % len(leads)
        comment = Comment(
            lead_id=leads[lead_idx].id,
            text=text,
            timestamp=base_date - timedelta(days=25-i, hours=i % 8)
        )
        db.add(comment)
        comments.append(comment)
    db.commit()
    print(f"[OK] Created {len(comments)} comments")
    
    # 8. Seed Call Logs
    print("\n[9/10] Creating call logs...")
    call_logs = []
    activity_types = ["Phone Call", "Face to Face (In Person)", "Video Call", "Email"]
    
    for i in range(30):  # 30 call logs
        lead_idx = i % len(leads)
        exec_idx = i % len(executives)
        lead = leads[lead_idx]
        
        # Create call log
        call_log = CallLog(
            lead_id=lead.id,
            user_id=executives[exec_idx].id,
            stage=lead_stages[i % len(lead_stages)] if lead.stage else "A",
            activity_type=activity_types[i % len(activity_types)],
            objective=f"Discuss {['pricing', 'features', 'implementation', 'support'][i % 4]}",
            planning_notes=f"Prepared questions about {['pricing', 'features', 'timeline', 'support'][i % 4]}",
            post_meeting_notes=f"Meeting went well. Client showed interest in {['enterprise', 'standard', 'premium', 'custom'][i % 4]} package.",
            follow_up_notes=f"Follow up scheduled for {(base_date + timedelta(days=i+1)).strftime('%Y-%m-%d')}" if i % 2 == 0 else None,
            challenges=f"Client concerned about {['pricing', 'timeline', 'integration', 'support'][i % 4]}" if i % 3 == 0 else None,
            secured_order=(i % 5 == 0),
            dollar_value=(i + 1) * 5000 if (i % 5 == 0) else None,
            meeting_date=base_date - timedelta(days=20-i),
            is_completed=(i % 3 != 0),
            is_cancelled=(i % 7 == 0)
        )
        db.add(call_log)
        call_logs.append(call_log)
    db.commit()
    print(f"[OK] Created {len(call_logs)} call logs")
    
    # 9. Seed Reminders
    print("\n[10/10] Creating reminders...")
    reminders = []
    reminder_titles = [
        "Follow up on proposal",
        "Schedule demo call",
        "Send pricing information",
        "Check in on implementation",
        "Review contract terms",
        "Follow up on questions",
        "Schedule next meeting",
        "Send additional resources"
    ]
    
    for i in range(20):  # 20 reminders
        lead_idx = i % len(leads)
        exec_idx = i % len(executives)
        lead = leads[lead_idx]
        
        reminder = Reminder(
            lead_id=lead.id if (i % 3 != 0) else None,  # Some general reminders
            user_id=executives[exec_idx].id,
            title=reminder_titles[i % len(reminder_titles)],
            description=f"Reminder for {lead.company if lead.id else 'general task'}",
            due_date=base_date + timedelta(days=i+1, hours=(i % 8)),
            status=["Pending", "Completed", "Cancelled"][i % 3],
            completed=(i % 3 == 1),
            completed_at=(base_date - timedelta(days=i)) if (i % 3 == 1) else None
        )
        db.add(reminder)
        reminders.append(reminder)
    db.commit()
    print(f"[OK] Created {len(reminders)} reminders")
    
    # 10. Seed Activity Logs
    print("\n[11/11] Creating activity logs...")
    activities = []
    action_types = ["lead_converted", "status_changed", "comment_added", "user_created", "login"]
    
    for i in range(50):  # 50 activity logs
        user_idx = i % len(all_users)
        lead_idx = i % len(leads) if leads else None
        
        activity = ActivityLog(
            action_type=action_types[i % len(action_types)],
            description=f"Activity {i+1}: {action_types[i % len(action_types)]}",
            entity_type=["lead", "user", "submission", "comment"][i % 4],
            entity_id=leads[lead_idx].id if (lead_idx and i % 2 == 0) else None,
            user_id=all_users[user_idx].id,
            meta_data={"index": i, "timestamp": (base_date - timedelta(days=30-i)).isoformat()},
            created_at=base_date - timedelta(days=30-i, hours=i % 24)
        )
        db.add(activity)
        activities.append(activity)
    db.commit()
    print(f"[OK] Created {len(activities)} activity logs")
    
    db.commit()
    
    print("\n" + "=" * 60)
    print("[SUCCESS] Database seeding completed successfully!")
    print("=" * 60)
    print("\nSummary:")
    print(f"   - {len(roles)} Roles")
    print(f"   - {len(all_users)} Users (1 Admin, {len(managers)} Managers, {len(executives)} Executives, 2 Marketing)")
    print(f"   - {len(form_fields_data)} Form Fields")
    print(f"   - {len(leads)} Leads")
    print(f"   - {len(submissions_data)} Submissions")
    print(f"   - {len(newsletter_emails)} Newsletter Subscribers")
    print(f"   - {len(comments)} Comments")
    print(f"   - {len(call_logs)} Call Logs")
    print(f"   - {len(reminders)} Reminders")
    print(f"   - {len(activities)} Activity Logs")
    
    print("\n" + "=" * 60)
    print("LOGIN CREDENTIALS:")
    print("=" * 60)
    print("Admin:")
    print("   Email: admin@spars.com")
    print("   Password: admin123")
    print("\nSales Managers:")
    for i, manager in enumerate(managers):
        print(f"   {manager.name}:")
        print(f"      Email: {manager.email}")
        print(f"      Password: manager123")
    print("\nSales Executives:")
    for exec_user in executives[:5]:  # Show first 5
        print(f"   {exec_user.name}:")
        print(f"      Email: {exec_user.email}")
        print(f"      Password: exec123")
    print("   ... (and more)")
    print("\nMarketing:")
    print("   Email: marketing1@spars.com")
    print("   Password: marketing123")
    print("=" * 60)
    print("\nYou can now start the server with: python main.py")

if __name__ == "__main__":
    try:
        seed_data()
    except Exception as e:
        print(f"\n[ERROR] Error seeding database: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise
    finally:
        db.close()
