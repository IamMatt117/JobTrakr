import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, IconButton } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/signin');
  };

  return (
    <AppBar position="static" sx={{ mb: 4 }}>
      <Toolbar sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {/* Title centered absolutely */}
        <Typography
          variant="h6"
          component={RouterLink}
          to="/"
          sx={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            textDecoration: 'none',
            color: 'inherit',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            zIndex: 1
          }}
        >
          JobTrakr
        </Typography>
        {/* Right section (nav/user) */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 'auto', zIndex: 2 }}>
          <Button color="inherit" component={RouterLink} to="/">
            Home
          </Button>
          <Button color="inherit" component={RouterLink} to="/saved-jobs">
            Saved Jobs
          </Button>
          {user && (
            <>
              <Typography variant="subtitle1" sx={{ ml: 2, fontWeight: 500 }}>
                Welcome, {user.displayName || 'User'}
              </Typography>
              <IconButton color="inherit" onClick={handleLogout} sx={{ ml: 1 }}>
                <LogoutIcon />
              </IconButton>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar; 