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
      const fetchedJobs = await response.json();
      setJobs(fetchedJobs.data || []);
      console.log('Fetched jobs:', fetchedJobs.data);
    } catch (err) {
      setError('Failed to fetch jobs');
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

  return (
    <div className="jobscraper-container">
      <AppBar position="static" className="app-bar">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            JobTrakr
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="subtitle1" className="welcome-text">
              Welcome, {user?.displayName || 'User'}
            </Typography>
            <IconButton color="inherit" onClick={handleLogout}>
              <LogoutIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg">
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" className="section-heading">
            Search Jobs
          </Typography>
          <form onSubmit={handleSearch} className="job-form">
            <Grid container spacing={2}>
              <Grid item xs={12} md={5}>
                <TextField
                  fullWidth
                  label="Search Jobs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by title, company, or keywords"
                />
              </Grid>
              <Grid item xs={12} md={5}>
                <TextField
                  fullWidth
                  label="Location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Enter location"
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  fullWidth
                  variant="contained"
                  type="submit"
                  disabled={loading}
                  className="search-button"
                  startIcon={<SearchIcon />}
                >
                  Search
                </Button>
              </Grid>
            </Grid>
            {error && (
              <Typography className="error-message">
                {error}
              </Typography>
            )}
          </form>

          {/* Sort dropdown OUTSIDE the form */}
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
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
        </Box>

        <div className="job-grid">
          <Typography variant="h4" className="section-heading">
            Available Jobs
          </Typography>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {jobs.length === 0 && (
                <Typography>No jobs found in Ireland for this search.</Typography>
              )}
              <Grid container spacing={3}>
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
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </div>
      </Container>

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