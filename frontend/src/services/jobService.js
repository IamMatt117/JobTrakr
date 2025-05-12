import { 
  collection, 
  query, 
  where, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDocs,
  orderBy,
  getDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase';

const JSEARCH_API_URL = '/api/jobs';

export const jobService = {
  async getJobs() {
    try {
      const response = await fetch(JSEARCH_API_URL);

      if (!response.ok) {
        throw new Error('Failed to fetch jobs from JSearch API');
      }

      const data = await response.json();
      const jobs = data.data || [];
      
      // Transform JSearch data to match our application's format
      return jobs.map(job => ({
        id: job.job_id,
        title: job.title,
        company: job.employer_name,
        location: job.job_city || job.job_country || 'Remote',
        employmentType: job.job_employment_type || 'Not Specified',
        workplaceType: job.job_is_remote ? 'Remote' : 'On-site',
        experience: job.job_required_experience || 'Not Specified',
        url: job.job_apply_link,
        description: job.job_description,
        companyLogo: job.employer_logo,
        createdAt: new Date(job.date_posted * 1000),
        status: 'New',
        job_publisher: job.job_publisher, // <-- ADD THIS LINE
        job_highlights: job.job_highlights, // (if you want qualifications)
        job_google_link: job.job_google_link,
        job_posted_at_datetime_utc: job.job_posted_at_datetime_utc,
        job_min_salary: job.job_min_salary,
        job_max_salary: job.job_max_salary
      }));
    } catch (error) {
      console.error('Error fetching jobs:', error);
      throw new Error('Failed to fetch jobs');
    }
  },

  async addJob(jobData) {
    if (!auth.currentUser) {
      throw new Error('User must be authenticated');
    }

    try {
      const data = {
        ...jobData,
        userId: auth.currentUser.uid,
        status: 'New',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'jobs'), data);
      return {
        id: docRef.id,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error adding job:', error);
      throw new Error('Failed to add job');
    }
  },

  async updateJobStatus(jobId, status) {
    if (!auth.currentUser) {
      throw new Error('User must be authenticated');
    }

    try {
      const jobRef = doc(db, 'jobs', jobId);
      await updateDoc(jobRef, {
        status: status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating job status:', error);
      throw new Error('Failed to update job status');
    }
  },

  async deleteJob(jobId) {
    if (!auth.currentUser) {
      throw new Error('User must be authenticated');
    }

    try {
      const jobRef = doc(db, 'jobs', jobId);
      const jobDoc = await getDoc(jobRef);
      
      if (!jobDoc.exists()) {
        throw new Error('Job not found');
      }

      const jobData = jobDoc.data();
      if (jobData.userId !== auth.currentUser.uid) {
        throw new Error('Permission denied: You can only delete your own jobs');
      }

      await deleteDoc(jobRef);
    } catch (error) {
      console.error('Error deleting job:', error);
      throw new Error(`Failed to delete job: ${error.message}`);
    }
  }
}; 