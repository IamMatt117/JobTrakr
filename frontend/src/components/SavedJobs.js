import React, { useEffect, useState } from 'react';
import { jobService } from '../services/jobService';
import { Container, Typography, Card, CardContent, Button, Select, MenuItem, Box, Grid } from '@mui/material';
import { useSnackbar } from 'notistack';

const statusOptions = ['Applied', 'Interviewing', 'Offer', 'Rejected'];

const SavedJobs = () => {
  const [jobs, setJobs] = useState([]);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    fetchSavedJobs();
  }, []);

  const fetchSavedJobs = async () => {
    const res = await jobService.getSavedJobs();
    setJobs(res.data || []);
  };

  const handleStatusChange = async (job, newStatus) => {
    // Optimistically update the UI for immediate feedback
    setJobs(jobs.map(j => j.firestoreId === job.firestoreId ? { ...j, status: newStatus } : j));
    try {
      await jobService.updateJobStatus(job.firestoreId, newStatus);
      enqueueSnackbar('Job status updated!', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Failed to update job status.', { variant: 'error' });
    }
  };

  const handleDelete = async (job) => {
    try {
      await jobService.deleteSavedJob(job.firestoreId);
      setJobs(jobs.filter(j => j.firestoreId !== job.firestoreId));
      enqueueSnackbar('Job deleted!', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Failed to delete job.', { variant: 'error' });
    }
  };

  return (
    <Container>
      <Typography variant="h4" sx={{ mb: 3, textAlign: 'center' }}>Saved Jobs</Typography>
      {jobs.length === 0 ? (
        <Typography sx={{ textAlign: 'center', mt: 4 }} color="text.secondary">
          No saved jobs found.
        </Typography>
      ) : (
        <Grid container spacing={3}>
          {jobs.map((job) => {
            let borderColor, selectColor;
            switch (job.status) {
              case 'Applied':
                borderColor = '#1976d2';
                selectColor = '#1976d2';
                break;
              case 'Rejected':
                borderColor = '#f44336';
                selectColor = '#f44336';
                break;
              case 'Offer':
                borderColor = '#4caf50';
                selectColor = '#4caf50';
                break;
              case 'Interviewing':
                borderColor = '#9c27b0';
                selectColor = '#9c27b0';
                break;
              default:
                borderColor = '#e0e0e0';
                selectColor = 'inherit';
            }
            return (
              <Grid item xs={12} sm={6} md={4} key={job.firestoreId}>
                <Card sx={{ border: `2px solid ${borderColor}` }}>
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, textAlign: 'center', mb: 1 }}>{job.title}</Typography>
                    <Typography variant="body2" sx={{ textAlign: 'center', mb: 2 }}>{job.company}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <Select
                        value={job.status}
                        onChange={e => handleStatusChange(job, e.target.value)}
                        size="small"
                        sx={{
                          ml: 1,
                          color: selectColor,
                          fontWeight: 700,
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: selectColor },
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: selectColor },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: selectColor }
                        }}
                      >
                        {statusOptions.map(opt => (
                          <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                        ))}
                      </Select>
                    </Box>
                    <Button
                      variant="outlined"
                      color="error"
                      sx={{ mt: 2 }}
                      onClick={() => handleDelete(job)}
                    >
                      Delete
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Container>
  );
};

export default SavedJobs;
