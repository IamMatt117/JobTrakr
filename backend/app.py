from flask import Flask, request, jsonify
from flask_cors import CORS
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import requests
from bs4 import BeautifulSoup
import json
import time

app = Flask(__name__)
CORS(app)

# Database setup
Base = declarative_base()
engine = create_engine('sqlite:///jobs.db')
Session = sessionmaker(bind=engine)

class Job(Base):
    __tablename__ = 'jobs'
    
    id = Column(Integer, primary_key=True)
    url = Column(String)
    title = Column(String)
    company = Column(String)
    employment_type = Column(String)  # Full-time, Part-time, Contract
    experience_level = Column(String)  # Internship, Associate, Mid-Senior
    status = Column(String, default='New')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

Base.metadata.create_all(engine)

def scrape_job_details(url):
    try:
        session = requests.Session()
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'max-age=0',
            'Connection': 'keep-alive',
            'DNT': '1',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Referer': 'https://www.google.com/'
        }
        
        # Try to get the job page with retries
        print("\nGetting job page...")
        max_retries = 3
        retry_delay = 2  # seconds
        timeout = 10  # seconds
        
        for attempt in range(max_retries):
            try:
                response = session.get(url, headers=headers, allow_redirects=True, timeout=timeout)
                print(f"Job page status: {response.status_code}")
                break
            except requests.exceptions.Timeout:
                if attempt < max_retries - 1:
                    print(f"Attempt {attempt + 1} timed out, retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                else:
                    print("All retry attempts failed")
                    # Try to extract information from the URL if all retries fail
                    return extract_from_url(url)
            except requests.exceptions.RequestException as e:
                print(f"Request failed: {str(e)}")
                return extract_from_url(url)
        
        if response.status_code != 200:
            print(f"Failed to get job page (status {response.status_code})")
            return extract_from_url(url)
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Initialize variables
        title = None
        company = None
        employment_type = None
        experience_level = None
        
        # Try to find title and company from meta tags first
        meta_title = soup.find('meta', property='og:title')
        if meta_title:
            content = meta_title.get('content', '')
            if ' at ' in content:
                title, company = content.split(' at ', 1)
                title = title.strip()
                company = company.strip()
                print(f"Found title and company from meta tags: {title} at {company}")
        
        # Try to find title from the page content
        if not title:
            title_selectors = [
                'h1.top-card-layout__title',
                'h1.job-details-jobs-unified-top-card__job-title',
                'h1.jobs-unified-top-card__job-title',
                'h1.topcard__title',
                'h1'
            ]
            for selector in title_selectors:
                title_element = soup.select_one(selector)
                if title_element and title_element.text.strip():
                    title = title_element.text.strip()
                    print(f"Found title from page: {title}")
                    break
        
        # Try to find employment type and experience level from the page content
        employment_selectors = [
            '.job-details-jobs-unified-top-card__job-insight',
            '.job-details-jobs-unified-top-card__workplace-type',
            '.jobs-unified-top-card__job-insight',
            '.jobs-unified-top-card__workplace-type',
            '.job-criteria__list',
            '.description__job-criteria-list',
            '.description__job-criteria-text'
        ]
        
        # Look for employment type and experience level in various page elements
        for selector in employment_selectors:
            elements = soup.select(selector)
            for element in elements:
                text = element.get_text().lower()
                
                # Check for employment type
                if not employment_type:
                    if any(term in text for term in ['full-time', 'full time']):
                        employment_type = 'Full-time'
                    elif any(term in text for term in ['part-time', 'part time']):
                        employment_type = 'Part-time'
                    elif any(term in text for term in ['contract', 'temporary', 'contractor']):
                        employment_type = 'Contract'
                    elif 'internship' in text:
                        employment_type = 'Internship'
                
                # Check for experience level
                if not experience_level:
                    text_lower = text.lower()
                    if any(term in text_lower for term in ['0-1 years', '1-2 years', 'entry level', 'junior', 'associate', 'intern', 'internship']):
                        experience_level = 'Entry Level'
                    elif any(term in text_lower for term in ['2-3 years', '3-5 years', 'mid level', 'mid-level', 'intermediate']):
                        experience_level = 'Mid Level'
                    elif any(term in text_lower for term in ['5+ years', '7+ years', '8+ years', 'senior', 'sr.', 'lead', 'principal', 'staff']):
                        experience_level = 'Senior Level'
                    elif any(term in text_lower for term in ['10+ years', 'manager', 'director', 'head of', 'vp', 'chief']):
                        experience_level = 'Management'
                
                if employment_type and experience_level:
                    break
            
            if employment_type and experience_level:
                break
        
        # If we still don't have a title, try to extract it from the URL
        if not title and 'view/' in url:
            try:
                # Extract the part between 'view/' and the next '/' or '?'
                url_part = url.split('view/')[1]
                if '?' in url_part:
                    url_part = url_part.split('?')[0]
                if '/' in url_part:
                    url_part = url_part.split('/')[0]
                
                # Split by hyphens and clean up
                parts = url_part.split('-')
                # Remove job ID (usually a number) and common words
                title_parts = []
                for part in parts:
                    if not part.isdigit() and part.lower() not in ['r', 'at', 'in', 'for', 'the', 'a', 'an']:
                        # Replace special characters
                        cleaned_part = part.replace('%20', ' ').replace('%2C', ',')
                        title_parts.append(cleaned_part)
                
                if title_parts:
                    # Properly capitalize each word
                    title = ' '.join(word.capitalize() for word in ' '.join(title_parts).split())
                    print(f"Extracted title from URL: {title}")
            except Exception as e:
                print(f"Error extracting title from URL: {str(e)}")
        
        # Try to find company name if not already found
        if not company:
            company_selectors = [
                '.topcard__org-name-link',
                '.company-name',
                '.job-details-jobs-unified-top-card__company-name',
                '.jobs-unified-top-card__company-name',
                '.job-details-jobs-unified-top-card__primary-description'
            ]
            for selector in company_selectors:
                company_element = soup.select_one(selector)
                if company_element and company_element.text.strip():
                    company = company_element.text.strip().split('·')[0].strip()
                    print(f"Found company from page: {company}")
                    break
        
        # If we still don't have the company, try to find it in the content
        if not company:
            company_matches = soup.find_all(string=lambda text: 'hiring' in str(text).lower())
            for match in company_matches:
                text = str(match)
                if 'hiring' in text.lower():
                    company = text.split('hiring')[0].strip()
                    print(f"Found company from content: {company}")
                    break
        
        # Clean up the title if we found one
        if title:
            # Remove any extra whitespace and newlines
            title = ' '.join(title.split())
            # Remove common suffixes if they exist
            suffixes = ['-R-', ' R-', ' ID:', ' Job ID:', '(Remote)', '(Hybrid)', '(On-site)']
            for suffix in suffixes:
                if suffix in title:
                    title = title.split(suffix)[0].strip()
        
        # Try to infer employment type and experience level from the title if not found
        if not employment_type or not experience_level:
            title_lower = title.lower()
            
            # Infer employment type from title
            if not employment_type:
                if 'contract' in title_lower or 'contractor' in title_lower:
                    employment_type = 'Contract'
                elif 'intern' in title_lower or 'internship' in title_lower:
                    employment_type = 'Internship'
                elif 'part time' in title_lower or 'part-time' in title_lower:
                    employment_type = 'Part-time'
                else:
                    employment_type = 'Full-time'  # Default to full-time
            
            # Infer experience level from title
            if not experience_level:
                if any(term in title_lower for term in ['senior', 'sr.', 'lead', 'principal', 'staff']):
                    experience_level = 'Senior Level'
                elif any(term in title_lower for term in ['junior', 'jr.', 'entry', 'graduate', 'associate']):
                    experience_level = 'Entry Level'
                elif any(term in title_lower for term in ['intern', 'internship']):
                    experience_level = 'Internship'
                elif any(term in title_lower for term in ['manager', 'director', 'head', 'vp', 'chief']):
                    experience_level = 'Management'
                else:
                    experience_level = 'Mid Level'  # Default to mid level if no other indicators
        
        # Fallback values if nothing was found
        title = title or 'Unknown Title'
        company = company or 'Unknown Company'
        employment_type = employment_type or 'Unknown'
        experience_level = experience_level or 'Unknown'
        
        # Print final values for debugging
        print(f"Final values - Title: {title}, Company: {company}, Employment: {employment_type}, Experience: {experience_level}")
        
        return {
            'title': title,
            'company': company,
            'employment_type': employment_type,
            'experience_level': experience_level
        }
    except Exception as e:
        print(f"Error scraping job details: {str(e)}")
        return extract_from_url(url)

def extract_from_url(url):
    """Extract job information from the URL when we can't access the page."""
    try:
        # Initialize with defaults
        title = 'Unknown Title'
        company = 'Unknown Company'
        employment_type = 'Full-time'  # Default to full-time
        experience_level = 'Mid Level'  # Default to mid-level
        
        # Try to extract job title from URL
        if 'view/' in url:
            try:
                # Extract the part between 'view/' and the next '/' or '?'
                url_part = url.split('view/')[1]
                if '?' in url_part:
                    url_part = url_part.split('?')[0]
                if '/' in url_part:
                    url_part = url_part.split('/')[0]
                
                # Split by hyphens and clean up
                parts = url_part.split('-')
                # Remove job ID (usually a number) and common words
                title_parts = []
                for part in parts:
                    if not part.isdigit() and part.lower() not in ['r', 'at', 'in', 'for', 'the', 'a', 'an']:
                        # Replace special characters
                        cleaned_part = part.replace('%20', ' ').replace('%2C', ',')
                        title_parts.append(cleaned_part)
                
                if title_parts:
                    # Properly capitalize each word
                    title = ' '.join(word.capitalize() for word in ' '.join(title_parts).split())
                    print(f"Extracted title from URL: {title}")
                    
                    # Try to infer employment type and experience level from title
                    title_lower = title.lower()
                    
                    # Infer employment type
                    if 'contract' in title_lower or 'contractor' in title_lower:
                        employment_type = 'Contract'
                    elif 'intern' in title_lower or 'internship' in title_lower:
                        employment_type = 'Internship'
                    elif 'part time' in title_lower or 'part-time' in title_lower:
                        employment_type = 'Part-time'
                    
                    # Infer experience level
                    if 'senior' in title_lower or 'sr.' in title_lower or 'lead' in title_lower:
                        experience_level = 'Senior Level'
                    elif 'junior' in title_lower or 'jr.' in title_lower:
                        experience_level = 'Entry Level'
                    elif any(word in title_lower for word in ['intern', 'internship']):
                        experience_level = 'Internship'
                    elif any(word in title_lower for word in ['manager', 'director', 'head']):
                        experience_level = 'Management'
            except Exception as e:
                print(f"Error extracting from URL: {str(e)}")
        
        print(f"Extracted from URL - Title: {title}, Company: {company}, Employment: {employment_type}, Experience: {experience_level}")
        
        return {
            'title': title,
            'company': company,
            'employment_type': employment_type,
            'experience_level': experience_level
        }
    except Exception as e:
        print(f"Error in extract_from_url: {str(e)}")
        return {
            'title': 'Unknown Title',
            'company': 'Unknown Company',
            'employment_type': 'Unknown',
            'experience_level': 'Unknown'
        }

@app.route('/api/jobs', methods=['GET'])
def get_jobs():
    session = Session()
    jobs = session.query(Job).all()
    return jsonify([{
        'id': job.id,
        'url': job.url,
        'title': job.title,
        'company': job.company,
        'employment_type': job.employment_type,
        'experience_level': job.experience_level,
        'status': job.status,
        'created_at': job.created_at.isoformat(),
        'updated_at': job.updated_at.isoformat()
    } for job in jobs])

@app.route('/api/jobs', methods=['POST'])
def add_job():
    data = request.json
    url = data.get('url')
    
    if not url:
        return jsonify({'error': 'URL is required'}), 400
    
    job_details = scrape_job_details(url)
    if 'error' in job_details:
        return jsonify({'error': job_details['error']}), 400
    
    session = Session()
    job = Job(
        url=url,
        title=job_details['title'],
        company=job_details['company'],
        employment_type=job_details['employment_type'],
        experience_level=job_details['experience_level']
    )
    session.add(job)
    session.commit()
    
    return jsonify({
        'id': job.id,
        'url': job.url,
        'title': job.title,
        'company': job.company,
        'employment_type': job.employment_type,
        'experience_level': job.experience_level,
        'status': job.status,
        'created_at': job.created_at.isoformat(),
        'updated_at': job.updated_at.isoformat()
    })

@app.route('/api/jobs/<int:job_id>', methods=['PUT'])
def update_job_status(job_id):
    data = request.json
    new_status = data.get('status')
    
    if not new_status:
        return jsonify({'error': 'Status is required'}), 400
    
    session = Session()
    job = session.query(Job).filter_by(id=job_id).first()
    
    if not job:
        return jsonify({'error': 'Job not found'}), 404
    
    job.status = new_status
    session.commit()
    
    return jsonify({
        'id': job.id,
        'url': job.url,
        'title': job.title,
        'company': job.company,
        'employment_type': job.employment_type,
        'experience_level': job.experience_level,
        'status': job.status,
        'created_at': job.created_at.isoformat(),
        'updated_at': job.updated_at.isoformat()
    })

@app.route('/api/jobs/<int:job_id>', methods=['DELETE'])
def delete_job(job_id):
    session = Session()
    job = session.query(Job).filter_by(id=job_id).first()
    
    if not job:
        return jsonify({'error': 'Job not found'}), 404
    
    session.delete(job)
    session.commit()
    
    return jsonify({'message': 'Job deleted successfully'})

if __name__ == '__main__':
    app.run(debug=True) 