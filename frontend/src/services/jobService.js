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
import { config } from '../config';

export const jobService = {
  async getJobs() {
    // Create reference to jobs collection
    const jobsRef = collection(db, 'jobs');
    
    try {
      // Check authentication
      if (!auth.currentUser) {
        console.error('No authenticated user found');
        throw new Error('User must be authenticated');
      }

      console.log('Auth state:', {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        isAnonymous: auth.currentUser.isAnonymous
      });

      console.log('Collection reference created for "jobs"');

      // Create query for user's jobs
      const q = query(
        jobsRef,
        where('userId', '==', auth.currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      console.log('Query created with filters:', {
        userId: auth.currentUser.uid,
        orderBy: 'createdAt desc'
      });

      console.log('Executing Firestore query...');
      const snapshot = await getDocs(q);
      console.log('Query complete. Documents found:', snapshot.size);

      if (snapshot.empty) {
        console.log('No documents found for user');
        return [];
      }

      // Map documents to job objects
      const jobs = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Processing document:', doc.id, data);
        
        // Check for required fields
        if (!data.userId) {
          console.warn(`Document ${doc.id} missing userId field`);
        }
        
        return {
          id: doc.id,
          ...data,
          // Handle potential null/undefined timestamps with detailed logging
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
      });

      console.log('Successfully processed jobs:', {
        count: jobs.length,
        firstJobId: jobs[0]?.id,
        lastJobId: jobs[jobs.length - 1]?.id
      });
      
      return jobs;
    } catch (error) {
      console.error('Detailed error in getJobs:', {
        errorCode: error.code,
        errorMessage: error.message,
        errorName: error.name,
        errorStack: error.stack
      });

      // Check for specific Firestore errors
      if (error.code === 'permission-denied') {
        throw new Error('Permission denied. Please check Firestore security rules.');
      } else if (error.code === 'not-found') {
        throw new Error('Jobs collection not found.');
      } else if (error.code === 'unauthenticated') {
        throw new Error('User authentication required.');
      } else if (error.message.includes('requires an index')) {
        console.log('Index is being built. Using fallback query...');
        // Fallback to a simpler query without ordering
        const fallbackQuery = query(
          jobsRef,
          where('userId', '==', auth.currentUser.uid)
        );
        const snapshot = await getDocs(fallbackQuery);
        const jobs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date()
        }));
        // Sort in memory as a temporary solution
        return jobs.sort((a, b) => b.createdAt - a.createdAt);
      }

      throw new Error(`Failed to fetch jobs: ${error.message}`);
    }
  },

  async addJob(jobData) {
    if (!auth.currentUser) {
      throw new Error('User must be authenticated');
    }

    try {
      // First scrape the job details if a URL is provided
      let scrapedData = {};
      if (jobData.url) {
        console.log('Attempting to scrape URL:', jobData.url);
        scrapedData = await this.scrapeJobDetails(jobData.url);
        console.log('Scraped data:', scrapedData);
      }

      // Ensure we have the current user's ID
      const userId = auth.currentUser.uid;
      console.log('Current user ID:', userId);

      // Clean up the data before storing
      const rawData = {
        title: scrapedData.title?.trim(),
        company: scrapedData.company?.trim(),
        location: scrapedData.location?.trim(),
        employmentType: scrapedData.employmentType?.trim(),
        workplaceType: scrapedData.workplaceType?.trim(),
        url: jobData.url,
        userId: userId,
        status: 'New',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Remove any undefined or null values
      const cleanedData = Object.entries(rawData)
        .reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null) {
            acc[key] = value;
          }
          return acc;
        }, {});

      console.log('Cleaned job data:', cleanedData);

      const docRef = await addDoc(collection(db, 'jobs'), cleanedData);
      console.log('Successfully added job with ID:', docRef.id);

      return {
        id: docRef.id,
        ...cleanedData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Detailed error adding job:', error);
      if (error.code) {
        console.error('Firebase error code:', error.code);
      }
      if (error.message) {
        throw new Error(`Failed to add job: ${error.message}`);
      } else {
        throw new Error('Failed to add job: Unknown error');
      }
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
      // First verify the job exists and belongs to the user
      const jobRef = doc(db, 'jobs', jobId);
      const jobDoc = await getDoc(jobRef);
      
      if (!jobDoc.exists()) {
        throw new Error('Job not found');
      }

      const jobData = jobDoc.data();
      if (jobData.userId !== auth.currentUser.uid) {
        console.error('Permission denied:', {
          jobUserId: jobData.userId,
          currentUserId: auth.currentUser.uid
        });
        throw new Error('Permission denied: You can only delete your own jobs');
      }

      // If we get here, we have permission to delete
      await deleteDoc(jobRef);
      console.log('Successfully deleted job:', jobId);
    } catch (error) {
      console.error('Error deleting job:', {
        error,
        jobId,
        userId: auth.currentUser.uid,
        errorCode: error.code,
        errorMessage: error.message
      });
      throw new Error(`Failed to delete job: ${error.message}`);
    }
  },

  async scrapeJobDetails(url) {
    try {
      console.log('Starting job scraping for URL:', url);

      const response = await fetch('http://localhost:3001/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to scrape job details');
      }

      const data = await response.json();
      console.log('Scraped job details:', data);

      // Only fall back to URL parsing if we don't have both title AND company
      if (!data.title || !data.company) {
        console.log('Incomplete data from scraping, falling back to URL parsing');
        const fallbackData = this.parseUrlForJobDetails(url);
        
        // Merge scraped data with fallback data, preferring scraped data when available
        return {
          url,
          title: data.title || fallbackData.title || 'Unknown Position',
          company: data.company || fallbackData.company || 'Unknown Company',
          location: data.location || fallbackData.location || 'Remote/Unspecified',
          employmentType: data.employmentType || 'Full-time',
          workplaceType: data.workplaceType || 'Not Specified'
        };
      }

      // If we have complete data, return it with defaults for missing values
      return {
        url,
        title: data.title || 'Unknown Position',
        company: data.company || 'Unknown Company',
        location: data.location || 'Remote/Unspecified',
        employmentType: data.employmentType || 'Full-time',
        workplaceType: data.workplaceType || 'Not Specified'
      };
    } catch (error) {
      console.error('Error in scrapeJobDetails:', {
        error: error.message,
        url: url,
        stack: error.stack
      });
      // Fall back to URL parsing if scraping fails completely
      return this.parseUrlForJobDetails(url);
    }
  },

  parseUrlForJobDetails(url) {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(part => part);
      
      // Try to extract job ID and title from LinkedIn URL
      let title = 'Unknown Position';
      if (urlObj.hostname.includes('linkedin.com')) {
        // Extract job title from URL parameters
        const altParam = urlObj.searchParams.get('currentJobId') || 
                        urlObj.searchParams.get('jobId') || 
                        pathParts[pathParts.length - 1];
        if (altParam) {
          title = altParam
            .split(/[-_]/)
            .filter(part => !part.match(/^\d+$/))
            .map(word => {
              // Convert camelCase to spaces
              return word
                .replace(/([A-Z])/g, ' $1')
                .toLowerCase()
                .replace(/\b\w/g, l => l.toUpperCase());
            })
            .join(' ')
            .trim();
        }
      } else {
        // For other URLs, try to extract title from the path
        title = pathParts[pathParts.length - 1] || 'Unknown Position';
        title = title
          .split(/[-_]/)
          .filter(part => !part.match(/^\d+$/))
          .map(word => {
            return word
              .replace(/([A-Z])/g, ' $1')
              .toLowerCase()
              .replace(/\b\w/g, l => l.toUpperCase());
          })
          .join(' ')
          .trim();
      }

      // Try to extract company from domain
      let company = 'Unknown Company';
      const domain = urlObj.hostname.toLowerCase();
      
      if (domain.includes('linkedin.com')) {
        company = 'LinkedIn';
      } else if (domain.includes('indeed.com')) {
        company = 'Indeed';
      } else if (domain.includes('glassdoor.com')) {
        company = 'Glassdoor';
      } else {
        // Try to get company from subdomain or domain
        const domainParts = domain.split('.');
        company = domainParts[0];
        if (company === 'www' && domainParts.length > 2) {
          company = domainParts[1];
        }
        company = company
          .charAt(0).toUpperCase() + 
          company.slice(1)
          .replace(/-/g, ' ');
      }

      return {
        url,
        title: title || 'Unknown Position',
        company,
        location: 'Remote/Unspecified',
        status: 'New'
      };
    } catch (error) {
      console.error('Error parsing URL:', error);
      return {
        url,
        title: 'Unknown Position',
        company: 'Unknown Company',
        location: 'Remote/Unspecified',
        status: 'New'
      };
    }
  }
}; 