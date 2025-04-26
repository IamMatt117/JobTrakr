import React, { useState, useEffect } from 'react';
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
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

function App() {
  const [jobs, setJobs] = useState([]);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await axios.get(`${API_URL}/jobs`);
      setJobs(response.data);
    } catch (err) {
      setError('Failed to fetch jobs');
    }
  };

  const handleAddJob = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_URL}/jobs`, { url });
      setJobs([...jobs, response.data]);
      setUrl('');
    } catch (err) {
      setError('Failed to add job');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (jobId, newStatus) => {
    try {
      const response = await axios.put(`${API_URL}/jobs/${jobId}`, {
        status: newStatus,
      });
      setJobs(jobs.map(job => job.id === jobId ? response.data : job));
    } catch (err) {
      setError('Failed to update job status');
    }
  };

  const handleDeleteClick = (job) => {
    setJobToDelete(job);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await axios.delete(`${API_URL}/jobs/${jobToDelete.id}`);
      setJobs(jobs.filter(job => job.id !== jobToDelete.id));
      setDeleteDialogOpen(false);
      setJobToDelete(null);
    } catch (err) {
      setError('Failed to delete job');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setJobToDelete(null);
  };

  return (
    <div>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6">JobTrakr</Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom>
            Add New Job
          </Typography>
          <form onSubmit={handleAddJob}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Job URL"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  fullWidth
                  variant="contained"
                  type="submit"
                  disabled={loading}
                  sx={{ height: '56px' }}
                >
                  {loading ? 'Adding...' : 'Add Job'}
                </Button>
              </Grid>
            </Grid>
          </form>
          {error && (
            <Typography color="error" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
        </Box>

        <Typography variant="h4" gutterBottom>
          Your Jobs
        </Typography>
        <Grid container spacing={3}>
          {jobs.map((job) => (
            <Grid item xs={12} md={6} key={job.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="h6" gutterBottom>
                      {job.title}
                    </Typography>
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteClick(job)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                  <Typography color="textSecondary" gutterBottom>
                    {job.company}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    <Chip label={job.employment_type} color="secondary" variant="outlined" />
                    <Chip label={job.experience_level} color="info" variant="outlined" />
                  </Box>

                  <FormControl fullWidth sx={{ mt: 2 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={job.status}
                      onChange={(e) => handleStatusChange(job.id, e.target.value)}
                      label="Status"
                    >
                      <MenuItem value="New">New</MenuItem>
                      <MenuItem value="Applied">Applied</MenuItem>
                      <MenuItem value="Interviewing">Interviewing</MenuItem>
                      <MenuItem value="Offered">Offered</MenuItem>
                      <MenuItem value="Rejected">Rejected</MenuItem>
                    </Select>
                  </FormControl>
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Added: {new Date(job.created_at).toLocaleDateString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>Delete Job</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this job?
          </Typography>
          {jobToDelete && (
            <Typography variant="subtitle1" sx={{ mt: 2 }}>
              {jobToDelete.title} at {jobToDelete.company}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default App; 