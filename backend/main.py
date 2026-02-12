from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine
from config import ALLOW_ORIGINS
from routers import leads, submissions, newsletter, users, roles, comments, forms, auth, activities, form_submissions, tags, reminders, workflows, call_logs, reports

app = FastAPI(title="SPARS FastAPI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

Base.metadata.create_all(bind=engine)

app.include_router(auth.router)
app.include_router(leads.router)
app.include_router(submissions.router)
app.include_router(form_submissions.router)  # Unified form submissions router
app.include_router(newsletter.router)
app.include_router(users.router)
app.include_router(roles.router)
app.include_router(comments.router)
app.include_router(forms.router)
app.include_router(activities.router)
app.include_router(tags.router)
app.include_router(reminders.router)
app.include_router(workflows.router)
app.include_router(call_logs.router)
app.include_router(reports.router)

@app.get("/")
def root():
    return {"message": "SPARS FastAPI Backend Running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
