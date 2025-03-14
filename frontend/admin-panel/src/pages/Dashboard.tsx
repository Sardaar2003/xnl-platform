import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import {
  AccountBalance as AccountIcon,
  Payment as PaymentIcon,
  People as PeopleIcon,
  Notifications as NotificationsIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import axios from 'axios';

// Mock data for initial render
const mockData = {
  totalUsers: 1250,
  totalAccounts: 1876,
  totalTransactions: 15420,
  totalAmount: 1245789.45,
  recentTransactions: [
    { id: '1', amount: 1250.00, type: 'deposit', date: '2023-05-01', status: 'completed' },
    { id: '2', amount: 450.75, type: 'withdrawal', date: '2023-05-02', status: 'completed' },
    { id: '3', amount: 2500.00, type: 'transfer', date: '2023-05-03', status: 'pending' },
    { id: '4', amount: 125.50, type: 'payment', date: '2023-05-04', status: 'completed' },
    { id: '5', amount: 750.25, type: 'deposit', date: '2023-05-05', status: 'completed' },
  ],
  recentUsers: [
    { id: '1', name: 'John Doe', email: 'john@example.com', date: '2023-05-01' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', date: '2023-05-02' },
    { id: '3', name: 'Robert Johnson', email: 'robert@example.com', date: '2023-05-03' },
  ]
};

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(mockData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // In a real app, you would fetch data from your API
        // const response = await axios.get('/api/dashboard');
        // setDashboardData(response.data);
        
        // Using mock data for now
        setTimeout(() => {
          setDashboardData(mockData);
          setLoading(false);
        }, 1000);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch dashboard data');
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 140 }}>
            <Typography variant="h6" color="text.secondary">
              Total Users
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
              <PeopleIcon sx={{ color: 'primary.main', fontSize: 40, mr: 2 }} />
              <Typography variant="h4" component="div">
                {dashboardData.totalUsers.toLocaleString()}
              </Typography>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 140 }}>
            <Typography variant="h6" color="text.secondary">
              Total Accounts
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
              <AccountIcon sx={{ color: 'primary.main', fontSize: 40, mr: 2 }} />
              <Typography variant="h4" component="div">
                {dashboardData.totalAccounts.toLocaleString()}
              </Typography>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 140 }}>
            <Typography variant="h6" color="text.secondary">
              Total Transactions
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
              <PaymentIcon sx={{ color: 'primary.main', fontSize: 40, mr: 2 }} />
              <Typography variant="h4" component="div">
                {dashboardData.totalTransactions.toLocaleString()}
              </Typography>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 140 }}>
            <Typography variant="h6" color="text.secondary">
              Total Amount
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
              <TrendingUpIcon sx={{ color: 'primary.main', fontSize: 40, mr: 2 }} />
              <Typography variant="h4" component="div">
                {formatCurrency(dashboardData.totalAmount)}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Recent Transactions */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Recent Transactions" />
            <Divider />
            <CardContent>
              <List>
                {dashboardData.recentTransactions.map((transaction) => (
                  <React.Fragment key={transaction.id}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Typography variant="body1">
                            {formatCurrency(transaction.amount)} - {transaction.type}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(transaction.date)} - {transaction.status}
                          </Typography>
                        }
                      />
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Recent Users */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Recent Users" />
            <Divider />
            <CardContent>
              <List>
                {dashboardData.recentUsers.map((user) => (
                  <React.Fragment key={user.id}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Typography variant="body1">
                            {user.name}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary">
                            {user.email} - Joined {formatDate(user.date)}
                          </Typography>
                        }
                      />
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 