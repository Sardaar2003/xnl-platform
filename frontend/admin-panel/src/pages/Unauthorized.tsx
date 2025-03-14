import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Button, 
  Container, 
  Paper, 
  Divider 
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import HomeIcon from '@mui/icons-material/Home';
import { useAuth } from '../contexts/AuthContext';

/**
 * Unauthorized page displayed when a user tries to access a page they don't have permission for
 */
const Unauthorized: React.FC = () => {
  const { user } = useAuth();

  return (
    <Container maxWidth="md">
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          mt: 8, 
          textAlign: 'center',
          borderRadius: 2
        }}
      >
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            mb: 3
          }}
        >
          <LockIcon 
            color="error" 
            sx={{ 
              fontSize: 80, 
              mb: 2 
            }} 
          />
          <Typography variant="h4" component="h1" gutterBottom>
            Access Denied
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            You don't have permission to access this page.
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" paragraph>
            Your current role: <strong>{user?.role || 'Unknown'}</strong>
          </Typography>
          <Typography variant="body1">
            This page requires a higher permission level. Please contact an administrator
            if you believe you should have access to this resource.
          </Typography>
        </Box>

        <Button 
          component={Link} 
          to="/dashboard" 
          variant="contained" 
          color="primary"
          startIcon={<HomeIcon />}
          size="large"
        >
          Return to Dashboard
        </Button>
      </Paper>
    </Container>
  );
};

export default Unauthorized; 