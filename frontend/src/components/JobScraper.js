import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress,
  TextField,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import LogoutIcon from '@mui/icons-material/Logout';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';
import { jobService } from '../services/jobService';
import './JobScraper.css';
import { useSnackbar } from 'notistack';

const JobScraper = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [location, setLocation] = useState('Ireland');
  const [sortOrder, setSortOrder] = useState('newest');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async (search = searchTerm, loc = location) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        search: search || 'Software',
        location: loc || 'Ireland'
      });
      const response = await fetch(`/api/jobs?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch jobs: ${response.status} ${response.statusText}`);
      }
      const fetchedJobs = await response.json();
      setJobs(fetchedJobs.data || []);
      console.log('Fetched jobs:', fetchedJobs.data);
    } catch (err) {
      setError('Failed to fetch jobs');
      enqueueSnackbar(err.message || 'Failed to fetch jobs', { variant: 'error' });
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchJobs(searchTerm, location);
  };

  const handleStatusChange = async (jobId, newStatus) => {
    try {
      await jobService.updateJobStatus(jobId, newStatus);
      setJobs(jobs.map(job => 
        job.id === jobId ? { ...job, status: newStatus } : job
      ));
    } catch (err) {
      setError('Failed to update job status');
      console.error('Error updating job status:', err);
    }
  };

  const handleDeleteClick = (job) => {
    setJobToDelete(job);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await jobService.deleteJob(jobToDelete.id);
      setJobs(jobs.filter(job => job.id !== jobToDelete.id));
      setDeleteDialogOpen(false);
      setJobToDelete(null);
    } catch (err) {
      setError('Failed to delete job');
      console.error('Error deleting job:', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/signin');
  };

  // Sort jobs by date
  const sortedJobs = [...jobs].sort((a, b) => {
    const dateA = new Date(a.updated);
    const dateB = new Date(b.updated);
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  const handleSaveJob = async (job) => {
    try {
      await jobService.saveJob(job);
      enqueueSnackbar('Job saved!', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar(error.message || 'Failed to save job.', { variant: 'error' });
    }
  };

  return (
    <div className="jobscraper-container">
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" className="section-heading">
          Search Jobs
        </Typography>
        <form onSubmit={handleSearch} className="job-form">
          <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
            <TextField
              fullWidth
              label="Search Jobs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title, company, or keywords"
              sx={{ flex: 1 }}
            />
            <TextField
              fullWidth
              label="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter location"
              sx={{ flex: 1 }}
            />
            <Button
              variant="contained"
              type="submit"
              disabled={loading}
              className="search-button"
              startIcon={<SearchIcon />}
              sx={{ height: '56px', minWidth: '150px' }}
            >
              Search
            </Button>
          </Box>
          {error && (
            <Typography className="error-message">
              {error}
            </Typography>
          )}
        </form>
      </Box>
      <div className="job-grid">
        <Box className="main-content">
          <Box className="cards-header-row" sx={{ position: 'relative', mb: 3, maxWidth: 950, margin: '0 auto', height: 56 }}>
            <Typography
              variant="h4"
              className="section-heading"
              sx={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', mb: 0, width: 'max-content' }}
            >
              Available Jobs
            </Typography>
            <FormControl
              size="small"
              sx={{ minWidth: 180, position: 'absolute', right: -90, top: '50%', transform: 'translateY(-50%)' }}
            >
              <InputLabel id="sort-label">Sort By</InputLabel>
              <Select
                labelId="sort-label"
                value={sortOrder}
                label="Sort By"
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <MenuItem value="newest">Newest to Oldest</MenuItem>
                <MenuItem value="oldest">Oldest to Newest</MenuItem>
              </Select>
            </FormControl>
          </Box>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {jobs.length === 0 && (
                <Typography>No jobs found in Ireland for this search.</Typography>
              )}
              <Grid container spacing={3} justifyContent="center">
                {sortedJobs.map((job, idx) => (
                  <Grid item xs={12} sm={6} md={4} key={job.link || idx}>
                    <Card className="job-card simple-job-card">
                      <CardContent>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, textAlign: 'left' }}>
                          {job.title}
                        </Typography>
                        <Typography variant="body2" sx={{ textAlign: 'left' }}>
                          <strong>Company:</strong> {job.company || 'N/A'}
                        </Typography>
                        <Typography variant="body2" sx={{ textAlign: 'left' }}>
                          <strong>Location:</strong> {job.location || 'N/A'}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1, textAlign: 'left' }}>
                          <strong>Description:</strong> {job.snippet?.substring(0, 120)}...
                        </Typography>
                        {job.updated && (
                          <Typography variant="body2" sx={{ mt: 1, textAlign: 'left' }}>
                            <strong>Posted Date:</strong> {new Date(job.updated).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                          </Typography>
                        )}
                        <Box sx={{ mt: 2, textAlign: 'left' }}>
                          <Button
                            variant="text"
                            size="small"
                            href={job.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ color: '#1976d2', textTransform: 'none', fontWeight: 500, pl: 0 }}
                          >
                            &lt; View Job
                          </Button>
                        </Box>
                        <Button
                          variant="outlined"
                          size="small"
                          sx={{ mt: 1, mr: 1 }}
                          onClick={() => handleSaveJob(job)}
                        >
                          Mark as Applied
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </Box>
      </div>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this job?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default JobScraper; 