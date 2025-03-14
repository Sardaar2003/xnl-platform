import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

/**
 * ProtectedRoute component for role-based access control
 * 
 * @param {React.ReactNode} children - The child components to render if authorized
 * @param {string[]} requiredRoles - Array of roles that are allowed to access the route
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRoles = [] 
}) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If no specific roles are required, allow access
  if (requiredRoles.length === 0) {
    return <>{children}</>;
  }

  // Check if user has required role
  const hasRequiredRole = user && user.role && requiredRoles.includes(user.role);

  // If user doesn't have required role, redirect to unauthorized page
  if (!hasRequiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  // User is authenticated and has required role, render children
  return <>{children}</>;
};

export default ProtectedRoute; 