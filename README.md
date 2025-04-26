# JobTrakr

A job tracking application that helps you manage and track job applications. The application allows you to:
- Add job listings by URL
- Automatically scrape job details
- Track application status
- View and manage your job applications

## Features
- Job URL scraping
- Status tracking (Applied, Interviewing, Offered, Rejected, etc.)
- Modern, responsive UI
- Easy-to-use interface

## Tech Stack
- Backend: Python (Flask)
- Frontend: React
- Database: SQLite
- Job Scraping: BeautifulSoup4

## Setup Instructions

### Backend Setup
1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the Flask server:
```bash
python backend/app.py
```

### Frontend Setup
1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

## Usage
1. Open your browser and navigate to `http://localhost:3000`
2. Add a job URL to start tracking
3. Update the status as your application progresses
4. View and manage your job applications
