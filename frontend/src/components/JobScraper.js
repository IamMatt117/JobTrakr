import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Container,
  Typography,
  TextField,
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
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router-dom';
import { jobService } from '../services/jobService';
import './JobScraper.css';

const JobScraper = () => {
  const [jobs, setJobs] = useState([]);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const fetchedJobs = await jobService.getJobs();
      setJobs(fetchedJobs);
    } catch (err) {
      setError('Failed to fetch jobs');
      console.error('Error fetching jobs:', err);
    }
  };

  const handleAddJob = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // First scrape the job details
      const jobDetails = await jobService.scrapeJobDetails(url);
      
      // Then add the job to the database
      const newJob = await jobService.addJob(jobDetails);
      
      setJobs([newJob, ...jobs]);
      setUrl('');
    } catch (err) {
      setError(err.message || 'Failed to add job');
      console.error('Error adding job:', err);
    } finally {
      setLoading(false);
    }
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
            Add New Job
          </Typography>
          <form onSubmit={handleAddJob} className="job-form">
            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Job URL"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  placeholder="Paste job listing URL here"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  fullWidth
                  variant="contained"
                  type="submit"
                  disabled={loading}
                  className="add-job-button"
                >
                  {loading ? 'Adding...' : 'Add Job'}
                </Button>
              </Grid>
            </Grid>
            {error && (
              <Typography className="error-message">
                {error}
              </Typography>
            )}
          </form>
        </Box>

        <div className="job-grid">
          <Typography variant="h4" className="section-heading">
            Your Jobs
          </Typography>
          <Grid container spacing={3}>
            {jobs.map((job) => (
              <Grid item xs={12} key={job.id}>
                <Card className="job-card">
                  <CardContent className="job-card-content">
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <Typography variant="h6" className="job-title" gutterBottom>
                          {job.title}
                        </Typography>
                        <Typography variant="subtitle1" className="job-company" gutterBottom>
                          {job.company}
                        </Typography>
                        <Typography variant="body2" className="job-location" gutterBottom>
                          {job.location}
                        </Typography>
                        {(job.employmentType || job.workplaceType) && (
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {job.employmentType && (
                              <Chip
                                label={job.employmentType}
                                size="small"
                                color="primary"
                                variant="outlined"
                                className="job-detail-chip"
                              />
                            )}
                            {job.workplaceType && (
                              <Chip
                                label={job.workplaceType}
                                size="small"
                                color="secondary"
                                variant="outlined"
                                className="job-detail-chip"
                              />
                            )}
                          </Box>
                        )}
                      </div>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                        <FormControl className="status-select" size="small">
                          <InputLabel>Status</InputLabel>
                          <Select
                            value={job.status || 'New'}
                            onChange={(e) => handleStatusChange(job.id, e.target.value)}
                            label="Status"
                            className={`status-select-${(job.status || 'New').toLowerCase()}`}
                          >
                            <MenuItem value="New">New</MenuItem>
                            <MenuItem value="Applied">Applied</MenuItem>
                            <MenuItem value="Interviewing">Interviewing</MenuItem>
                            <MenuItem value="Offered">Offered</MenuItem>
                            <MenuItem value="Rejected">Rejected</MenuItem>
                          </Select>
                        </FormControl>
                        <IconButton
                          onClick={() => handleDeleteClick(job)}
                          className="delete-button"
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
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